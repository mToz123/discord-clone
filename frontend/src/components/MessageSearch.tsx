'use client';

import { useState } from 'react';
import { Search, X, User, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    avatar_url?: string;
  };
  channel?: {
    id: number;
    name: string;
  };
}

interface MessageSearchProps {
  serverId?: string;
  channelId?: string;
  onClose: () => void;
  onSelectMessage?: (messageId: string) => void;
}

export default function MessageSearch({ serverId, channelId, onClose, onSelectMessage }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    before: '',
    after: '',
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const params: any = { q: query };
      if (filters.userId) params.user = filters.userId;
      if (filters.before) params.before = new Date(filters.before).toISOString();
      if (filters.after) params.after = new Date(filters.after).toISOString();

      let response;
      if (channelId) {
        response = await api.get(`/channels/${channelId}/search`, { params });
      } else if (serverId) {
        response = await api.get(`/servers/${serverId}/search`, { params });
      }

      setResults(response?.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Search Messages</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-3 flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-gray-400" />
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="User ID"
                className="px-2 py-1 bg-gray-700 text-white rounded w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={filters.after}
                onChange={(e) => setFilters({ ...filters, after: e.target.value })}
                placeholder="After"
                className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filters.before}
                onChange={(e) => setFilters({ ...filters, before: e.target.value })}
                placeholder="Before"
                className="px-2 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="text-center text-gray-400 py-8">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center text-gray-400 py-8">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length === 0 && !query && (
            <div className="text-center text-gray-400 py-8">
              Enter a search query to find messages
            </div>
          )}

          {!loading && results.map((result) => (
            <div
              key={result.id}
              onClick={() => onSelectMessage?.(result.id)}
              className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {result.user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-semibold text-white">{result.user.username}</span>
                    {result.channel && (
                      <>
                        <span className="text-gray-400">in</span>
                        <span className="text-gray-300">#{result.channel.name}</span>
                      </>
                    )}
                    <span className="text-gray-400 text-xs">
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1 break-words">{result.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 border-t border-gray-700 text-sm text-gray-400 text-center">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
