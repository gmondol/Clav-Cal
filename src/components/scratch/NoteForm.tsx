'use client';

import { useState } from 'react';
import { ScratchNote, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import ColorPicker from '@/components/ui/ColorPicker';
import TagBadge from '@/components/ui/TagBadge';

interface NoteFormProps {
  initialNote?: ScratchNote;
  onSubmit: (data: Omit<ScratchNote, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function NoteForm({ initialNote, onSubmit, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title ?? '');
  const [color, setColor] = useState(initialNote?.color ?? '#3b82f6');
  const [tags, setTags] = useState<string[]>(initialNote?.tags ?? []);
  const [description, setDescription] = useState(initialNote?.description ?? '');
  const [keepInScratch, setKeepInScratch] = useState(initialNote?.keepInScratch ?? false);

  const toggleTag = (tag: string) => {
    const wasActive = tags.includes(tag);
    setTags((prev) => (wasActive ? prev.filter((t) => t !== tag) : [...prev, tag]));
    if (!wasActive && TAG_DEFAULT_COLORS[tag]) {
      setColor(TAG_DEFAULT_COLORS[tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      color,
      tags,
      archived: initialNote?.archived ?? false,
      description: description.trim() || undefined,
      keepInScratch,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-3 space-y-3 animate-scale-in">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="w-full text-sm font-medium bg-transparent border-none outline-none placeholder:text-zinc-300"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
      />
      <div>
        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Color</label>
        <ColorPicker value={color} onChange={setColor} size="sm" />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Tags</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_TAGS.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              active={tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              size="sm"
            />
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={keepInScratch}
          onChange={(e) => setKeepInScratch(e.target.checked)}
          className="rounded accent-primary"
        />
        Keep in scratch after scheduling (template)
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 py-1.5 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {initialNote ? 'Update' : 'Add Note'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-muted bg-zinc-100 rounded-md hover:bg-zinc-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
