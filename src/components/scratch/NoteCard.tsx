'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScratchNote, TAG_DEFAULT_COLORS } from '@/lib/types';
import TagBadge from '@/components/ui/TagBadge';

interface NoteCardProps {
  note: ScratchNote;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export default function NoteCard({ note, onEdit, onArchive, onDelete }: NoteCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    data: { type: 'scratch-note', note },
  });

  const tagColor = note.tags.length > 0 && TAG_DEFAULT_COLORS[note.tags[0]] ? TAG_DEFAULT_COLORS[note.tags[0]] : undefined;
  const rawColor = note.color === '#000000' ? undefined : note.color;
  const displayColor = tagColor || rawColor || '#6366f1';
  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: displayColor + '18',
    color: displayColor,
    borderLeft: `3px solid ${displayColor}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...attributes}
      {...listeners}
      className={`group relative rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md hover:brightness-95 animate-fade-in ${
        note.archived ? 'opacity-50' : ''
      }`}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h4 className="text-xs font-semibold leading-tight flex-1" style={{ color: displayColor }}>
            {note.title}
          </h4>
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded-md bg-zinc-100 text-muted hover:bg-zinc-200 hover:text-foreground transition-colors"
              title="Edit"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md bg-zinc-100 text-muted hover:bg-red-100 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
        {note.description && (
          <p className="text-[10px] text-muted mb-1.5 line-clamp-2">{note.description}</p>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          {note.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} color={TAG_DEFAULT_COLORS[tag]} />
          ))}
          {note.keepInScratch && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">
              Template
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
