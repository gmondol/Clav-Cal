'use client';

import { useState, useRef } from 'react';
import { CalendarEvent, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import TagBadge from '@/components/ui/TagBadge';
import { generateTimeSlots, timeToMinutes } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const TIME_OPTIONS = generateTimeSlots(0, 24, 15);

interface EventEditorProps {
  event?: CalendarEvent;
  date: string;
  defaultStartTime?: string;
  existingEvents?: CalendarEvent[];
  onSave: (data: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function EventEditor({
  event,
  date,
  defaultStartTime = '10:00',
  existingEvents = [],
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
  const [color, setColor] = useState(event?.color ?? '#000000');
  const [address, setAddress] = useState(event?.address ?? '');
  const [contact, setContact] = useState(event?.contact ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [tags, setTags] = useState<string[]>(event?.tags ?? []);
  const [confirmed, setConfirmed] = useState(event?.confirmed ?? false);
  const [attachments, setAttachments] = useState<string[]>(event?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [overlapError, setOverlapError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `event-attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('attachments').getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    setAttachments((prev) => [...prev, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a !== url));
  };

  const toggleTag = (tag: string) => {
    const wasActive = tags.includes(tag);
    if (wasActive) {
      setTags([]);
      setColor('#000000');
    } else {
      setTags([tag]);
      if (TAG_DEFAULT_COLORS[tag]) setColor(TAG_DEFAULT_COLORS[tag]);
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
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(computeEndTime());
    const hasOverlap = existingEvents
      .filter((ev) => ev.id !== event?.id)
      .some((ev) => {
        const evStart = timeToMinutes(ev.startTime);
        const evEnd = timeToMinutes(ev.endTime);
        return newStart < evEnd && newEnd > evStart;
      });
    if (hasOverlap) {
      setOverlapError(true);
      return;
    }
    setOverlapError(false);
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
      attachments,
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
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Activity name..."
        className="w-full text-sm font-semibold text-center bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
      />

      <label
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setConfirmed(!confirmed)}
      >
        <span className={`text-xs font-medium transition-colors ${confirmed ? 'text-green-600' : 'text-red-500'}`}>Confirmed</span>
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            confirmed ? 'bg-green-500 border-green-500' : 'bg-white border-red-300'
          }`}
        >
          {confirmed && (
            <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      </label>

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
          {PRESET_TAGS.map((tag) => {
            const isActive = tags.includes(tag);
            const tagColor = TAG_DEFAULT_COLORS[tag];
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer"
                style={
                  isActive
                    ? { backgroundColor: tagColor, color: '#fff', boxShadow: `0 0 0 1px ${tagColor}` }
                    : { backgroundColor: tagColor + '18', color: tagColor, opacity: tags.length > 0 ? 0.4 : 1 }
                }
              >
                {tag}
              </button>
            );
          })}
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

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full text-xs bg-white rounded-md border border-dashed border-blue-400 p-2 text-blue-500 font-medium hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {uploading ? 'Uploading...' : '📎 Attach Files'}
        </button>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((url) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt="Attachment"
                  className="w-14 h-14 rounded-md object-cover border border-border-light"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(url)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {overlapError && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
          <span className="text-red-500 text-sm flex-shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-red-600">Time overlap error</p>
            <p className="text-[10px] text-red-500 mt-0.5">This time conflicts with an existing event. Please adjust the start time or duration.</p>
          </div>
          <button type="button" onClick={() => setOverlapError(false)} className="text-red-400 hover:text-red-600 ml-auto flex-shrink-0">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {event ? 'Save' : 'Add'}
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
            className="p-2 rounded-lg bg-zinc-100 text-red-500 hover:bg-red-50 transition-colors"
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
