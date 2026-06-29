'use client';

import { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface RichMessageContentProps {
  content: string;
  mentions?: { id: number; username: string }[];
}

interface ParsedContent {
  type: 'text' | 'mention' | 'code' | 'codeblock' | 'url';
  content: string;
  language?: string;
  userId?: number;
  username?: string;
}

export default function RichMessageContent({ content, mentions = [] }: RichMessageContentProps) {
  const [parsed, setParsed] = useState<ParsedContent[]>([]);

  useEffect(() => {
    const parseContent = () => {
      const parts: ParsedContent[] = [];
      let remaining = content;

      // Parse code blocks first (```language\ncode```)
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      const segments: { start: number; end: number; type: string; content: string; language?: string }[] = [];

      // Find all code blocks
      while ((match = codeBlockRegex.exec(content)) !== null) {
        segments.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'codeblock',
          content: match[2],
          language: match[1] || 'plaintext'
        });
      }

      // Find all inline code (`code`)
      const inlineCodeRegex = /`([^`]+)`/g;
      let inlineMatch: RegExpExecArray | null;
      while ((inlineMatch = inlineCodeRegex.exec(content)) !== null) {
        // Skip if inside a code block
        const insideBlock = segments.some(s => inlineMatch!.index >= s.start && inlineMatch!.index < s.end);
        if (!insideBlock) {
          segments.push({
            start: inlineMatch.index,
            end: inlineMatch.index + inlineMatch[0].length,
            type: 'code',
            content: inlineMatch[1]
          });
        }
      }

      // Find all mentions (<@userId>)
      const mentionRegex = /<@(\d+)>/g;
      let mentionMatch: RegExpExecArray | null;
      while ((mentionMatch = mentionRegex.exec(content)) !== null) {
        const insideBlock = segments.some(s => mentionMatch!.index >= s.start && mentionMatch!.index < s.end);
        if (!insideBlock) {
          const userId = parseInt(mentionMatch[1]);
          const user = mentions.find(m => m.id === userId);
          segments.push({
            start: mentionMatch.index,
            end: mentionMatch.index + mentionMatch[0].length,
            type: 'mention',
            content: user ? `@${user.username}` : `@User${userId}`
          });
        }
      }

      // Find all URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let urlMatch: RegExpExecArray | null;
      while ((urlMatch = urlRegex.exec(content)) !== null) {
        const insideBlock = segments.some(s => urlMatch!.index >= s.start && urlMatch!.index < s.end);
        if (!insideBlock) {
          segments.push({
            start: urlMatch.index,
            end: urlMatch.index + urlMatch[0].length,
            type: 'url',
            content: urlMatch[1]
          });
        }
      }

      // Sort segments by position
      segments.sort((a, b) => a.start - b.start);

      // Build final parts
      let pos = 0;
      for (const segment of segments) {
        // Add text before segment
        if (pos < segment.start) {
          const text = content.substring(pos, segment.start);
          if (text) {
            parts.push({ type: 'text', content: text });
          }
        }

        // Add segment
        if (segment.type === 'codeblock') {
          parts.push({
            type: 'codeblock',
            content: segment.content,
            language: segment.language
          });
        } else if (segment.type === 'code') {
          parts.push({ type: 'code', content: segment.content });
        } else if (segment.type === 'mention') {
          parts.push({ type: 'mention', content: segment.content });
        } else if (segment.type === 'url') {
          parts.push({ type: 'url', content: segment.content });
        }

        pos = segment.end;
      }

      // Add remaining text
      if (pos < content.length) {
        const text = content.substring(pos);
        if (text) {
          parts.push({ type: 'text', content: text });
        }
      }

      setParsed(parts);
    };

    parseContent();
  }, [content, mentions]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="rich-message-content">
      {parsed.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className="inline-block px-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 cursor-pointer"
            >
              {part.content}
            </span>
          );
        }

        if (part.type === 'code') {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-200 font-mono text-sm"
            >
              {part.content}
            </code>
          );
        }

        if (part.type === 'codeblock') {
          const highlighted = part.language && part.language !== 'plaintext'
            ? hljs.highlight(part.content, { language: part.language }).value
            : part.content;

          return (
            <div key={index} className="my-2 rounded-md overflow-hidden bg-gray-900">
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">{part.language || 'plaintext'}</span>
                <button
                  onClick={() => copyCode(part.content)}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700"
                >
                  Copy
                </button>
              </div>
              <pre className="p-3 overflow-x-auto">
                <code
                  className={`text-sm font-mono language-${part.language || 'plaintext'}`}
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </pre>
            </div>
          );
        }

        if (part.type === 'url') {
          return (
            <a
              key={index}
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {part.content}
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}
