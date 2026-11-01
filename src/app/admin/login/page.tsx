'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LockIcon } from '@/components/icons/Icons';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid administrator password');
        return;
      }

      // Store token in sessionStorage for API headers as well
      if (data.token) {
        sessionStorage.setItem('admin_token', data.token);
      }

      router.push('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
          JEE
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-gray-900">
          Admin Portal Login
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500">
          Manage JEE Main test papers, PDFs, and answer keys
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wide"
              >
                Admin Master Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Default password: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">jee2026admin</code> (configurable via <code className="font-mono">ADMIN_PASSWORD</code> env var)
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-bold text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:bg-gray-400 transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Link
              href="/"
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              ← Back to Student Mock Test Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
