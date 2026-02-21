'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '@/store/useStore';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Clav StreamSchedule', accent: 'Clav', rest: 'StreamSchedule' },
  { href: '/content', label: 'Content Workshop', accent: 'Content', rest: 'Workshop' },
] as const;

interface HeaderProps {
  onExport: () => void;
  onHelp?: () => void;
}

export default function Header({ onExport, onHelp }: HeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const { currentView, selectedDate, setCurrentView, setSelectedDate } = useStore();

  const date = new Date(selectedDate + 'T00:00:00');
  const isMonth = currentView === 'month';

  const navigate = (dir: -1 | 1) => {
    const fn = isMonth
      ? dir === 1 ? addMonths : subMonths
      : dir === 1 ? addWeeks : subWeeks;
    setSelectedDate(format(fn(date, 1), 'yyyy-MM-dd'));
  };

  const goToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  const getTitle = () => {
    if (isMonth) return format(date, 'MMMM yyyy');
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(ws, 'MMM d')}–${format(we, 'd')}`;
  };

  return (
    <header className="relative flex items-center justify-between px-6 py-3 bg-surface border-b border-border">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="overflow-hidden flex items-center justify-center flex-shrink-0" style={{ width: '116px', height: '61px' }}>
          <img src="/Favicon.png" alt="Clav Cal" className="h-auto scale-125 translate-y-1" style={{ width: '162px' }} />
        </div>
      </div>

      <div ref={navRef} className="absolute left-1/2 -translate-x-1/2">
        <button
          onClick={() => setNavOpen((o) => !o)}
          className="flex items-center gap-1 text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
        >
          <span className="text-blue-500">Clav</span> StreamSchedule
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-0.5 transition-transform ${navOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {navOpen && (() => {
          const otherPages = NAV_ITEMS.filter((item) => item.href !== pathname);
          if (otherPages.length === 0) return null;
          return (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[180px] z-50">
              {otherPages.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  className="block px-4 py-2 text-xl font-bold tracking-tight whitespace-nowrap hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-blue-500">{item.accent}</span> {item.rest}
                </a>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          className="p-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
          title="Download PDF"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
        {onHelp && (
          <button
            onClick={onHelp}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
            title="Help & shortcuts"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
