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

  const customTags = useStore((s) => s.customTags);

  const { filteredEvents, tagCounts, label, totalHours, tagOrder } = useMemo(() => {
    const parsed = new Date(selectedDate + 'T00:00:00');
    const date = isNaN(parsed.getTime()) ? new Date() : parsed;
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

    const knownTags = new Set<string>([
      ...(PRESET_TAGS as unknown as string[]),
      ...customTags.map((t) => t.name),
    ]);

    const tagCounts: Record<string, number> = {};
    for (const tag of knownTags) {
      const count = filteredEvents.filter((e) => e.tags.includes(tag)).length;
      if (count > 0) tagCounts[tag] = count;
    }

    const totalHours = filteredEvents.reduce((sum, e) => {
      return sum + (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)) / 60;
    }, 0);
    const tagOrder = [...PRESET_TAGS.filter((t) => t in tagCounts), ...customTags.map((t) => t.name).filter((t) => t in tagCounts).sort()];
    return { filteredEvents, tagCounts, label, totalHours, tagOrder };
  }, [events, selectedDate, currentView, customTags]);

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 px-3 md:px-6 py-2 bg-surface border-b border-border overflow-x-auto">
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider whitespace-nowrap">{label}</span>
      <div className="flex gap-2 md:gap-3 flex-nowrap md:flex-wrap">
        {tagOrder.map((tag) => (
          <div key={tag} className="flex items-center gap-1 md:gap-1.5 whitespace-nowrap">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: TAG_DEFAULT_COLORS[tag] ?? '#94a3b8' }}
            />
            <span className="text-[10px] md:text-xs font-medium" style={{ color: TAG_DEFAULT_COLORS[tag] ?? '#64748b' }}>
              {tag}: <span className="font-semibold">{tagCounts[tag]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="hidden md:block flex-1" />
      <div className="flex items-center gap-2 md:gap-4 whitespace-nowrap">
        <span className="text-[10px] font-semibold text-black uppercase tracking-wider">Total</span>
        <span className="text-[10px] md:text-xs text-muted">
          Content Pieces: <span className="font-semibold text-foreground">{filteredEvents.length}</span>
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="text-[10px] md:text-xs text-muted">
          Stream Hours: <span className="font-semibold text-foreground">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
