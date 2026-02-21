'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useStore } from '@/store/useStore';

const NAV_ITEMS = [
  { href: '/', accent: 'Clav', rest: 'StreamSchedule' },
  { href: '/content', accent: 'Content', rest: 'Workshop' },
] as const;
import { ScratchNote, NoteStatus, NOTE_STATUSES, PRESET_TAGS, TAG_DEFAULT_COLORS, CollabProfile, Contact } from '@/lib/types';
import { generateContentPDF, ContentColumnType } from '@/lib/pdfExport';
import TagBadge from '@/components/ui/TagBadge';
import ColorPicker from '@/components/ui/ColorPicker';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function ContentColumn({
  status,
  colNotes,
  onAddNew,
  onEditNote,
  onMoveNote,
  onDeleteNote,
}: {
  status: NoteStatus;
  colNotes: ScratchNote[];
  onAddNew: (status: NoteStatus) => void;
  onEditNote: (note: ScratchNote) => void;
  onMoveNote: (noteId: string, status: NoteStatus) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `content-col-${status}`,
    data: { type: 'content-column', status },
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-base">{NOTE_STATUSES.find((s) => s.value === status)?.emoji}</span>
        <h2 className="text-sm font-bold text-foreground">{NOTE_STATUSES.find((s) => s.value === status)?.label}</h2>
        <span className="text-[10px] font-semibold text-white bg-blue-500 rounded-full px-1.5 py-0.5">
          {colNotes.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-2.5 bg-white border border-border-light rounded-xl p-4 transition-colors ${isOver ? 'ring-2 ring-blue-300 ring-offset-1 bg-blue-50/30' : ''}`}
      >
        {status !== 'ready' && (
          <button
            onClick={() => onAddNew(status)}
            className="w-full p-4 min-h-[7rem] flex items-center justify-center text-[11px] font-semibold text-blue-500 hover:text-blue-600 bg-white border border-dashed border-blue-400 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all"
          >
            {status === 'workshop' ? '+ Add collab' : '+ Add new content idea'}
          </button>
        )}
        {colNotes.map((note) => (
          <ContentCard
            key={note.id}
            note={note}
            onEdit={() => onEditNote(note)}
            onMove={(s) => onMoveNote(note.id, s)}
            onDelete={() => onDeleteNote(note.id)}
          />
        ))}
      </div>
    </div>
  );
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: note.id,
    data: { type: 'content-note', note },
  });

  const rawColor = note.color === '#000000' ? undefined : note.color;
  const displayColor = (note.tags.length > 0 && TAG_DEFAULT_COLORS[note.tags[0]]) ? TAG_DEFAULT_COLORS[note.tags[0]] : (rawColor || '#6366f1');

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg p-4 min-h-[7rem] cursor-grab active:cursor-grabbing group hover:shadow-sm transition-shadow ${isDragging ? 'opacity-50' : ''}`}
      style={{
        border: `1.5px solid ${displayColor}`,
        backgroundColor: displayColor + '18',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {note.collabProfiles && note.collabProfiles.length > 0 && (
            <div className="flex -space-x-2 flex-shrink-0">
              {note.collabProfiles.slice(0, 3).map((p, i) => (
                <div key={i} className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 border-2 border-white flex items-center justify-center">
                  {p.profilePicUrl ? (
                    <img src={p.profilePicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-zinc-400">👤</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <h4 className="text-sm font-semibold leading-tight truncate" style={{ color: displayColor }}>
            {note.title}
          </h4>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {note.status !== 'ready' ? (
            <button
              onClick={() => onMove('ready')}
              className="p-1 rounded hover:bg-green-50 text-zinc-400 hover:text-green-600 transition-colors"
              title="Move to Approved"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {note.status === 'workshop' ? (
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                ) : (
                  <path d="M5 12h14M12 5l7 7-7 7" />
                )}
              </svg>
            </button>
          ) : (
            <button
              onClick={() => onMove((note.collabProfiles?.length ?? 0) > 0 ? 'workshop' : 'idea')}
              className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              title={(note.collabProfiles?.length ?? 0) > 0 ? 'Move back to Collabs' : 'Move back to Ideas'}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {(note.collabProfiles?.length ?? 0) > 0 ? (
                  <path d="M5 12h14M12 5l7 7-7 7" />
                ) : (
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-xs w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-foreground mb-1">Delete this idea?</h4>
            <p className="text-[11px] text-muted mb-4">"{note.title}" will be permanently deleted. This can't be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-xs font-semibold text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {(note.description || (note.collabProfiles && note.collabProfiles.some((p) => p.igUrl || p.twitterUrl || p.tiktokUrl))) && (
        <div className="text-[11px] text-zinc-500 mb-2 space-y-1">
          {note.description && <p className="line-clamp-2">{note.description}</p>}
          {note.collabProfiles && (() => {
            const hasIg = note.collabProfiles.some((p) => p.igUrl);
            const hasX = note.collabProfiles.some((p) => p.twitterUrl);
            const hasTt = note.collabProfiles.some((p) => p.tiktokUrl);
            if (!hasIg && !hasX && !hasTt) return null;
            return (
              <div className="flex gap-1.5 flex-wrap">
                {hasIg && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-600">IG</span>}
                {hasX && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">X</span>}
                {hasTt && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100">TT</span>}
              </div>
            );
          })()}
        </div>
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
  onDelete,
  allNotes = [],
}: {
  note?: ScratchNote;
  onSave: (data: Partial<ScratchNote> & { title: string; color: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  allNotes?: ScratchNote[];
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [color, setColor] = useState(note?.color && note.color !== '#000000' ? note.color : '#6366f1');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [address, setAddress] = useState(note?.address ?? '');
  const [contactName, setContactName] = useState(note?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(note?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(note?.contactEmail ?? '');
  const [contactNotes, setContactNotes] = useState(note?.contactNotes ?? '');
  const [attachments, setAttachments] = useState<string[]>(note?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [linkedCollabIds, setLinkedCollabIds] = useState<string[]>(note?.linkedCollabIds ?? []);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = note?.status ?? 'idea';
  const isApproved = status === 'ready';
  const { customTags, addCustomTag, addContact, contacts } = useStore();

  customTags.forEach((t) => { TAG_DEFAULT_COLORS[t.name] = t.color; });

  const availableCollabs = allNotes.filter(
    (n) => n.status === 'workshop' && (n.collabProfiles?.length ?? 0) > 0 && !linkedCollabIds.includes(n.id)
  );
  const linkedCollabs = allNotes.filter((n) => linkedCollabIds.includes(n.id));

  const attachCollab = (collabId: string) => {
    setLinkedCollabIds((prev) => [...prev, collabId]);
    setTags(['Collab']);
    if (TAG_DEFAULT_COLORS['Collab']) setColor(TAG_DEFAULT_COLORS['Collab']);
    setShowCollabPicker(false);
  };

  const detachCollab = (collabId: string) => {
    const next = linkedCollabIds.filter((id) => id !== collabId);
    setLinkedCollabIds(next);
    if (next.length === 0) {
      setTags([]);
      setColor('#000000');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `note-attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      tags,
      status,
      archived: false,
      address: address.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactNotes: contactNotes.trim() || undefined,
      attachments,
      linkedCollabIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-border p-4 space-y-3 animate-scale-in shadow-lg max-h-[80vh] overflow-y-auto max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the idea?"
          className="w-full text-sm font-semibold bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
        />

        <div>
          <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Tag</label>
          <div className="flex flex-wrap gap-1.5">
            {[...PRESET_TAGS.map((t) => ({ name: t, color: TAG_DEFAULT_COLORS[t] || '#000' })), ...customTags].map(({ name: tag, color: tagColor }) => {
              const isActive = tags.includes(tag);
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
            <button
              type="button"
              onClick={() => setShowNewTagForm(!showNewTagForm)}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors"
            >
              + New Tag
            </button>
          </div>
          {showNewTagForm && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-border-light">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 text-[11px] bg-white border border-border-light rounded px-2 py-1 outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTagName.trim()) {
                      addCustomTag({ name: newTagName.trim(), color: newTagColor });
                      TAG_DEFAULT_COLORS[newTagName.trim()] = newTagColor;
                      setNewTagName('');
                      setShowNewTagForm(false);
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTagName.trim()) {
                    addCustomTag({ name: newTagName.trim(), color: newTagColor });
                    TAG_DEFAULT_COLORS[newTagName.trim()] = newTagColor;
                    setNewTagName('');
                    setShowNewTagForm(false);
                  }
                }}
                className="text-[10px] px-2 py-1 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="📝 Flesh it out... notes, format ideas, guest list, equipment needed, talking points..."
          rows={3}
          className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
        />

        {isApproved && (
          <>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="📍 Address (optional)"
              rows={2}
              className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
            />

            <div className="space-y-2 p-3 rounded-lg border border-zinc-200 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">👤 Point of Contact</p>
                {contactName.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const existing = contacts.find((c) => c.name.toLowerCase() === contactName.trim().toLowerCase());
                      if (existing) return;
                      addContact({
                        name: contactName.trim(),
                        phone: contactPhone.trim() || undefined,
                        email: contactEmail.trim() || undefined,
                        notes: contactNotes.trim() || undefined,
                      });
                    }}
                    className="text-[10px] font-medium text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-blue-50"
                    title="Save to Contacts"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
                    </svg>
                    Save to Contacts
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Name"
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
                />
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone"
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
                />
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email"
                  className="col-span-2 text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
                />
              </div>
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Contact notes..."
                rows={2}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none resize-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Attached Collabs */}
            {linkedCollabs.length > 0 && (
              <div className="space-y-1.5">
                {linkedCollabs.map((collab) => {
                  const profiles = collab.collabProfiles ?? [];
                  const profileNames = profiles.map((p) => p.name).filter(Boolean).join(', ');
                  return (
                    <div key={collab.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex -space-x-1.5 flex-shrink-0">
                        {profiles.slice(0, 3).map((p, i) => (
                          <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-purple-200 border border-white flex items-center justify-center">
                            {p.profilePicUrl ? (
                              <img src={p.profilePicUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-purple-600">{p.name?.[0]?.toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-medium text-purple-700 truncate flex-1">{collab.title || profileNames}</span>
                      <button
                        type="button"
                        onClick={() => detachCollab(collab.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-medium flex-shrink-0 transition-colors"
                      >
                        Detach
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Attach Collab Button + Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCollabPicker(!showCollabPicker)}
                className="w-full text-xs rounded-md border border-dashed border-red-400 p-2 text-red-500 font-medium hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                🤝 Attach a Collab
              </button>
              {showCollabPicker && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {availableCollabs.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 p-3 text-center">No collabs available</p>
                  ) : (
                    availableCollabs.map((collab) => {
                      const profiles = collab.collabProfiles ?? [];
                      const profileNames = profiles.map((p) => p.name).filter(Boolean).join(', ');
                      return (
                        <button
                          key={collab.id}
                          type="button"
                          onClick={() => attachCollab(collab.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-50 transition-colors border-b border-border-light last:border-b-0"
                        >
                          <div className="flex -space-x-1.5 flex-shrink-0">
                            {profiles.slice(0, 3).map((p, i) => (
                              <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-purple-200 border border-white flex items-center justify-center">
                                {p.profilePicUrl ? (
                                  <img src={p.profilePicUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-purple-600">{p.name?.[0]?.toUpperCase()}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-zinc-800 truncate">{collab.title || profileNames}</p>
                            {collab.title && profileNames && (
                              <p className="text-[10px] text-zinc-400 truncate">{profileNames}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="Attachment" className="w-14 h-14 rounded-md object-cover border border-border-light" />
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
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {note ? 'Save' : 'Add Idea'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
          {status === 'ready' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 text-xs text-blue-500 font-medium bg-white border border-dashed border-blue-400 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {uploading ? '...' : '📎'}
            </button>
          )}
          {onDelete && note && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const EMPTY_PROFILE: CollabProfile = { name: '' };

function SocialLinkToggles({
  profile,
  onUpdate,
}: {
  profile: CollabProfile;
  onUpdate: (updates: Partial<CollabProfile>) => void;
}) {
  const [openFields, setOpenFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (profile.twitchUrl) initial.add('twitch');
    if (profile.kickUrl) initial.add('kick');
    if (profile.igUrl) initial.add('ig');
    if (profile.twitterUrl) initial.add('twitter');
    if (profile.tiktokUrl) initial.add('tiktok');
    return initial;
  });

  const toggle = (key: string) => {
    setOpenFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === 'twitch') onUpdate({ twitchUrl: undefined });
        if (key === 'kick') onUpdate({ kickUrl: undefined });
        if (key === 'ig') onUpdate({ igUrl: undefined });
        if (key === 'twitter') onUpdate({ twitterUrl: undefined });
        if (key === 'tiktok') onUpdate({ tiktokUrl: undefined });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const buttons = [
    { key: 'twitch', label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
    ), title: 'Twitch', active: openFields.has('twitch'), color: 'text-purple-500 bg-purple-50 hover:bg-purple-100' },
    { key: 'kick', label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 2h6v4h2V2h4v4h-2v4h2v4h2v-4h4v4h-4v4h-2v2h-4v-4h2v-4H8v4H2v-4h4v-4H2z"/></svg>
    ), title: 'Kick', active: openFields.has('kick'), color: 'text-green-500 bg-green-50 hover:bg-green-100' },
    { key: 'ig', label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
    ), title: 'Instagram', active: openFields.has('ig'), color: 'text-pink-500 bg-pink-50 hover:bg-pink-100' },
    { key: 'tiktok', label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.86-4.49V8.75a8.26 8.26 0 004.84 1.56V6.84a4.85 4.85 0 01-1.12-.15z"/></svg>
    ), title: 'TikTok', active: openFields.has('tiktok'), color: 'text-zinc-800 bg-zinc-100 hover:bg-zinc-200' },
    { key: 'twitter', label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ), title: 'X / Twitter', active: openFields.has('twitter'), color: 'text-zinc-700 bg-zinc-100 hover:bg-zinc-200' },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => toggle(btn.key)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              btn.active
                ? `${btn.color} ring-1 ring-offset-1 ring-current`
                : 'text-zinc-400 bg-zinc-100 hover:text-zinc-600 hover:bg-zinc-200'
            }`}
            title={btn.title}
          >
            <span className="text-sm">{btn.label}</span>
          </button>
        ))}
      </div>
      {openFields.has('twitch') && (
        <div className="flex gap-1.5 animate-fade-in">
          <input value={profile.twitchUrl ?? ''} onChange={(e) => onUpdate({ twitchUrl: e.target.value || undefined })} placeholder="Twitch URL" className="flex-1 text-[10px] bg-white border border-purple-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400" />
          <input value={profile.twitchFollowers ?? ''} onChange={(e) => onUpdate({ twitchFollowers: e.target.value || undefined })} placeholder="Followers" className="w-20 text-[10px] bg-white border border-purple-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400 text-right" />
        </div>
      )}
      {openFields.has('kick') && (
        <div className="flex gap-1.5 animate-fade-in">
          <input value={profile.kickUrl ?? ''} onChange={(e) => onUpdate({ kickUrl: e.target.value || undefined })} placeholder="Kick URL" className="flex-1 text-[10px] bg-white border border-green-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400" />
          <input value={profile.kickFollowers ?? ''} onChange={(e) => onUpdate({ kickFollowers: e.target.value || undefined })} placeholder="Followers" className="w-20 text-[10px] bg-white border border-green-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400 text-right" />
        </div>
      )}
      {openFields.has('ig') && (
        <div className="flex gap-1.5 animate-fade-in">
          <input value={profile.igUrl ?? ''} onChange={(e) => onUpdate({ igUrl: e.target.value || undefined })} placeholder="Instagram URL" className="flex-1 text-[10px] bg-white border border-pink-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400" />
          <input value={profile.igFollowers ?? ''} onChange={(e) => onUpdate({ igFollowers: e.target.value || undefined })} placeholder="Followers" className="w-20 text-[10px] bg-white border border-pink-200 rounded px-2 py-1 outline-none placeholder:text-zinc-400 text-right" />
        </div>
      )}
      {openFields.has('tiktok') && (
        <div className="flex gap-1.5 animate-fade-in">
          <input value={profile.tiktokUrl ?? ''} onChange={(e) => onUpdate({ tiktokUrl: e.target.value || undefined })} placeholder="TikTok URL" className="flex-1 text-[10px] bg-white border border-zinc-300 rounded px-2 py-1 outline-none placeholder:text-zinc-400" />
          <input value={profile.tiktokFollowers ?? ''} onChange={(e) => onUpdate({ tiktokFollowers: e.target.value || undefined })} placeholder="Followers" className="w-20 text-[10px] bg-white border border-zinc-300 rounded px-2 py-1 outline-none placeholder:text-zinc-400 text-right" />
        </div>
      )}
      {openFields.has('twitter') && (
        <div className="flex gap-1.5 animate-fade-in">
          <input value={profile.twitterUrl ?? ''} onChange={(e) => onUpdate({ twitterUrl: e.target.value || undefined })} placeholder="X / Twitter URL" className="flex-1 text-[10px] bg-white border border-zinc-300 rounded px-2 py-1 outline-none placeholder:text-zinc-400" />
          <input value={profile.twitterFollowers ?? ''} onChange={(e) => onUpdate({ twitterFollowers: e.target.value || undefined })} placeholder="Followers" className="w-20 text-[10px] bg-white border border-zinc-300 rounded px-2 py-1 outline-none placeholder:text-zinc-400 text-right" />
        </div>
      )}
    </div>
  );
}

function CollabEditor({
  note,
  onSave,
  onCancel,
  onDelete,
}: {
  note?: ScratchNote;
  onSave: (data: Partial<ScratchNote> & { title: string; color: string; collabProfiles: CollabProfile[] }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [color, setColor] = useState(note?.color && note.color !== '#000000' ? note.color : '#6366f1');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [notes, setNotes] = useState(note?.description ?? '');
  const [profiles, setProfiles] = useState<CollabProfile[]>(
    note?.collabProfiles?.length ? [...note.collabProfiles] : [{ ...EMPTY_PROFILE }]
  );
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [collapsedProfiles, setCollapsedProfiles] = useState<Set<number>>(
    () => new Set(note?.collabProfiles?.length ? note.collabProfiles.map((_, i) => i) : [])
  );

  const updateProfile = (index: number, updates: Partial<CollabProfile>) => {
    setProfiles((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const addProfile = () => setProfiles((prev) => [...prev, { ...EMPTY_PROFILE }]);
  const removeProfile = (index: number) =>
    setProfiles((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const toggleTag = (tag: string) => {
    const wasActive = tags.includes(tag);
    setTags((prev) => (wasActive ? prev.filter((t) => t !== tag) : [...prev, tag]));
    if (!wasActive && TAG_DEFAULT_COLORS[tag]) setColor(TAG_DEFAULT_COLORS[tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = profiles.filter((p) => p.name.trim());
    if (valid.length === 0) return;
    const displayTitle = title.trim() || (valid.length === 1 ? valid[0].name : `Collab: ${valid.map((p) => p.name).join(', ')}`);
    const payload: Parameters<typeof onSave>[0] = {
      title: displayTitle,
      color: TAG_DEFAULT_COLORS['Collab'] || color,
      tags: ['Collab'],
      description: notes.trim() || undefined,
      collabProfiles: valid,
      archived: false,
    };
    if (!note) payload.status = 'workshop';
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-border p-4 space-y-3 animate-scale-in shadow-lg max-h-[85vh] overflow-y-auto max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-foreground">Add collab profile</h3>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Collab title (optional)"
          className="w-full text-sm font-semibold bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
        />

        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {profiles.map((profile, idx) => {
            const isCollapsed = collapsedProfiles.has(idx);

            if (isCollapsed && profile.name.trim()) {
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border-light bg-zinc-50/50 cursor-pointer hover:bg-zinc-100/80 transition-colors"
                  onClick={() => setCollapsedProfiles((prev) => { const next = new Set(prev); next.delete(idx); return next; })}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-200 flex items-center justify-center">
                      {profile.profilePicUrl ? (
                        <img src={profile.profilePicUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-zinc-400">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{profile.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {profile.twitchUrl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">
                            Twitch{profile.twitchFollowers ? ` · ${profile.twitchFollowers}` : ''}
                          </span>
                        )}
                        {profile.kickUrl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-600 font-medium">
                            Kick{profile.kickFollowers ? ` · ${profile.kickFollowers}` : ''}
                          </span>
                        )}
                        {profile.igUrl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 font-medium">
                            IG{profile.igFollowers ? ` · ${profile.igFollowers}` : ''}
                          </span>
                        )}
                        {profile.tiktokUrl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100 font-medium">
                            TikTok{profile.tiktokFollowers ? ` · ${profile.tiktokFollowers}` : ''}
                          </span>
                        )}
                        {profile.twitterUrl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 font-medium">
                            X{profile.twitterFollowers ? ` · ${profile.twitterFollowers}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeProfile(idx); setCollapsedProfiles((prev) => { const next = new Set(prev); next.delete(idx); return next; }); }}
                          className="text-[10px] text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="p-3 rounded-lg border border-zinc-300 bg-white space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase">Profile {idx + 1}</span>
                  <div className="flex gap-1">
                    {profiles.length > 1 && (
                      <button type="button" onClick={() => removeProfile(idx)} className="text-[10px] text-red-500 hover:text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center border border-purple-200">
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="#8b5cf6" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      value={profile.name}
                      onChange={(e) => updateProfile(idx, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full text-xs bg-white border border-zinc-300 rounded px-2 py-1 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>
                <SocialLinkToggles profile={profile} onUpdate={(updates) => updateProfile(idx, updates)} />
                <div className="flex gap-2 items-end">
                  <textarea
                    value={profile.notes ?? ''}
                    onChange={(e) => updateProfile(idx, { notes: e.target.value || undefined })}
                    placeholder="Notes about this person"
                    rows={2}
                    className="flex-1 text-[10px] bg-white border border-zinc-300 rounded px-2 py-1 outline-none resize-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (profile.name.trim()) {
                        setCollapsedProfiles((prev) => new Set(prev).add(idx));
                      }
                    }}
                    disabled={!profile.name.trim()}
                    className="px-3 py-1.5 text-[10px] font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addProfile} className="w-full py-2 text-[11px] font-medium text-blue-500 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50/50 transition-colors">
          + Add another influencer
        </button>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="General notes for this collab"
          rows={2}
          className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300"
        />

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={profiles.every((p) => !p.name.trim())} className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {note ? 'Save' : 'Add Collab'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200">
            Cancel
          </button>
          {onDelete && note && (
            <button type="button" onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600" title="Delete">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function ContentPage() {
  const { notes, events, contacts, addNote, updateNote, deleteNote, addContact, updateContact, deleteContact, loadFromSupabase, loaded } = useStore();
  const [editingNote, setEditingNote] = useState<ScratchNote | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormStatus, setNewFormStatus] = useState<NoteStatus>('idea');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [showContentExport, setShowContentExport] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!loaded) loadFromSupabase();
  }, [loaded, loadFromSupabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as { type: string; note: ScratchNote } | undefined;
      const overData = over.data.current as { type: string; status?: NoteStatus; note?: ScratchNote } | undefined;
      if (activeData?.type !== 'content-note' || !overData) return;
      const targetStatus: NoteStatus | null =
        overData.type === 'content-column' ? (overData.status ?? null)
        : overData.type === 'content-note' && overData.note ? (overData.note.status ?? 'idea')
        : null;
      if (!targetStatus || activeData.note.status === targetStatus) return;
      if (targetStatus !== 'ready') return;
      updateNote(activeData.note.id, { status: targetStatus });
    },
    [updateNote]
  );

  const activeNotes = notes.filter((n) => !n.archived && (!filterTag || n.tags.includes(filterTag)));

  const getNotesForStatus = useCallback(
    (status: NoteStatus) => activeNotes.filter((n) => (n.status ?? 'idea') === status),
    [activeNotes]
  );

  const handleSave = (data: Partial<ScratchNote> & { title: string; color: string }) => {
    if (editingNote) {
      updateNote(editingNote.id, data);
    } else {
      addNote({ ...data, tags: data.tags ?? [], archived: false, status: data.status ?? newFormStatus });
    }
    setEditingNote(null);
    setShowNewForm(false);
  };

  const buildContext = () => {
    const activeNotes = notes.filter((n) => !n.archived);
    const approved = activeNotes.filter((n) => n.status === 'ready');
    const ideas = activeNotes.filter((n) => n.status === 'idea');
    const workshopCollabs = activeNotes.filter((n) => n.status === 'workshop');

    const formatNote = (n: typeof activeNotes[0]) => {
      let line = `- ${n.title}`;
      if (n.tags.length > 0) line += ` [tags: ${n.tags.join(', ')}]`;
      if (n.description) line += ` — ${n.description}`;
      if (n.address) line += ` | location: ${n.address}`;
      if (n.collabProfiles && n.collabProfiles.length > 0) {
        const names = n.collabProfiles.map((p) => p.name || 'unnamed').join(', ');
        line += ` | collabs: ${names}`;
      }
      return line;
    };

    const formatEvent = (e: typeof events[0]) => {
      let line = `- ${e.title} [${e.date}, ${e.startTime}–${e.endTime}]`;
      if (e.tags.length > 0) line += ` tags: ${e.tags.join(', ')}`;
      line += e.confirmed ? ' (confirmed)' : ' (tentative)';
      if (e.description) line += ` — ${e.description}`;
      if (e.address) line += ` | location: ${e.address}`;
      if (e.contact) line += ` | contact: ${e.contact}`;
      return line;
    };

    const sections: string[] = [];

    sections.push(events.length > 0
      ? `SCHEDULED CALENDAR EVENTS (this is what's actually on the calendar — study this to understand their content style and preferences):\n${events.map(formatEvent).join('\n')}`
      : 'SCHEDULED CALENDAR EVENTS: None scheduled yet.');

    sections.push(approved.length > 0
      ? `APPROVED IDEAS (these have been greenlit and are ready to schedule — the creator is committed to these):\n${approved.map(formatNote).join('\n')}`
      : 'APPROVED IDEAS: None yet.');

    sections.push(ideas.length > 0
      ? `BRAINSTORM IDEAS (works in progress — these are being considered):\n${ideas.map(formatNote).join('\n')}`
      : 'BRAINSTORM IDEAS: None yet.');

    if (workshopCollabs.length > 0) {
      sections.push(`POTENTIAL COLLABS (creators they're considering working with):\n${workshopCollabs.map(formatNote).join('\n')}`);
    }

    return sections.join('\n\n');
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: buildContext(),
        }),
      });
      const data = await res.json();
      if (data.message) {
        setChatMessages([...newMessages, { role: 'assistant', content: data.message }]);
      } else {
        setChatMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error || 'Something went wrong'}` }]);
      }
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: 'Failed to connect to AI. Make sure OPENAI_API_KEY is set.' }]);
    }
    setChatLoading(false);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <div className="h-screen flex flex-col" style={{ background: '#e8e8eb' }}>
      <header className="relative flex items-center px-6 py-3 bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <a href="/" className="overflow-hidden flex items-center justify-center flex-shrink-0" title="Back to Calendar" style={{ width: '116px', height: '61px' }}>
          <img src="/Favicon.png" alt="Clav Cal" className="h-auto scale-125 translate-y-1" style={{ width: '162px' }} />
        </a>

        <div ref={navRef} className="absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setNavOpen((o) => !o)}
            className="flex items-center gap-1 text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            <span className="text-blue-500">Content</span> Workshop
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-0.5 transition-transform ${navOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {navOpen && (() => {
            const otherPages = NAV_ITEMS.filter((item) => item.href !== pathname);
            if (otherPages.length === 0) return null;
            return (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[180px] z-50">
                {otherPages.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    className="block px-4 py-2 text-xl font-bold tracking-tight whitespace-nowrap hover:bg-zinc-50 transition-colors"
                  >
                    <span className="text-blue-500">{item.accent}</span> {item.rest}
                  </a>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="absolute right-6 flex items-center gap-1">
          <button
            onClick={() => setShowContacts(true)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-blue-500 transition-colors"
            title="Contacts"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </button>
          <button
            onClick={() => setShowContentExport(true)}
            className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-blue-500 transition-colors"
            title="Download Content PDF"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex gap-4 p-4 bg-white">
        {NOTE_STATUSES.filter((col) => col.value !== 'used').map((col) => (
          <ContentColumn
            key={col.value}
            status={col.value}
            colNotes={getNotesForStatus(col.value)}
            onAddNew={(status) => { setEditingNote(null); setNewFormStatus(status); setShowNewForm(true); }}
            onEditNote={(note) => setEditingNote(note)}
            onMoveNote={(noteId, status) => updateNote(noteId, { status })}
            onDeleteNote={(noteId) => deleteNote(noteId)}
          />
        ))}

        {/* Used Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-foreground">Used</h2>
            <span className="text-[10px] font-semibold text-white bg-blue-500 rounded-full px-1.5 py-0.5">
              {getNotesForStatus('used').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 bg-zinc-50 border border-border-light rounded-xl p-4">
            {getNotesForStatus('used').length === 0 ? (
              <p className="text-[11px] text-zinc-400 text-center py-8">Scheduled content will appear here</p>
            ) : (
              getNotesForStatus('used').map((note) => {
                const usedRawColor = note.color === '#000000' ? undefined : note.color;
                const displayColor = (note.tags.length > 0 && TAG_DEFAULT_COLORS[note.tags[0]]) ? TAG_DEFAULT_COLORS[note.tags[0]] : (usedRawColor || '#6366f1');
                return (
                  <div
                    key={note.id}
                    className="rounded-lg p-4 min-h-[5rem]"
                    style={{ border: `1.5px solid ${displayColor}`, backgroundColor: displayColor + '18' }}
                  >
                    <h4 className="text-sm font-semibold leading-tight truncate" style={{ color: displayColor }}>
                      {note.title}
                    </h4>
                    {note.description && (
                      <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{note.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      {note.tags.map((t) => (
                        <TagBadge key={t} tag={t} color={TAG_DEFAULT_COLORS[t]} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-white border-2 border-blue-400">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-400 flex-shrink-0 bg-blue-500">
              <span className="text-lg">🧠</span>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">StreamBrain</p>
                <p className="text-[10px] text-blue-100 leading-tight">Your viral content strategist</p>
              </div>
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="ml-auto text-[10px] text-muted hover:text-red-500 transition-colors"
                  title="Clear chat"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[11px] text-muted max-w-[220px] mx-auto">
                    Ask for ideas, feedback on your schedule, or help workshopping content.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                    {['Give me 5 stream ideas', 'Review my schedule', 'What\'s trending?', 'Help me plan a collab'].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="text-[10px] px-2 py-1 rounded-lg text-white bg-blue-400 hover:bg-blue-500 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-100 text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 text-xs text-muted bg-zinc-100">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-blue-400 bg-blue-500">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask StreamBrain..."
                  className="flex-1 text-xs bg-white border border-border-light text-foreground rounded-lg px-3 py-2 outline-none placeholder:text-muted focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-3 py-2 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(showNewForm || editingNote) && (newFormStatus === 'workshop' || (editingNote?.status === 'workshop' && (editingNote?.collabProfiles?.length ?? 0) > 0)) ? (
        <CollabEditor
          note={editingNote ?? undefined}
          onSave={handleSave as (data: Partial<ScratchNote> & { title: string; color: string; collabProfiles: CollabProfile[] }) => void}
          onCancel={() => { setShowNewForm(false); setEditingNote(null); }}
          onDelete={editingNote ? () => { deleteNote(editingNote.id); setEditingNote(null); setShowNewForm(false); } : undefined}
        />
      ) : (showNewForm || editingNote) ? (
        <NoteEditor
          note={editingNote ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowNewForm(false); setEditingNote(null); }}
          onDelete={editingNote ? () => { deleteNote(editingNote.id); setEditingNote(null); setShowNewForm(false); } : undefined}
          allNotes={notes}
        />
      ) : null}

      {showContentExport && (
        <ContentExportModal notes={notes} onClose={() => setShowContentExport(false)} />
      )}

      {showContacts && (
        <ContactsModal
          contacts={contacts}
          onAdd={addContact}
          onUpdate={updateContact}
          onDelete={deleteContact}
          onClose={() => setShowContacts(false)}
        />
      )}
    </div>
    </DndContext>
  );
}

function ContentExportModal({ notes, onClose }: { notes: ScratchNote[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<ContentColumnType>>(new Set(['idea', 'ready', 'workshop', 'used']));
  const [downloading, setDownloading] = useState(false);

  const toggle = (col: ContentColumnType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  };

  const columns: { value: ContentColumnType; label: string; emoji: string; color: string }[] = [
    { value: 'workshop', label: 'Potential Collabs', emoji: '🤝', color: '#8b5cf6' },
    { value: 'idea', label: 'Ideas', emoji: '💡', color: '#f59e0b' },
    { value: 'ready', label: 'Approved', emoji: '✅', color: '#10b981' },
    { value: 'used', label: 'Used Content', emoji: '📋', color: '#6b7280' },
  ];

  const handleDownload = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      await generateContentPDF(notes, Array.from(selected));
      onClose();
    } catch (err) {
      console.error('Content PDF export failed:', err);
    }
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-foreground">Download Content PDF</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-muted mb-4">Select which columns to include in your PDF:</p>

        <div className="space-y-2 mb-6">
          {columns.map((col) => {
            const isActive = selected.has(col.value);
            const count = notes.filter((n) => (n.status ?? 'idea') === col.value && !n.archived).length;
            return (
              <button
                key={col.value}
                onClick={() => toggle(col.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  isActive ? 'border-blue-500 bg-blue-50/50' : 'border-border-light hover:bg-zinc-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-zinc-200 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <span className="text-base">{col.emoji}</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted ml-2">({count} items)</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading || selected.size === 0}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactsModal({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  contacts: Contact[];
  onAdd: (c: Omit<Contact, 'id' | 'createdAt'>) => string;
  onUpdate: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const startNew = () => {
    setEditing({
      id: '', name: '', createdAt: '',
    });
    setIsNew(true);
  };

  const handleSave = (data: Omit<Contact, 'id' | 'createdAt'>) => {
    if (isNew) {
      onAdd(data);
    } else if (editing) {
      onUpdate(editing.id, data);
    }
    setEditing(null);
    setIsNew(false);
  };

  if (editing) {
    return (
      <ContactEditor
        contact={isNew ? undefined : editing}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setIsNew(false); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <h3 className="text-base font-bold text-foreground">Contacts</h3>
            <span className="text-[10px] text-muted bg-zinc-100 px-1.5 py-0.5 rounded-full font-medium">{contacts.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <svg width="14" height="14" fill="none" stroke="#a1a1aa" strokeWidth="2" viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-blue-400 transition-colors placeholder:text-zinc-400"
            />
          </div>
          <button
            onClick={startNew}
            className="px-3 py-2 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-3xl">👥</span>
              <p className="text-xs text-zinc-400 mt-2">{contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
                onClick={() => { setEditing(c); setIsNew(false); }}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.profilePicUrl ? (
                    <img src={c.profilePicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-blue-500">{c.name?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.role && <span className="text-[10px] text-zinc-500">{c.role}</span>}
                    {c.role && c.company && <span className="text-[10px] text-zinc-300">·</span>}
                    {c.company && <span className="text-[10px] text-zinc-500">{c.company}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.email && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">📧</span>}
                    {c.phone && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">📱</span>}
                    {c.igUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-500">IG</span>}
                    {c.twitchUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-500">Twitch</span>}
                    {c.kickUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-500">Kick</span>}
                    {c.twitterUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">X</span>}
                    {c.tiktokUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100">TT</span>}
                    {c.youtubeUrl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">YT</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditing(c); setIsNew(false); }}
                    className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-zinc-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>

                {deleteConfirm === c.id && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}>
                    <div className="bg-white rounded-xl shadow-2xl p-5 max-w-xs w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
                      <h4 className="text-sm font-bold text-foreground mb-1">Delete contact?</h4>
                      <p className="text-[11px] text-muted mb-4">"{c.name}" will be permanently deleted.</p>
                      <div className="flex gap-2">
                        <button onClick={() => { onDelete(c.id); setDeleteConfirm(null); }} className="flex-1 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-xs font-semibold text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ContactEditor({
  contact,
  onSave,
  onCancel,
}: {
  contact?: Contact;
  onSave: (data: Omit<Contact, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [role, setRole] = useState(contact?.role ?? '');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [profilePicUrl, setProfilePicUrl] = useState(contact?.profilePicUrl ?? '');
  const [twitchUrl, setTwitchUrl] = useState(contact?.twitchUrl ?? '');
  const [kickUrl, setKickUrl] = useState(contact?.kickUrl ?? '');
  const [igUrl, setIgUrl] = useState(contact?.igUrl ?? '');
  const [twitterUrl, setTwitterUrl] = useState(contact?.twitterUrl ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(contact?.tiktokUrl ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(contact?.youtubeUrl ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [showSocials, setShowSocials] = useState(
    !!(contact?.twitchUrl || contact?.kickUrl || contact?.igUrl || contact?.twitterUrl || contact?.tiktokUrl || contact?.youtubeUrl)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role: role.trim() || undefined,
      company: company.trim() || undefined,
      profilePicUrl: profilePicUrl.trim() || undefined,
      twitchUrl: twitchUrl.trim() || undefined,
      kickUrl: kickUrl.trim() || undefined,
      igUrl: igUrl.trim() || undefined,
      twitterUrl: twitterUrl.trim() || undefined,
      tiktokUrl: tiktokUrl.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const inputClass = "w-full text-xs bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition-colors placeholder:text-zinc-400";
  const labelClass = "text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-foreground">{contact ? 'Edit Contact' : 'New Contact'}</h3>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
          <div className="flex items-center gap-4 pb-2">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-blue-200">
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-400">{name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className={inputClass} />
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Manager, Creator)" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelClass}>Email</p>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
            </div>
            <div>
              <p className={labelClass}>Phone</p>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelClass}>Company</p>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company / Agency" className={inputClass} />
            </div>
            <div>
              <p className={labelClass}>Profile Pic URL</p>
              <input value={profilePicUrl} onChange={(e) => setProfilePicUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowSocials(!showSocials)}
              className="text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={`transition-transform ${showSocials ? 'rotate-90' : ''}`}>
                <path d="M9 5l7 7-7 7" />
              </svg>
              Social Links
            </button>
            {showSocials && (
              <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
                <input value={igUrl} onChange={(e) => setIgUrl(e.target.value)} placeholder="Instagram URL" className={inputClass} />
                <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="X / Twitter URL" className={inputClass} />
                <input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="TikTok URL" className={inputClass} />
                <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="YouTube URL" className={inputClass} />
                <input value={twitchUrl} onChange={(e) => setTwitchUrl(e.target.value)} placeholder="Twitch URL" className={inputClass} />
                <input value={kickUrl} onChange={(e) => setKickUrl(e.target.value)} placeholder="Kick URL" className={inputClass} />
              </div>
            )}
          </div>

          <div>
            <p className={labelClass}>Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this contact..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-2 border-t border-zinc-100">
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            {contact ? 'Save Changes' : 'Add Contact'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
