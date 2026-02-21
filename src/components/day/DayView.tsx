'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store/useStore';
import { CalendarEvent } from '@/lib/types';
import {
  getEventsForDate,
  getConflictingEvents,
  formatTimeDisplay,
  generateTimeSlots,
  timeToMinutes,
} from '@/lib/utils';
import EventEditor from './EventEditor';
import TagBadge from '@/components/ui/TagBadge';

interface DayViewProps {
  date: string;
  onClose: () => void;
}

function DayEventBlock({
  event,
  hasConflict,
  onEdit,
}: {
  event: CalendarEvent;
  hasConflict: boolean;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    data: { type: 'event', event },
  });

  const startMin = timeToMinutes(event.startTime);
  const endMin = timeToMinutes(event.endTime);
  const duration = endMin - startMin;
  const topOffset = startMin - 6 * 60;
  const height = Math.max(duration, 20);

  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    top: `${(topOffset / 30) * 40}px`,
    height: `${(height / 30) * 40}px`,
    minHeight: '32px',
    backgroundColor: event.color + '15',
    borderLeft: `3px solid ${event.color}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className={`absolute left-16 right-2 rounded-lg cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md group ${
        hasConflict ? 'ring-2 ring-red-300 ring-offset-1' : ''
      }`}
    >
      <div className="p-2 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: event.color }}>
            {event.title}
          </span>
          {hasConflict && (
            <span className="text-[9px] bg-red-50 text-red-500 px-1 rounded font-medium">
              Conflict
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted">
          {formatTimeDisplay(event.startTime)} – {formatTimeDisplay(event.endTime)}
        </span>
        {duration >= 60 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {event.address && (
              <span className="text-[9px] text-muted">📍 {event.address}</span>
            )}
            {event.contact && (
              <span className="text-[9px] text-muted">👤 {event.contact}</span>
            )}
          </div>
        )}
        {duration >= 45 && (
          <div className="mt-auto flex items-center gap-1 flex-wrap">
            {event.tags.map((t) => <TagBadge key={t} tag={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DayView({ date, onClose }: DayViewProps) {
  const { events, addEvent, updateEvent, deleteEvent } = useStore();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormTime, setNewFormTime] = useState('10:00');

  const dayEvents = useMemo(() => getEventsForDate(events, date), [events, date]);
  const conflicts = useMemo(() => getConflictingEvents(dayEvents), [dayEvents]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const d = parse(date, 'yyyy-MM-dd', new Date());
  const timeSlots = generateTimeSlots(6, 24, 30);

  useEffect(() => {
    if (scrollRef.current) {
      const slotsTo10AM = (10 - 6) * 2;
      scrollRef.current.scrollTop = slotsTo10AM * 40;
    }
  }, []);

  const dateStr = date;
  const { setNodeRef: dayDropRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr },
  });

  const handleQuickAdd = (time: string) => {
    setNewFormTime(time);
    setShowNewForm(true);
    setEditingEvent(null);
  };

  const handleSave = (data: Omit<CalendarEvent, 'id'>) => {
    if (editingEvent) {
      updateEvent(editingEvent.id, data);
    } else {
      addEvent(data);
    }
    setEditingEvent(null);
    setShowNewForm(false);
  };

  const handleDelete = () => {
    if (editingEvent) {
      deleteEvent(editingEvent.id);
      setEditingEvent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{format(d, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-xs text-muted">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowNewForm(true); setEditingEvent(null); }}
              className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Quick Add
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div
            ref={(node) => {
              dayDropRef(node);
              (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            className={`flex-1 overflow-y-auto relative ${isOver ? 'bg-blue-50/30' : ''}`}
          >
            <SortableContext items={dayEvents.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="relative" style={{ height: `${timeSlots.length * 40}px` }}>
                {timeSlots.map((time, i) => (
                  <div
                    key={time}
                    className="absolute w-full flex items-start group cursor-pointer hover:bg-blue-50/30 transition-colors"
                    style={{ top: `${i * 40}px`, height: '40px' }}
                    onClick={() => handleQuickAdd(time)}
                  >
                    <span className="w-16 text-[10px] text-muted text-right pr-3 pt-0.5 flex-shrink-0">
                      {formatTimeDisplay(time)}
                    </span>
                    <div className="flex-1 border-t border-border-light h-full relative">
                      <span className="absolute right-2 top-1 text-[9px] text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                        + Add
                      </span>
                    </div>
                  </div>
                ))}

                {dayEvents.map((event) => (
                  <DayEventBlock
                    key={event.id}
                    event={event}
                    hasConflict={conflicts.has(event.id)}
                    onEdit={() => { setEditingEvent(event); setShowNewForm(false); }}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {(showNewForm || editingEvent) && (
            <div className="w-72 border-l border-border p-3 overflow-y-auto">
              <EventEditor
                key={editingEvent ? editingEvent.id : 'new'}
                event={editingEvent ?? undefined}
                date={date}
                defaultStartTime={newFormTime}
                onSave={handleSave}
                onDelete={editingEvent ? handleDelete : undefined}
                onCancel={() => { setShowNewForm(false); setEditingEvent(null); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
