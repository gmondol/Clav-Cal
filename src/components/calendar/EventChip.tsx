'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '@/lib/types';
import { formatTimeDisplay, timeToMinutes } from '@/lib/utils';

interface EventChipProps {
  event: CalendarEvent;
  hasConflict?: boolean;
  compact?: boolean;
  scaled?: boolean;
  onClick?: () => void;
}

export default function EventChip({ event, hasConflict, compact, scaled, onClick }: EventChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    data: { type: 'event', event },
  });

  const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
  const scaledHeight = scaled ? Math.max(Math.round(duration / 15) * 5 + 14, 20) : undefined;

  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: event.color + '18',
    color: event.color,
    borderLeft: `2px solid ${event.color}`,
    height: scaledHeight ? `${scaledHeight}px` : undefined,
    minHeight: scaledHeight ? `${scaledHeight}px` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`group relative flex flex-col justify-center gap-0 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-grab active:cursor-grabbing transition-all hover:brightness-95 ${
        hasConflict ? 'conflict-indicator' : ''
      } ${compact ? 'overflow-hidden' : ''}`}
      title={`${event.title} — ${formatTimeDisplay(event.startTime)}–${formatTimeDisplay(event.endTime)}`}
    >
      <span className="truncate leading-tight">{event.title}</span>
      {scaled && scaledHeight && scaledHeight > 24 && (
        <span className="text-[9px] opacity-70 leading-tight truncate">
          {formatTimeDisplay(event.startTime)}–{formatTimeDisplay(event.endTime)}
        </span>
      )}
    </div>
  );
}
