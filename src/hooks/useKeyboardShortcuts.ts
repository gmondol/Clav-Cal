'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/store/useStore';

export function useKeyboardShortcuts(callbacks: {
  onNewNote?: () => void;
  onSearch?: () => void;
}) {
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          callbacks.onNewNote?.();
          break;
        case '/':
          e.preventDefault();
          callbacks.onSearch?.();
          break;
        case 'd':
          e.preventDefault();
          setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callbacks, setSelectedDate]);
}
