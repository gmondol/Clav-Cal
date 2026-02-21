'use client';

import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useStore } from '@/store/useStore';
import { PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import { timeToMinutes } from '@/lib/utils';

export default function WeeklyGoals() {
  const events = useStore((s) => s.events);
  const selectedDate = useStore((s) => s.selectedDate);
  const currentView = useStore((s) => s.currentView);

  const { filteredEvents, tagCounts, label, totalHours } = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00');
    let rangeStart: string;
    let rangeEnd: string;
    let label: string;

    if (currentView === 'month') {
      rangeStart = format(startOfMonth(date), 'yyyy-MM-dd');
      rangeEnd = format(endOfMonth(date), 'yyyy-MM-dd');
      label = 'This Month';
    } else {
      rangeStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      rangeEnd = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      label = 'This Week';
    }

    const filteredEvents = events.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);
    const tagCounts: Record<string, number> = {};
    for (const tag of PRESET_TAGS) {
      tagCounts[tag] = filteredEvents.filter((e) => e.tags.includes(tag)).length;
    }
    const totalHours = filteredEvents.reduce((sum, e) => {
      return sum + (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)) / 60;
    }, 0);
    return { filteredEvents, tagCounts, label, totalHours };
  }, [events, selectedDate, currentView]);

  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-surface border-b border-border">
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
      <div className="flex gap-3">
        {PRESET_TAGS.map((tag) => (
          <div key={tag} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TAG_DEFAULT_COLORS[tag] ?? '#94a3b8' }}
            />
            <span className="text-xs text-muted">
              {tag}: <span className="font-semibold text-foreground">{tagCounts[tag]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-semibold text-black uppercase tracking-wider">Total</span>
        <span className="text-xs text-muted">
          Content Pieces: <span className="font-semibold text-foreground">{filteredEvents.length}</span>
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="text-xs text-muted">
          Stream Hours: <span className="font-semibold text-foreground">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
