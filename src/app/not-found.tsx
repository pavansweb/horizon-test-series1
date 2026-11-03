import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">The page or mock test you are looking for could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-lg transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
