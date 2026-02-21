'use client';

import { useState, useRef, useCallback } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useStore } from '@/store/useStore';
import { ScratchNote, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import NoteCard from './NoteCard';
import NoteForm from './NoteForm';

interface ScratchPanelProps {
  searchRef?: React.RefObject<HTMLInputElement | null>;
  showFormDefault?: boolean;
}

export default function ScratchPanel({ searchRef, showFormDefault }: ScratchPanelProps) {
  const { notes, addNote, updateNote, deleteNote, archiveNote, loadTemplates, usedNoteIds } = useStore();
  const [showForm, setShowForm] = useState(showFormDefault ?? false);
  const [editingNote, setEditingNote] = useState<ScratchNote | null>(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const filteredNotes = notes.filter((n) => {
    if (!showArchived && n.archived) return false;
    const status = n.status ?? 'idea';
    if (status === 'idea' || status === 'used') return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag && !n.tags.includes(filterTag)) return false;
    
    return true;
  });

  const handleCreate = useCallback(
    (data: Omit<ScratchNote, 'id' | 'createdAt'>) => {
      addNote(data);
      setShowForm(false);
    },
    [addNote]
  );

  const handleUpdate = useCallback(
    (data: Omit<ScratchNote, 'id' | 'createdAt'>) => {
      if (!editingNote) return;
      updateNote(editingNote.id, data);
      setEditingNote(null);
    },
    [editingNote, updateNote]
  );

  const activeFilterCount = [filterTag].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-center gap-2 px-3 py-1.5">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Content Ideas</h3>
          <button
            onClick={() => { setEditingNote(null); setShowForm(true); }}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md text-blue-500 border border-dashed border-blue-500 hover:bg-blue-50 transition-colors bg-white"
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
          <button
            onClick={() => setShowAddTag(!showAddTag)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-blue-500 text-blue-500 hover:bg-blue-50 transition-colors font-medium"
          >
            + Add Tag
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilterTag(null)}
              className="text-[9px] text-red-400 hover:text-red-500 ml-1"
            >
              Clear
            </button>
          )}
        </div>
        {showAddTag && (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name..."
              className="flex-1 text-[10px] bg-zinc-50 rounded-md border border-border-light py-1 px-2 outline-none placeholder:text-zinc-300 focus:border-primary/30"
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowAddTag(false); setNewTagName(''); }
              }}
            />
            <button
              onClick={() => { setShowAddTag(false); setNewTagName(''); }}
              className="text-[9px] text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(showForm || editingNote) && (
          <NoteForm
            initialNote={editingNote ?? undefined}
            onSubmit={editingNote ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingNote(null); }}
          />
        )}

        <SortableContext items={filteredNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => { setEditingNote(note); setShowForm(false); }}
              onArchive={() => archiveNote(note.id)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </SortableContext>

        {filteredNotes.length === 0 && !showForm && !editingNote && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">💡</div>
            <p className="text-xs text-muted">
              {notes.length === 0
                ? 'No notes yet. Create one or load templates!'
                : 'No matching notes.'}
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
