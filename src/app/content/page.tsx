'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { ScratchNote, NoteStatus, NOTE_STATUSES, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import TagBadge from '@/components/ui/TagBadge';

function ContentCard({
  note,
  onEdit,
  onMove,
  onDelete,
}: {
  note: ScratchNote;
  onEdit: () => void;
  onMove: (status: NoteStatus) => void;
  onDelete: () => void;
}) {
  const [showMove, setShowMove] = useState(false);

  return (
    <div
      className="rounded-lg p-3 transition-all hover:shadow-md cursor-pointer group"
      style={{
        backgroundColor: note.color + '18',
        borderLeft: `3px solid ${note.color}`,
      }}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold leading-tight" style={{ color: note.color }}>
          {note.title}
        </h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setShowMove(!showMove)}
              className="p-1 rounded hover:bg-white/50 text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Move"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            {showMove && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-border shadow-lg p-1.5 z-10 min-w-[120px]">
                {NOTE_STATUSES.filter((s) => s.value !== note.status).map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { onMove(s.value); setShowMove(false); }}
                    className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>
      {note.description && (
        <p className="text-[11px] text-zinc-500 mb-2 line-clamp-3">{note.description}</p>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        {note.tags.map((tag) => (
          <TagBadge key={tag} tag={tag} color={TAG_DEFAULT_COLORS[tag]} size="sm" />
        ))}
      </div>
    </div>
  );
}

function NoteEditor({
  note,
  onSave,
  onCancel,
}: {
  note?: ScratchNote;
  onSave: (data: Partial<ScratchNote> & { title: string; color: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [color, setColor] = useState(note?.color ?? '#3b82f6');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [status, setStatus] = useState<NoteStatus>(note?.status ?? 'idea');

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    if (!tags.includes(tag) && TAG_DEFAULT_COLORS[tag]) {
      setColor(TAG_DEFAULT_COLORS[tag]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground">{note ? 'Edit Idea' : 'New Idea'}</h3>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the idea?"
          className="w-full text-sm font-semibold bg-transparent border-b border-border-light pb-2 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Flesh it out... notes, format ideas, guest list, equipment needed, talking points..."
          rows={5}
          className="w-full text-sm bg-zinc-50 rounded-lg border border-border-light p-3 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
        />

        <div>
          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 block">Status</label>
          <div className="flex gap-2">
            {NOTE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  status === s.value
                    ? 'text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
                style={status === s.value ? { backgroundColor: s.color } : undefined}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                color={TAG_DEFAULT_COLORS[tag]}
                active={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                size="sm"
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              if (!title.trim()) return;
              onSave({ title: title.trim(), description: description.trim() || undefined, color, tags, status, archived: false });
            }}
            disabled={!title.trim()}
            className="flex-1 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            {note ? 'Save' : 'Add Idea'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const { notes, addNote, updateNote, deleteNote, loadFromSupabase, loaded } = useStore();
  const [editingNote, setEditingNote] = useState<ScratchNote | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) loadFromSupabase();
  }, [loaded, loadFromSupabase]);

  const activeNotes = notes.filter((n) => !n.archived && (!filterTag || n.tags.includes(filterTag)));

  const getNotesForStatus = useCallback(
    (status: NoteStatus) => activeNotes.filter((n) => (n.status ?? 'idea') === status),
    [activeNotes]
  );

  const handleSave = (data: Partial<ScratchNote> & { title: string; color: string }) => {
    if (editingNote) {
      updateNote(editingNote.id, data);
    } else {
      addNote({ ...data, tags: data.tags ?? [], archived: false });
    }
    setEditingNote(null);
    setShowNewForm(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <a href="/" className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors" title="Back to Calendar">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a>
          <h1 className="text-xl font-bold tracking-tight text-black">
            <span className="text-blue-500">Content</span> Workshop
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Filter:</span>
            {PRESET_TAGS.map((tag) => {
              const tagColor = TAG_DEFAULT_COLORS[tag];
              const isActive = filterTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setFilterTag(isActive ? null : tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                    isActive ? 'ring-1 ring-offset-1' : 'border hover:opacity-80'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: tagColor, color: '#fff' }
                      : { backgroundColor: tagColor + '18', color: tagColor, borderColor: tagColor + '40' }
                  }
                >
                  {tag}
                </button>
              );
            })}
            {filterTag && (
              <button onClick={() => setFilterTag(null)} className="text-[10px] text-red-400 hover:text-red-500 ml-1">Clear</button>
            )}
          </div>
          <button
            onClick={() => { setEditingNote(null); setShowNewForm(true); }}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + New Idea
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {NOTE_STATUSES.map((col) => {
          const colNotes = getNotesForStatus(col.value);
          return (
            <div key={col.value} className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-base">{col.emoji}</span>
                <h2 className="text-sm font-bold text-foreground">{col.label}</h2>
                <span className="text-[10px] font-semibold text-muted bg-zinc-100 rounded-full px-1.5 py-0.5">
                  {colNotes.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 rounded-xl bg-zinc-50/50 p-2 border border-border-light">
                {colNotes.map((note) => (
                  <ContentCard
                    key={note.id}
                    note={note}
                    onEdit={() => setEditingNote(note)}
                    onMove={(status) => updateNote(note.id, { status })}
                    onDelete={() => deleteNote(note.id)}
                  />
                ))}
                {colNotes.length === 0 && (
                  <div className="text-center py-8 text-zinc-300">
                    <div className="text-2xl mb-1">{col.emoji}</div>
                    <p className="text-[11px]">No {col.label.toLowerCase()} items</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(showNewForm || editingNote) && (
        <NoteEditor
          note={editingNote ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowNewForm(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}
