'use client';

import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '@/store/useStore';
import { CalendarView } from '@/lib/types';

interface HeaderProps {
  onExport: () => void;
  onHelp?: () => void;
}

export default function Header({ onExport, onHelp }: HeaderProps) {
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

      <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-black">
        <span className="text-blue-500">Clav</span> StreamSchedule
      </h1>

      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          className="p-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors text-muted hover:text-foreground"
          title="Export weekly summary"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
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
