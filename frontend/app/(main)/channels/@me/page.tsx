'use client';

import { useAuthStore } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function DirectMessagesPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      {/* Channel/DM sidebar */}
      <div className="w-60 bg-discord-darker flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-discord-darkest shadow-sm">
          <input
            type="text"
            placeholder="Find or start a conversation"
            className="w-full px-2 py-1 bg-discord-darkest text-sm text-white rounded focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <button className="w-full px-2 py-2 text-left text-white hover:bg-discord-gray/30 rounded flex items-center space-x-3">
              <div className="w-8 h-8 bg-discord-blue rounded-full flex items-center justify-center text-sm font-semibold">
                {user?.username[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">Friends</span>
            </button>
          </div>

          <div className="px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase px-2">
              Direct Messages
            </h3>
            <div className="mt-1 text-sm text-gray-500 px-2 py-4">
              No conversations yet
            </div>
          </div>
        </div>

        {/* User panel */}
        <div className="h-14 bg-discord-dark px-2 flex items-center">
          <div className="flex-1 flex items-center space-x-2">
            <div className="w-8 h-8 bg-discord-blue rounded-full flex items-center justify-center text-sm font-semibold">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {user?.username}
              </div>
              <div className="text-xs text-gray-400">
                Online
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-discord-darkest shadow-sm">
          <h2 className="text-white font-semibold">Friends</h2>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Welcome to Discord Clone!
            </h3>
            <p className="text-gray-400 mb-6">
              Your account has been created successfully.
            </p>
            <div className="space-y-2 text-gray-300">
              <p>✅ Phase 1 Complete: Authentication System</p>
              <p className="text-sm text-gray-500">
                Logged in as <span className="text-discord-blue">{user?.username}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
