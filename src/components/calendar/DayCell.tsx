'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, isToday, isSameMonth } from 'date-fns';
import { CalendarEvent } from '@/lib/types';
import { getConflictingEvents } from '@/lib/utils';
import EventChip from './EventChip';

interface DayCellProps {
  date: Date;
  events: CalendarEvent[];
  currentMonth: Date;
  onClick: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function DayCell({ date, events, currentMonth, onClick, onEventClick }: DayCellProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr },
  });

  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const conflicts = getConflictingEvents(events);

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`min-h-[120px] border border-border-light p-1 cursor-pointer transition-all duration-150 hover:bg-blue-50/40 ${
        isOver ? 'day-cell-drop-active' : ''
      } ${inMonth ? 'bg-surface' : 'bg-zinc-50/60'}`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? 'bg-primary text-white'
              : inMonth
                ? 'text-foreground'
                : 'text-zinc-300'
          }`}
        >
          {format(date, 'd')}
        </span>
        {events.length > 0 && (
          <span className="text-[9px] text-muted">{events.length}</span>
        )}
      </div>
      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5">
          {events.slice(0, 4).map((event) => (
            <EventChip
              key={event.id}
              event={event}
              compact
              scaled
              hasConflict={conflicts.has(event.id)}
              onClick={() => onEventClick(event)}
            />
          ))}
          {events.length > 4 && (
            <span className="text-[10px] text-muted pl-1">+{events.length - 4} more</span>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
