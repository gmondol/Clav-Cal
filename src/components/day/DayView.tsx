'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store/useStore';
import { CalendarEvent, TAG_DEFAULT_COLORS, NOTE_STATUSES } from '@/lib/types';
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

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${Math.round(r + (255 - r) * (1 - alpha))}, ${Math.round(g + (255 - g) * (1 - alpha))}, ${Math.round(b + (255 - b) * (1 - alpha))}, 1)`;
  };

  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    top: `${(topOffset / 30) * 40}px`,
    height: `${(height / 30) * 40}px`,
    minHeight: '32px',
    backgroundColor: event.confirmed ? hexToRgba(event.color || '#000000', 0.08) : '#f4f4f5',
    border: `1px solid ${event.color}`,
    borderLeftWidth: event.confirmed ? 6 : 3,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className={`absolute left-0 right-0 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md group ${
        hasConflict ? 'ring-2 ring-red-300 ring-offset-1' : ''
      }`}
    >
      <div className="h-full flex">
        <div className="w-16 flex flex-col flex-shrink-0 border-r border-border-light">
          {(() => {
            const slots: string[] = [];
            for (let m = startMin; m < endMin; m += 30) {
              const h = Math.floor(m / 60);
              const mm = m % 60;
              slots.push(`${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`);
            }
            return slots.map((t, i) => (
              <div
                key={t}
                className={`flex-1 flex items-start justify-end pr-3 pt-0.5 text-[10px] text-muted ${i > 0 ? 'border-t border-border-light' : ''}`}
              >
                {formatTimeDisplay(t)}
              </div>
            ));
          })()}
        </div>
        <div className="flex-[3] p-2 flex flex-col justify-start min-w-0 border-r border-border-light">
          <span className="text-lg font-bold truncate" style={{ color: event.color }}>
            {event.title}
          </span>
          <span className="text-[11px] mt-0.5" style={{ color: event.color }}>
            {formatTimeDisplay(event.startTime)}–{formatTimeDisplay(event.endTime)}
          </span>
          {hasConflict && (
            <span className="text-[9px] bg-red-50 text-red-500 px-1 rounded font-medium w-fit mt-0.5">
              Conflict
            </span>
          )}
        </div>
        <div className="flex-[3] p-2 flex flex-col justify-start min-w-0 border-r border-border-light">
          {event.address && (
            <span className="text-xs text-foreground line-clamp-2">📍 {event.address}</span>
          )}
          {event.contact && (
            <span className="text-xs text-muted line-clamp-2 mt-4">👤 {event.contact}</span>
          )}
        </div>
        <div className="flex-[2] p-2 flex flex-col justify-start min-w-0">
          {event.description && (
            <span className="text-xs text-foreground line-clamp-4">{event.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DayView({ date, onClose }: DayViewProps) {
  const { events, notes, addEvent, updateEvent, deleteEvent, updateNote } = useStore();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormTime, setNewFormTime] = useState('10:00');
  const [ideaSearch, setIdeaSearch] = useState('');
  const [cityState, setCityState] = useState('');
  const [editingCityState, setEditingCityState] = useState(false);

  const dayEvents = useMemo(() => getEventsForDate(events, date), [events, date]);
  const conflicts = useMemo(() => getConflictingEvents(dayEvents), [dayEvents]);

  const activeNotes = useMemo(
    () => notes.filter((n) => !n.archived && (n.status === 'ready' || n.status === 'workshop')),
    [notes]
  );

  const filteredNotes = useMemo(
    () => ideaSearch
      ? activeNotes.filter((n) => n.title.toLowerCase().includes(ideaSearch.toLowerCase()) || n.tags.some((t) => t.toLowerCase().includes(ideaSearch.toLowerCase())))
      : activeNotes,
    [activeNotes, ideaSearch]
  );

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

  const scheduleNote = (note: typeof activeNotes[0]) => {
    addEvent({
      date,
      startTime: '10:00',
      endTime: '11:00',
      title: note.title,
      color: note.color || '#000000',
      address: note.address,
      contact: note.contact,
      contactName: note.contactName,
      contactPhone: note.contactPhone,
      contactEmail: note.contactEmail,
      contactNotes: note.contactNotes,
      description: note.description,
      tags: note.tags,
      confirmed: false,
      attachments: note.attachments ?? [],
      fromNoteId: note.id,
    });
    updateNote(note.id, { status: 'used' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center justify-center p-4 border-b border-border">
          <div className="absolute left-4">
            {editingCityState ? (
              <input
                autoFocus
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                onBlur={() => setEditingCityState(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingCityState(false); }}
                placeholder="City, State"
                className="text-xs bg-white border border-blue-400 rounded px-2 py-1 outline-none w-40"
              />
            ) : (
              <button
                onClick={() => setEditingCityState(true)}
                className="text-xs text-blue-500 font-medium border border-dashed border-blue-400 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
              >
                {cityState || '+ City/State'}
              </button>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">{format(d, 'EEEE, MMMM d')}</h2>
            <p className="text-xs text-muted">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled</p>
          </div>
          <div className="absolute right-4 flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-border-light bg-zinc-50/50 flex-shrink-0">
              <div className="w-16 px-2 py-2 text-[10px] font-bold text-foreground uppercase tracking-wider flex-shrink-0">Time</div>
              <div className="flex-[3] px-3 py-2 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">Activity</div>
              <div className="flex-[3] px-3 py-2 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">Address</div>
              <div className="flex-[2] px-3 py-2 text-[10px] font-bold text-foreground uppercase tracking-wider text-center">Description</div>
            </div>
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
                      <div className="w-20 text-[10px] text-muted text-right pr-3 flex-shrink-0 h-full flex items-center justify-end border-r border-border-light border-b border-b-border-light">
                        <span className="pr-1">{formatTimeDisplay(time)}</span>
                      </div>
                      <div className="flex-1 h-full" />
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
          </div>

          {/* Event Editor */}
          {(showNewForm || editingEvent) && (
            <div className="w-72 border-l border-border p-3 overflow-y-auto">
              <EventEditor
                key={editingEvent ? editingEvent.id : 'new'}
                event={editingEvent ?? undefined}
                date={date}
                defaultStartTime={newFormTime}
                existingEvents={dayEvents}
                onSave={handleSave}
                onDelete={editingEvent ? handleDelete : undefined}
                onCancel={() => { setShowNewForm(false); setEditingEvent(null); }}
              />
            </div>
          )}

          {/* Content Ideas Sidebar */}
          <div className="w-72 border-l border-border flex flex-col bg-zinc-50/50">
            <div className="p-3 border-b border-border-light">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Approved Content</h3>
                <button
                  onClick={() => { setShowNewForm(true); setEditingEvent(null); }}
                  className="px-2 py-1 text-[10px] font-semibold bg-white text-blue-500 border border-dashed border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + Add Content
                </button>
              </div>
              <div className="relative">
                <svg width="14" height="14" fill="none" stroke="#a1a1aa" strokeWidth="2" viewBox="0 0 24 24" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={ideaSearch}
                  onChange={(e) => setIdeaSearch(e.target.value)}
                  placeholder="Search ideas..."
                  className="w-full text-[11px] bg-white rounded-md border border-border-light py-1.5 pl-7 pr-2.5 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredNotes.length === 0 && (
                <div className="text-center py-8 text-zinc-300">
                  <div className="text-2xl mb-1">💡</div>
                  <p className="text-[11px]">No content ideas yet</p>
                  <p className="text-[10px] mt-0.5">Add ideas from the Content Workshop</p>
                </div>
              )}
              {filteredNotes.map((note) => {
                const statusInfo = NOTE_STATUSES.find((s) => s.value === (note.status ?? 'idea'));
                const noteTagColor = note.tags.length > 0 && TAG_DEFAULT_COLORS[note.tags[0]] ? TAG_DEFAULT_COLORS[note.tags[0]] : undefined;
                const noteDisplayColor = noteTagColor || note.color || '#000000';
                return (
                  <div
                    key={note.id}
                    className="rounded-lg p-4 transition-all group hover:shadow-sm"
                    style={{
                      backgroundColor: noteDisplayColor + '10',
                      borderLeft: `3px solid ${noteDisplayColor}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] font-semibold leading-tight truncate" style={{ color: noteDisplayColor }}>
                          {note.title}
                        </h4>
                        {note.description && (
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">{note.description}</p>
                        )}
                      </div>
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
