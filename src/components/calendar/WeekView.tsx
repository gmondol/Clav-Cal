'use client';

import { useRef, useEffect } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
} from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store/useStore';
import {
  getEventsForDate,
  getConflictingEvents,
  formatTimeDisplay,
  generateTimeSlots,
  timeToMinutes,
} from '@/lib/utils';
import { CalendarEvent, TAG_DEFAULT_COLORS } from '@/lib/types';
import TagBadge from '@/components/ui/TagBadge';

const SLOT_HEIGHT = 40;
const START_HOUR = 6;
const END_HOUR = 24;
const TIME_SLOTS = generateTimeSlots(START_HOUR, END_HOUR, 30);

interface WeekViewProps {
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function WeekEventBlock({
  event,
  hasConflict,
  onClick,
}: {
  event: CalendarEvent;
  hasConflict: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    data: { type: 'event', event },
  });

  const startMin = timeToMinutes(event.startTime);
  const endMin = timeToMinutes(event.endTime);
  const duration = endMin - startMin;
  const topOffset = startMin - START_HOUR * 60;
  const height = Math.max(duration, 20);

  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    top: `${(topOffset / 30) * SLOT_HEIGHT}px`,
    height: `${(height / 30) * SLOT_HEIGHT}px`,
    minHeight: '24px',
    backgroundColor: event.color + '18',
    borderLeft: `3px solid ${event.color}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute left-0.5 right-0.5 rounded-md cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md overflow-hidden z-10 ${
        hasConflict ? 'ring-2 ring-red-300 ring-offset-1' : ''
      }`}
    >
      <div className="px-1.5 py-1 h-full flex flex-col">
        <span
          className="text-[20px] font-semibold leading-tight truncate"
          style={{ color: event.color }}
        >
          {event.title}
        </span>
        {duration >= 45 && (
          <span className="text-[9px] text-muted leading-tight">
            {formatTimeDisplay(event.startTime)}
          </span>
        )}
        {duration >= 90 && event.tags.length > 0 && (
          <div className="mt-auto flex gap-0.5 flex-wrap">
            {event.tags.slice(0, 2).map((t) => (
              <TagBadge key={t} tag={t} color={TAG_DEFAULT_COLORS[t]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  events,
  onDayClick,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onDayClick: () => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr },
  });
  const today = isToday(date);
  const conflicts = getConflictingEvents(events);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 border-r border-border-light last:border-r-0 relative transition-colors ${
        isOver ? 'day-cell-drop-active' : ''
      }`}
    >
      <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        {TIME_SLOTS.map((_, i) => (
          <div
            key={i}
            className="border-b border-border-light/50 hover:bg-blue-50/20 cursor-pointer transition-colors"
            style={{ height: `${SLOT_HEIGHT}px` }}
            onClick={onDayClick}
          />
        ))}
        {events.map((event) => (
          <WeekEventBlock
            key={event.id}
            event={event}
            hasConflict={conflicts.has(event.id)}
            onClick={() => onEventClick(event)}
          />
        ))}
      </SortableContext>
    </div>
  );
}

export default function WeekView({ onDayClick, onEventClick }: WeekViewProps) {
  const { selectedDate, events } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const current = new Date(selectedDate + 'T00:00:00');
  const ws = startOfWeek(current, { weekStartsOn: 1 });
  const we = endOfWeek(current, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: ws, end: we });

  useEffect(() => {
    if (scrollRef.current) {
      const slotsTo10AM = (10 - START_HOUR) * 2;
      scrollRef.current.scrollTop = slotsTo10AM * SLOT_HEIGHT;
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-border sticky top-0 z-20 bg-surface">
        <div className="w-14 flex-shrink-0" />
        {days.map((day) => {
          const today = isToday(day);
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`flex-1 min-w-0 p-2 text-center cursor-pointer border-r border-border-light last:border-r-0 transition-colors hover:bg-blue-50/40 ${
                today ? 'bg-primary-light' : ''
              }`}
            >
              <div className="text-[10px] font-semibold text-muted uppercase">
                {format(day, 'EEE')}
              </div>
              <div
                className={`text-lg font-bold ${
                  today ? 'text-primary' : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        {/* Time labels */}
        <div className="w-14 flex-shrink-0">
          {TIME_SLOTS.map((time, i) => (
            <div
              key={time}
              className="border-b border-border-light/50 flex items-start justify-end pr-2 pt-0.5"
              style={{ height: `${SLOT_HEIGHT}px` }}
            >
              {i % 2 === 0 && (
                <span className="text-[10px] text-muted leading-none">
                  {formatTimeDisplay(time)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = getEventsForDate(events, dateStr);
          return (
            <DayColumn
              key={dateStr}
              date={day}
              events={dayEvents}
              onDayClick={() => onDayClick(dateStr)}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
