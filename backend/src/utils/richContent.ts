import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export class LinkPreviewUtil {
  // Extract URLs from message content
  static extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = content.match(urlRegex);
    return matches || [];
  }

  // Fetch Open Graph metadata from URL
  static async fetchPreview(url: string): Promise<LinkPreview | null> {
    try {
      // Timeout after 5 seconds
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DiscordClone/1.0; +https://discordclone.com)'
        },
        maxRedirects: 5
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract Open Graph tags
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogDescription = $('meta[property="og:description"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');

      // Fallback to regular meta tags
      const title = ogTitle || $('title').text() || undefined;
      const description = ogDescription || $('meta[name="description"]').attr('content') || undefined;
      const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');

      // Make favicon absolute URL
      let faviconUrl: string | undefined;
      if (favicon) {
        faviconUrl = favicon.startsWith('http') ? favicon : new URL(favicon, url).toString();
      }

      // Make image absolute URL
      let imageUrl: string | undefined;
      if (ogImage) {
        imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).toString();
      }

      return {
        url,
        title: title?.substring(0, 200),
        description: description?.substring(0, 500),
        image: imageUrl,
        siteName: ogSiteName,
        favicon: faviconUrl
      };
    } catch (error) {
      console.error('Link preview error:', error);
      return null;
    }
  }

  // Check if URL should be previewed
  static shouldPreview(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Skip certain domains
      const skipDomains = ['tenor.com', 'giphy.com', 'imgur.com'];
      if (skipDomains.some(domain => parsed.hostname.includes(domain))) {
        return false;
      }

      // Only HTTP(S)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export interface MentionMatch {
  username: string;
  start: number;
  end: number;
}

export class MentionUtil {
  // Parse mentions from message content
  static parseMentions(content: string): MentionMatch[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: MentionMatch[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({
        username: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return mentions;
  }

  // Replace mentions with user IDs for storage
  static async resolveMentions(content: string, userMap: Map<string, number>): Promise<{
    content: string;
    mentionedUserIds: number[];
  }> {
    const mentions = this.parseMentions(content);
    let newContent = content;
    const mentionedUserIds: number[] = [];

    // Replace in reverse order to maintain indices
    for (let i = mentions.length - 1; i >= 0; i--) {
      const mention = mentions[i];
      const userId = userMap.get(mention.username.toLowerCase());
      
      if (userId) {
        mentionedUserIds.push(userId);
        // Replace @username with <@userId>
        newContent = 
          newContent.substring(0, mention.start) +
          `<@${userId}>` +
          newContent.substring(mention.end);
      }
    }

    return {
      content: newContent,
      mentionedUserIds: Array.from(new Set(mentionedUserIds))
    };
  }

  // Parse stored mentions for display
  static parseStoredMentions(content: string): { userId: number; start: number; end: number }[] {
    const mentionRegex = /<@(\d+)>/g;
    const mentions: { userId: number; start: number; end: number }[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({
        userId: parseInt(match[1]),
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return mentions;
  }

  // Format mentions for display (replace <@userId> with @username)
  static formatMentions(content: string, userMap: Map<number, string>): string {
    const mentions = this.parseStoredMentions(content);
    let formatted = content;

    // Replace in reverse order
    for (let i = mentions.length - 1; i >= 0; i--) {
      const mention = mentions[i];
      const username = userMap.get(mention.userId);
      
      if (username) {
        formatted = 
          formatted.substring(0, mention.start) +
          `@${username}` +
          formatted.substring(mention.end);
      }
    }

    return formatted;
  }
}

export interface CodeBlock {
  language: string;
  code: string;
  start: number;
  end: number;
}

export class CodeBlockUtil {
  // Parse code blocks from message content
  static parseCodeBlocks(content: string): CodeBlock[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return blocks;
  }

  // Check if language is supported
  static isSupportedLanguage(language: string): boolean {
    const supported = [
      'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'json', 'xml', 'yaml', 'markdown',
      'sql', 'bash', 'shell', 'powershell', 'dockerfile',
      'plaintext', 'text'
    ];

    return supported.includes(language.toLowerCase());
  }
}
