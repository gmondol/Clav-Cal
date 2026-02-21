'use client';

import { useState, useRef } from 'react';
import { ScratchNote, PRESET_TAGS, TAG_DEFAULT_COLORS } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

interface NoteEditorProps {
  note?: ScratchNote;
  onSave: (data: Partial<ScratchNote> & { title: string; color: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  allNotes?: ScratchNote[];
}

export default function NoteEditor({
  note,
  onSave,
  onCancel,
  onDelete,
  allNotes = [],
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [color, setColor] = useState(note?.color ?? '#000000');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [address, setAddress] = useState(note?.address ?? '');
  const [contactName, setContactName] = useState(note?.contactName ?? '');
  const [contactLastName, setContactLastName] = useState(note?.contactLastName ?? '');
  const [contactRole, setContactRole] = useState(note?.contactRole ?? '');
  const [contactPhone, setContactPhone] = useState(note?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(note?.contactEmail ?? '');
  const [contactNotes, setContactNotes] = useState(note?.contactNotes ?? '');
  const [attachments, setAttachments] = useState<string[]>(note?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [linkedCollabIds, setLinkedCollabIds] = useState<string[]>(note?.linkedCollabIds ?? []);
  const [preCollabTags, setPreCollabTags] = useState<string[] | null>(null);
  const [preCollabColor, setPreCollabColor] = useState<string | null>(null);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [showContact, setShowContact] = useState(!!(note?.contactName || note?.contactLastName || note?.contactRole || note?.contactPhone || note?.contactEmail || note?.contactNotes));
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('#3b82f6');
  const [showManageTags, setShowManageTags] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = note?.status ?? 'idea';
  const isApproved = status === 'ready';
  const { customTags, addCustomTag, removeCustomTag, addContact, contacts } = useStore();

  customTags.forEach((t) => { TAG_DEFAULT_COLORS[t.name] = t.color; });

  const availableCollabs = allNotes.filter(
    (n) => n.status === 'workshop' && (n.collabProfiles?.length ?? 0) > 0 && !linkedCollabIds.includes(n.id)
  );
  const linkedCollabs = allNotes.filter((n) => linkedCollabIds.includes(n.id));

  const attachCollab = (collabId: string) => {
    if (linkedCollabIds.length === 0) {
      setPreCollabTags([...tags]);
      setPreCollabColor(color);
    }
    setLinkedCollabIds((prev) => [...prev, collabId]);
    setTags(['Collab']);
    if (TAG_DEFAULT_COLORS['Collab']) setColor(TAG_DEFAULT_COLORS['Collab']);
    setShowCollabPicker(false);
  };

  const detachCollab = (collabId: string) => {
    const next = linkedCollabIds.filter((id) => id !== collabId);
    setLinkedCollabIds(next);
    if (next.length === 0) {
      setTags(preCollabTags ?? []);
      setColor(preCollabColor ?? '#000000');
      setPreCollabTags(null);
      setPreCollabColor(null);
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
      contactLastName: contactLastName.trim() || undefined,
      contactRole: contactRole.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactNotes: contactNotes.trim() || undefined,
      attachments,
      linkedCollabIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-border p-4 space-y-3 animate-scale-in shadow-lg max-h-[80vh] overflow-y-auto max-w-lg w-full relative mx-2 md:mx-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition-colors z-10"
          title="Close"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the idea?"
          className="w-full text-sm font-semibold bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-primary/30 transition-colors"
        />

        <div>
          <div className="flex flex-wrap gap-1.5 items-center">
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
              onClick={() => { setShowNewTagForm(!showNewTagForm); setShowManageTags(false); }}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors"
            >
              + New Tag
            </button>
            <button
              type="button"
              onClick={() => { setShowManageTags(!showManageTags); setShowNewTagForm(false); setEditingTag(null); }}
              className="text-[10px] px-1.5 py-0.5 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Edit / Delete tags"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
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
                autoFocus
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
          {showManageTags && (() => {
            const allTags = [
              ...PRESET_TAGS.map((name) => ({ name, color: TAG_DEFAULT_COLORS[name] ?? '#3b82f6' })),
              ...customTags.filter((ct) => !PRESET_TAGS.includes(ct.name as typeof PRESET_TAGS[number])),
            ];
            return allTags.length > 0 ? (
              <div className="mt-2 space-y-1 p-2 bg-zinc-50 rounded-lg border border-border-light">
                {allTags.map((ct) => (
                  <div key={ct.name} className="flex items-center gap-2">
                    {editingTag === ct.name ? (
                      <>
                        <input
                          type="color"
                          value={editTagColor}
                          onChange={(e) => setEditTagColor(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 p-0 flex-shrink-0"
                        />
                        <input
                          autoFocus
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="flex-1 text-[11px] bg-white border border-border-light rounded px-2 py-1 outline-none focus:border-blue-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editTagName.trim()) {
                                removeCustomTag(ct.name);
                                delete TAG_DEFAULT_COLORS[ct.name];
                                addCustomTag({ name: editTagName.trim(), color: editTagColor });
                                TAG_DEFAULT_COLORS[editTagName.trim()] = editTagColor;
                                if (tags.includes(ct.name)) setTags(tags.map((t) => t === ct.name ? editTagName.trim() : t));
                                setEditingTag(null);
                              }
                            } else if (e.key === 'Escape') {
                              setEditingTag(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editTagName.trim()) {
                              removeCustomTag(ct.name);
                              delete TAG_DEFAULT_COLORS[ct.name];
                              addCustomTag({ name: editTagName.trim(), color: editTagColor });
                              TAG_DEFAULT_COLORS[editTagName.trim()] = editTagColor;
                              if (tags.includes(ct.name)) setTags(tags.map((t) => t === ct.name ? editTagName.trim() : t));
                              setEditingTag(null);
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 text-blue-500 hover:text-blue-600 font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingTag(null)} className="text-[10px] text-zinc-400 hover:text-zinc-500 transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ct.color }} />
                        <span className="flex-1 text-[11px] font-medium" style={{ color: ct.color }}>{ct.name}</span>
                        <button
                          type="button"
                          onClick={() => { setEditingTag(ct.name); setEditTagName(ct.name); setEditTagColor(ct.color); }}
                          className="text-[10px] text-zinc-400 hover:text-blue-500 transition-colors px-1"
                          title="Edit tag"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeCustomTag(ct.name);
                            delete TAG_DEFAULT_COLORS[ct.name];
                            if (tags.includes(ct.name)) { setTags([]); setColor('#000000'); }
                          }}
                          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors px-1"
                          title="Delete tag"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>

        {linkedCollabs.length > 0 && (
          <div className="space-y-1.5">
            {linkedCollabs.map((collab) => {
              const profiles = collab.collabProfiles ?? [];
              const profileNames = profiles.map((p) => p.name).filter(Boolean).join(', ');
              return (
                <div key={collab.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-red-500 rounded-lg">
                  <div className="flex -space-x-1.5 flex-shrink-0">
                    {profiles.slice(0, 3).map((p, i) => (
                      <div key={i} className="w-5 h-5 rounded-full overflow-hidden bg-white/30 border border-white flex items-center justify-center">
                        {p.profilePicUrl ? (
                          <img src={p.profilePicUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[8px] text-white font-bold">{p.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-white truncate flex-1">{collab.title || profileNames}</span>
                  <button
                    type="button"
                    onClick={() => detachCollab(collab.id)}
                    className="text-[10px] text-white/70 hover:text-white font-medium flex-shrink-0 transition-colors flex items-center gap-0.5"
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    Detach
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          {isApproved && (
          <div className="relative flex-1">
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
          )}
        </div>

        {note && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="📝 Flesh it out... notes, format ideas, guest list, equipment needed, talking points..."
            rows={3}
            className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
          />
        )}

        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="📍 Address (optional)"
          rows={2}
          className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-primary/30"
        />

        {!showContact && contactName.trim() && (
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600">{contactName.trim()[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-800 truncate">
                {`${contactName.trim()} ${contactLastName.trim()}`.trim()}
              </p>
              {contactPhone.trim() && <p className="text-[10px] text-zinc-500 truncate">{contactPhone.trim()}</p>}
              {contactEmail.trim() && <p className="text-[10px] text-zinc-500 truncate">{contactEmail.trim()}</p>}
            </div>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-zinc-400 flex-shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <div className="flex gap-2">
          {!showContact && !contactName.trim() && (
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 py-2 border border-dashed border-blue-400 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="7" r="4" /><path d="M5.5 21v-2a6 6 0 0113 0v2" /><path d="M20 8v6M23 11h-6" />
              </svg>
              Add Point of Contact
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 py-2 border border-dashed border-blue-400 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            {uploading ? '...' : '📎'} Add Attachment
          </button>
        </div>

        {showContact && (
          <div className="space-y-2 p-3 rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">👤 Point of Contact</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!contactName.trim()}
                  onClick={() => {
                    const fullName = `${contactName.trim()} ${contactLastName.trim()}`.trim();
                    const existing = contacts.find((c) => c.name.toLowerCase() === fullName.toLowerCase());
                    if (!existing) {
                      addContact({
                        name: fullName,
                        role: contactRole.trim() || undefined,
                        phone: contactPhone.trim() || undefined,
                        email: contactEmail.trim() || undefined,
                        notes: contactNotes.trim() || undefined,
                      });
                    }
                    setShowContact(false);
                  }}
                  className="text-[10px] font-medium text-blue-500 hover:text-blue-600 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-blue-50 disabled:hover:bg-transparent"
                  title="Save to Contacts"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
                  </svg>
                  Save to Contacts
                </button>
                <button
                  type="button"
                  onClick={() => setShowContact(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Close"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="First name"
                className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
              />
              <input
                value={contactLastName}
                onChange={(e) => setContactLastName(e.target.value)}
                placeholder="Last name"
                className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
              />
              <input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="Role (e.g. Manager, Creator)"
                className="col-span-2 text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
              />
              <input
                value={contactPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let formatted = digits;
                  if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                  else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                  setContactPhone(formatted);
                }}
                placeholder="Phone"
                className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
              />
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Email"
                className="text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-400 focus:border-blue-400 transition-colors"
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
        )}

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
