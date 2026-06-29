'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validate password match
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    // Validate username
    if (username.length < 3) {
      setValidationError('Username must be at least 3 characters');
      return;
    }

    try {
      await register(username, email, password);
      router.push('/channels/@me');
    } catch (error) {
      // Error handled by store
    }
  };

  const displayError = error || validationError;

  return (
    <div className="flex items-center justify-center min-h-screen bg-discord-darkest">
      <div className="w-full max-w-md p-8 bg-discord-darker rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Create an account
        </h1>

        {displayError && (
          <div className="mb-4 p-3 bg-discord-red/20 border border-discord-red rounded text-discord-red text-sm">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
              className="w-full px-3 py-2 bg-discord-dark text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
              placeholder="Enter your username"
            />
            <p className="mt-1 text-xs text-gray-500">
              Letters, numbers, and underscores only
            </p>
          </div>

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
              minLength={8}
              className="w-full px-3 py-2 bg-discord-dark text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-discord-dark text-white rounded focus:outline-none focus:ring-2 focus:ring-discord-blue"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-discord-blue hover:bg-discord-blue/80 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-400 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-discord-blue hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
