'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'clav-cal-auth';
const SESSION_DAYS = 7;
const PASS_HASH = '626f726e746f6d6f67';

function toHex(s: string) {
  return Array.from(s).map((c) => c.charCodeAt(0).toString(16)).join('');
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { exp } = JSON.parse(stored);
        if (exp && Date.now() < exp) {
          setAuthed(true);
          return;
        }
      }
    } catch {}
    setAuthed(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (toHex(input.trim()) === PASS_HASH) {
      const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ exp }));
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-5"
        >
          <img src="/Favicon.png" alt="Clav Cal" className="w-20 h-20 object-contain" />
          <h1 className="text-lg font-bold text-zinc-800 tracking-tight">Welcome to Clav-Cal</h1>
          <p className="text-xs text-zinc-500 -mt-3">Enter password to continue</p>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className={`w-full text-sm border rounded-lg px-4 py-2.5 outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-zinc-300 focus:border-blue-400'
            }`}
          />
          {error && <p className="text-xs text-red-500 -mt-3">Incorrect password</p>}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
