'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      router.push('/channels/@me');
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-discord-darkest">
      <div className="w-full max-w-md p-8 bg-discord-darker rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Welcome back!
        </h1>
        <p className="text-gray-400 text-center mb-6">
          We're so excited to see you again!
        </p>

        {error && (
          <div className="mb-4 p-3 bg-discord-red/20 border border-discord-red rounded text-discord-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-discord-dark text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-discord-dark text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-discord-blue hover:bg-discord-blue/80 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-400 text-center">
          Need an account?{' '}
          <Link href="/register" className="text-discord-blue hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
