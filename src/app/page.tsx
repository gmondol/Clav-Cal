'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useStore } from '@/store/useStore';
import { CalendarEvent, ScratchNote } from '@/lib/types';
import Header from '@/components/layout/Header';
import WeeklyGoals from '@/components/layout/WeeklyGoals';
import Onboarding from '@/components/layout/Onboarding';
import ExportModal from '@/components/layout/ExportModal';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarNav from '@/components/calendar/CalendarNav';
import WeekView from '@/components/calendar/WeekView';
import ScratchPanel from '@/components/scratch/ScratchPanel';
import DayView from '@/components/day/DayView';
import EventEditor from '@/components/day/EventEditor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type DragItem =
  | { type: 'scratch-note'; note: ScratchNote }
  | { type: 'event'; event: CalendarEvent };

interface PendingDrop {
  note: ScratchNote;
  date: string;
}

function ResizablePanel({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(320);
  const [collapsed, setCollapsed] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.max(200, Math.min(600, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (collapsed) {
    return (
      <div className="flex-shrink-0 border-l border-border bg-surface flex items-center">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 text-muted hover:text-foreground transition-colors"
          title="Expand panel"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex" style={{ width: `${width}px` }}>
      <div
        className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors relative group flex-shrink-0"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setCollapsed(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-blue-400 transition-colors" />
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const {
    currentView,
    hasSeenOnboarding,
    moveEvent,
    reorderNotes,
    reorderEventsInDay,
    addEvent,
    deleteNote,
    loadFromSupabase,
    loaded,
  } = useStore();
  const notes = useStore((s) => s.notes);

  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [dayViewDate, setDayViewDate] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    loadFromSupabase();
  }, [loadFromSupabase]);

  useKeyboardShortcuts({
    onNewNote: () => setShowNewForm(true),
    onSearch: () => searchRef.current?.focus(),
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem | undefined;
    if (data) setActiveDrag(data);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as DragItem | undefined;
      const overData = over.data.current as { type: string; date?: string; event?: CalendarEvent; note?: ScratchNote } | undefined;

      if (!activeData || !overData) return;

      const getDropDate = (): string | null => {
        if (overData.type === 'day' && overData.date) return overData.date;
        if (overData.type === 'event' && overData.event) return overData.event.date;
        return null;
      };

      if (activeData.type === 'scratch-note') {
        const dropDate = getDropDate();
        if (dropDate) {
          const note = notes.find((n) => n.id === activeData.note.id) ?? activeData.note;
          setPendingDrop({ note, date: dropDate });
          return;
        }

        if (overData.type === 'scratch-note') {
          reorderNotes(active.id as string, over.id as string);
          return;
        }
      }

      if (activeData.type === 'event' && overData.type === 'day' && overData.date) {
        moveEvent(activeData.event.id, overData.date);
        return;
      }

      if (activeData.type === 'event' && overData.type === 'event') {
        if (activeData.event.date === overData.event!.date) {
          reorderEventsInDay(active.id as string, over.id as string);
        } else {
          moveEvent(activeData.event.id, overData.event!.date);
        }
        return;
      }
    },
    [notes, moveEvent, reorderNotes, reorderEventsInDay]
  );

  const handlePendingDropSave = useCallback(
    (data: Omit<CalendarEvent, 'id'>) => {
      addEvent(data);
      if (pendingDrop && !pendingDrop.note.keepInScratch) {
        deleteNote(pendingDrop.note.id);
      }
      setPendingDrop(null);
    },
    [addEvent, deleteNote, pendingDrop]
  );

  const handleDayClick = useCallback((date: string) => {
    setDayViewDate(date);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setDayViewDate(event.date);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted animate-pulse">Loading StreamSchedule...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-background">
        <Header onExport={() => setShowExport(true)} onHelp={() => setShowOnboarding(true)} />
        <WeeklyGoals />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <CalendarNav />
            {currentView === 'month' ? (
              <CalendarGrid onDayClick={handleDayClick} onEventClick={handleEventClick} />
            ) : (
              <WeekView onDayClick={handleDayClick} onEventClick={handleEventClick} />
            )}
          </div>
          <ResizablePanel>
            <ScratchPanel searchRef={searchRef} showFormDefault={showNewForm} />
          </ResizablePanel>
        </div>
      </div>

      {activeDrag && (
        <DragOverlay>
          <div className="drag-overlay rounded-lg p-2 bg-white border border-border">
            {activeDrag.type === 'scratch-note' && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeDrag.note.color }}
                />
                <span className="text-xs font-medium truncate">{activeDrag.note.title}</span>
              </div>
            )}
            {activeDrag.type === 'event' && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeDrag.event.color }}
                />
                <span className="text-xs font-medium truncate">{activeDrag.event.title}</span>
              </div>
            )}
          </div>
        </DragOverlay>
      )}

      {(!hasSeenOnboarding || showOnboarding) && <Onboarding onClose={() => setShowOnboarding(false)} />}
      {dayViewDate && <DayView date={dayViewDate} onClose={() => setDayViewDate(null)} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {pendingDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md animate-scale-in">
            <EventEditor
              date={pendingDrop.date}
              defaultStartTime="10:00"
              onSave={handlePendingDropSave}
              onCancel={() => setPendingDrop(null)}
              event={{
                id: '',
                date: pendingDrop.date,
                startTime: '10:00',
                endTime: '11:00',
                title: pendingDrop.note.title,
                color: pendingDrop.note.color,
                description: pendingDrop.note.description,
                tags: [...pendingDrop.note.tags],
              }}
            />
          </div>
        </div>
      )}
    </DndContext>
  );
}
