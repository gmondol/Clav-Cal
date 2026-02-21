'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { useStore } from '@/store/useStore';
import { getEventsForDate } from '@/lib/utils';
import DayCell from './DayCell';
import { CalendarEvent } from '@/lib/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarGridProps {
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarGrid({ onDayClick, onEventClick }: CalendarGridProps) {
  const { selectedDate, events } = useStore();
  const currentMonth = new Date(selectedDate + 'T00:00:00');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[11px] font-semibold text-muted text-center py-2 border-b border-border-light uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = getEventsForDate(events, dateStr);
          return (
            <DayCell
              key={dateStr}
              date={day}
              events={dayEvents}
              currentMonth={currentMonth}
              onClick={() => onDayClick(dateStr)}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
