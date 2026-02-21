'use client';

import { useState } from 'react';
import { CalendarEvent, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import TagBadge from '@/components/ui/TagBadge';
import { generateTimeSlots, timeToMinutes } from '@/lib/utils';

const TIME_OPTIONS = generateTimeSlots(0, 24, 15);

interface EventEditorProps {
  event?: CalendarEvent;
  date: string;
  defaultStartTime?: string;
  onSave: (data: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function EventEditor({
  event,
  date,
  defaultStartTime = '10:00',
  onSave,
  onDelete,
  onCancel,
}: EventEditorProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [startTime, setStartTime] = useState(event?.startTime ?? defaultStartTime);
  const defaultLength = event
    ? (timeToMinutes(event.endTime) - timeToMinutes(event.startTime)) / 60
    : 1;
  const [segmentLength, setSegmentLength] = useState(defaultLength);
  const [color, setColor] = useState(event?.color ?? '#3b82f6');
  const [address, setAddress] = useState(event?.address ?? '');
  const [contact, setContact] = useState(event?.contact ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [tags, setTags] = useState<string[]>(event?.tags ?? []);
  const [confirmed, setConfirmed] = useState(event?.confirmed ?? false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const toggleTag = (tag: string) => {
    const wasActive = tags.includes(tag);
    setTags((prev) => (wasActive ? prev.filter((t) => t !== tag) : [...prev, tag]));
    if (!wasActive && TAG_DEFAULT_COLORS[tag]) {
      setColor(TAG_DEFAULT_COLORS[tag]);
    }
  };

  const computeEndTime = () => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = Math.min(startMinutes + segmentLength * 60, 24 * 60);
    const h = Math.floor(endMinutes / 60);
    const m = Math.round(endMinutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      date,
      startTime,
      endTime: computeEndTime(),
      title: title.trim(),
      color,
      address: address.trim() || undefined,
      contact: contact.trim() || undefined,
      description: description.trim() || undefined,
      tags,
      confirmed,
      fromNoteId: event?.fromNoteId,
    });
  };

  const formatLabel = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-border p-4 space-y-3 animate-scale-in shadow-lg max-h-[80vh] overflow-y-auto"
    >
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Activity name..."
          className="flex-1 text-sm font-semibold bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
        />
        <button
          type="button"
          onClick={() => setConfirmed(!confirmed)}
          className="text-base flex-shrink-0 transition-transform hover:scale-110"
          title={confirmed ? 'Confirmed — click to unconfirm' : 'Not confirmed — click to confirm'}
        >
          {confirmed ? '✅' : '❌'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5 block">Start</label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-1.5 outline-none focus:border-primary/30"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5 block">Length (Hrs)</label>
          <input
            type="number"
            min={0.25}
            max={24}
            step={0.25}
            value={segmentLength}
            onChange={(e) => setSegmentLength(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
            className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-1.5 outline-none focus:border-primary/30"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Tag</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              color={TAG_DEFAULT_COLORS[tag]}
              active
              onClick={() => toggleTag(tag)}
              size="sm"
            />
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="text-[9px] px-1.5 py-0.5 rounded-full border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-colors font-medium"
            >
              + Add Tag
            </button>
            {showTagPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-border shadow-lg p-2 z-10 flex flex-wrap gap-1.5 min-w-[160px]">
                {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    color={TAG_DEFAULT_COLORS[tag]}
                    onClick={() => { toggleTag(tag); setShowTagPicker(false); }}
                    size="sm"
                  />
                ))}
                {PRESET_TAGS.filter((t) => !tags.includes(t)).length === 0 && (
                  <span className="text-[10px] text-muted">All tags added</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="📍 Address (optional)"
        rows={2}
        className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
      />

      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="👤 Point of contact (optional)"
        className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none placeholder:text-zinc-300 focus:border-primary/30"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="📝 Notes / description..."
        rows={2}
        className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
      />

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg bg-zinc-100 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
