'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServerStore } from '@/lib/server';
import { useAuthStore } from '@/lib/auth';

export function ServerSidebar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { servers, fetchServers, createServer } = useServerStore();

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleCreateServer = async () => {
    const name = prompt('Enter server name:');
    if (!name) return;

    try {
      const server = await createServer(name);
      router.push(`/channels/${server.id}`);
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  return (
    <div className="w-[72px] bg-discord-dark flex flex-col items-center py-3 space-y-2">
      {/* Home / DM button */}
      <button
        onClick={() => router.push('/channels/@me')}
        className="w-12 h-12 bg-discord-blue rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:bg-discord-blue/80 transition-colors hover:rounded-2xl"
        title="Direct Messages"
      >
        {user?.username[0].toUpperCase()}
      </button>

      <div className="w-8 h-0.5 bg-discord-gray rounded"></div>

      {/* Server list */}
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => router.push(`/channels/${server.id}`)}
          className="w-12 h-12 bg-discord-gray rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:bg-discord-blue hover:rounded-2xl transition-all"
          title={server.name}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt={server.name} className="w-12 h-12 rounded-full" />
          ) : (
            server.name[0].toUpperCase()
          )}
        </button>
      ))}

      {/* Add server button */}
      <button
        onClick={handleCreateServer}
        className="w-12 h-12 bg-discord-gray rounded-full flex items-center justify-center text-discord-green text-2xl font-bold cursor-pointer hover:bg-discord-green hover:text-white hover:rounded-2xl transition-all"
        title="Add a Server"
      >
        +
      </button>
    </div>
  );
}
