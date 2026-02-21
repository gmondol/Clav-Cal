'use client';

import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '@/store/useStore';
import { CalendarView } from '@/lib/types';

export default function CalendarNav() {
  const { currentView, selectedDate, setCurrentView, setSelectedDate } = useStore();

  const date = new Date(selectedDate + 'T00:00:00');
  const isMonth = currentView === 'month';

  const navigate = (dir: -1 | 1) => {
    const fn = isMonth
      ? dir === 1 ? addMonths : subMonths
      : dir === 1 ? addWeeks : subWeeks;
    setSelectedDate(format(fn(date, 1), 'yyyy-MM-dd'));
  };

  const getTitle = () => {
    if (isMonth) return format(date, 'MMMM yyyy');
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(ws, 'MMM d')}–${format(we, 'd')}`;
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-2 mb-2">
      <div
        className="flex items-center gap-1 bg-zinc-100 rounded-xl px-1 py-0.5"
        style={{
          boxShadow: '4px 4px 8px rgba(0,0,0,0.08), -4px -4px 8px rgba(255,255,255,0.9), inset 0 0 0 rgba(0,0,0,0)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg transition-all text-blue-500 hover:text-blue-600 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]"
          style={{
            boxShadow: '2px 2px 5px rgba(0,0,0,0.07), -2px -2px 5px rgba(255,255,255,0.8)',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-foreground px-2">{getTitle()}</h2>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-lg transition-all text-blue-500 hover:text-blue-600 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]"
          style={{
            boxShadow: '2px 2px 5px rgba(0,0,0,0.07), -2px -2px 5px rgba(255,255,255,0.8)',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="relative flex bg-zinc-100 rounded-lg p-0.5">
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md bg-blue-500 shadow-sm transition-transform duration-300 ease-in-out"
          style={{
            width: 'calc(50% - 2px)',
            left: '2px',
            transform: currentView === 'week' ? 'translateX(calc(100% + 2px))' : 'translateX(0)',
          }}
        />
        {(['month', 'week'] as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => setCurrentView(v)}
            className={`relative z-10 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-300 ${
              currentView === v
                ? 'text-white'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
