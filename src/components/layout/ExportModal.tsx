'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const exportWeeklySummary = useStore((s) => s.exportWeeklySummary);
  const summary = exportWeeklySummary();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Weekly Plan Export</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <pre className="bg-zinc-50 rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-mono border border-border-light max-h-80 overflow-y-auto">
          {summary}
        </pre>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
