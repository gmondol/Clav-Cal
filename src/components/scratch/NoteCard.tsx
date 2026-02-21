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

  const hasColor = note.color && note.color !== '#000000';
  const mergedStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    backgroundColor: hasColor ? note.color + '18' : '#ffffff',
    color: note.color,
    borderLeft: `3px solid ${hasColor ? note.color : '#d4d4d8'}`,
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
          <h4 className="text-xs font-semibold leading-tight flex-1" style={{ color: note.color }}>
            {note.title}
          </h4>
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-muted hover:bg-zinc-200 hover:text-foreground transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-muted hover:bg-zinc-200 hover:text-foreground transition-colors"
            >
              {note.archived ? 'Restore' : 'Archive'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-muted hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              Delete
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
