'use client';

import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useStore } from '@/store/useStore';
import { ScratchNote, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import NoteCard from './NoteCard';

interface ScratchPanelProps {
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onRequestNew?: () => void;
  onRequestEdit?: (note: ScratchNote) => void;
}

export default function ScratchPanel({ searchRef, onRequestNew, onRequestEdit }: ScratchPanelProps) {
  const { notes, archiveNote, deleteNote, usedNoteIds } = useStore();
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const filteredNotes = notes.filter((n) => {
    if (!showArchived && n.archived) return false;
    const status = n.status ?? 'idea';
    if (status === 'idea' || status === 'used') return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag && !n.tags.includes(filterTag)) return false;
    return true;
  });

  const activeFilterCount = [filterTag].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      <div className="p-3 border-b border-border space-y-2 bg-white">
        <div className="flex items-center justify-center gap-2 px-3 py-1.5">
          <h3 className="text-sm font-bold text-black uppercase tracking-wider">Approved Content</h3>
          <button
            onClick={onRequestNew}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md text-blue-500 bg-white border border-dashed border-blue-400 hover:bg-blue-50 transition-colors"
          >
            + New
          </button>
        </div>

        <div className="relative">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full text-xs bg-zinc-50 rounded-md border border-border-light py-1.5 pl-9 pr-2 outline-none placeholder:text-black focus:border-primary/30 transition-colors"
          />
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 text-black"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted font-semibold uppercase">Filter:</span>
          {PRESET_TAGS.map((tag) => {
            const tagColor = TAG_DEFAULT_COLORS[tag];
            const isActive = filterTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setFilterTag(isActive ? null : tag)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  isActive ? '' : 'border hover:opacity-80'
                }`}
                style={
                  isActive
                    ? { backgroundColor: tagColor, color: '#fff', boxShadow: `0 0 0 1px ${tagColor}` }
                    : { backgroundColor: tagColor + '18', color: tagColor, borderColor: tagColor + '40' }
                }
              >
                {tag}
              </button>
            );
          })}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilterTag(null)}
              className="text-[9px] text-red-400 hover:text-red-500 ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <SortableContext items={filteredNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => onRequestEdit?.(note)}
              onArchive={() => archiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </SortableContext>

        {filteredNotes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-xs text-muted">
              {notes.length === 0
                ? 'No approved content yet.'
                : 'No matching content.'}
            </p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border-light flex items-center justify-between">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-[10px] transition-colors ${
            showArchived ? 'text-primary font-semibold' : 'text-muted hover:text-foreground'
          }`}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
        {usedNoteIds.length > 0 && (
          <span className="text-[10px] text-muted">
            {usedNoteIds.length} idea{usedNoteIds.length !== 1 ? 's' : ''} used
          </span>
        )}
      </div>
    </div>
  );
}
