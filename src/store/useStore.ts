'use client';

import { create } from 'zustand';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  ScratchNote,
  CalendarEvent,
  CalendarView,
  Contact,
  ProductionItem,
  SHOW_TYPE_TEMPLATES,
} from '@/lib/types';
import { generateId, generateWeeklySummary } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

function sbLog(label: string, res: { error: { message: string } | null }) {
  if (res.error) console.error(`[Supabase ${label}]`, res.error.message);
}

interface CustomTag {
  name: string;
  color: string;
}

interface StoreState {
  currentView: CalendarView;
  selectedDate: string;
  notes: ScratchNote[];
  events: CalendarEvent[];
  contacts: Contact[];
  productionItems: ProductionItem[];
  usedNoteIds: string[];
  customTags: CustomTag[];
  hasSeenOnboarding: boolean;
  loaded: boolean;

  setCurrentView: (view: CalendarView) => void;
  setSelectedDate: (date: string) => void;
  dismissOnboarding: () => void;

  addCustomTag: (tag: CustomTag) => void;
  removeCustomTag: (name: string) => void;

  loadFromSupabase: () => Promise<void>;

  addNote: (note: Omit<ScratchNote, 'id' | 'createdAt'>) => string;
  updateNote: (id: string, updates: Partial<ScratchNote>) => void;
  deleteNote: (id: string) => void;
  archiveNote: (id: string) => void;
  reorderNotes: (activeId: string, overId: string) => void;
  loadTemplates: () => void;

  addEvent: (event: Omit<CalendarEvent, 'id'>) => string;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  moveEvent: (id: string, newDate: string) => void;
  reorderEventsInDay: (activeId: string, overId: string) => void;

  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => string;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  addProductionItem: (item: Omit<ProductionItem, 'id' | 'createdAt'>, customId?: string) => string;
  updateProductionItem: (id: string, updates: Partial<ProductionItem>) => void;
  deleteProductionItem: (id: string) => void;

  scheduleNoteAsEvent: (noteId: string, date: string, startTime?: string) => string;
  exportWeeklySummary: () => string;
  loadSeedData: () => void;
}

const COLLAB_PREFIX = '\u0001COLLAB:';

function noteToRow(note: ScratchNote) {
  let description: string | null = note.description ?? null;
  if (note.collabProfiles && note.collabProfiles.length > 0) {
    description = COLLAB_PREFIX + JSON.stringify({ collabProfiles: note.collabProfiles, notes: note.description ?? '' });
  }
  return {
    id: note.id,
    title: note.title,
    color: note.color,
    tags: note.tags,
    created_at: note.createdAt,
    archived: note.archived,
    description,
    keep_in_scratch: note.keepInScratch ?? false,
    complexity: note.complexity ?? null,
    status: note.status ?? 'idea',
    address: note.address ?? null,
    contact: note.contact ?? null,
    contact_name: note.contactName ?? null,
    contact_last_name: note.contactLastName ?? null,
    contact_role: note.contactRole ?? null,
    contact_phone: note.contactPhone ?? null,
    contact_email: note.contactEmail ?? null,
    contact_notes: note.contactNotes ?? null,
    attachments: note.attachments ?? [],
    linked_collab_ids: note.linkedCollabIds ?? [],
  };
}

function rowToNote(row: Record<string, unknown>): ScratchNote {
  const rawDesc = (row.description as string) ?? undefined;
  let description: string | undefined;
  let collabProfiles: ScratchNote['collabProfiles'];
  if (rawDesc?.startsWith(COLLAB_PREFIX)) {
    try {
      const parsed = JSON.parse(rawDesc.slice(COLLAB_PREFIX.length)) as { collabProfiles: ScratchNote['collabProfiles']; notes: string };
      collabProfiles = parsed.collabProfiles;
      description = parsed.notes || undefined;
    } catch {
      description = rawDesc;
    }
  } else {
    description = rawDesc;
  }
  return {
    id: row.id as string,
    title: row.title as string,
    color: row.color as string,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.created_at as string,
    archived: row.archived as boolean,
    description,
    collabProfiles,
    keepInScratch: (row.keep_in_scratch as boolean) ?? undefined,
    complexity: (row.complexity as ScratchNote['complexity']) ?? undefined,
    status: (row.status as ScratchNote['status']) ?? 'idea',
    address: (row.address as string) ?? undefined,
    contact: (row.contact as string) ?? undefined,
    contactName: (row.contact_name as string) ?? undefined,
    contactLastName: (row.contact_last_name as string) ?? undefined,
    contactRole: (row.contact_role as string) ?? undefined,
    contactPhone: (row.contact_phone as string) ?? undefined,
    contactEmail: (row.contact_email as string) ?? undefined,
    contactNotes: (row.contact_notes as string) ?? undefined,
    attachments: (row.attachments as string[]) ?? [],
    linkedCollabIds: (row.linked_collab_ids as string[]) ?? [],
  };
}

function eventToRow(event: CalendarEvent) {
  return {
    id: event.id,
    date: event.date,
    start_time: event.startTime,
    end_time: event.endTime,
    title: event.title,
    color: event.color,
    address: event.address ?? null,
    contact: event.contact ?? null,
    contact_name: event.contactName ?? null,
    contact_last_name: event.contactLastName ?? null,
    contact_role: event.contactRole ?? null,
    contact_phone: event.contactPhone ?? null,
    contact_email: event.contactEmail ?? null,
    contact_notes: event.contactNotes ?? null,
    description: event.description ?? null,
    tags: event.tags,
    complexity: event.complexity ?? null,
    from_note_id: event.fromNoteId ?? null,
    confirmed: event.confirmed ?? false,
    attachments: event.attachments ?? [],
  };
}

function rowToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    title: row.title as string,
    color: row.color as string,
    address: (row.address as string) ?? undefined,
    contact: (row.contact as string) ?? undefined,
    contactName: (row.contact_name as string) ?? undefined,
    contactLastName: (row.contact_last_name as string) ?? undefined,
    contactRole: (row.contact_role as string) ?? undefined,
    contactPhone: (row.contact_phone as string) ?? undefined,
    contactEmail: (row.contact_email as string) ?? undefined,
    contactNotes: (row.contact_notes as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    complexity: (row.complexity as CalendarEvent['complexity']) ?? undefined,
    fromNoteId: (row.from_note_id as string) ?? undefined,
    confirmed: (row.confirmed as boolean) ?? false,
    attachments: (row.attachments as string[]) ?? [],
  };
}

function contactToRow(c: Contact) {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    role: c.role ?? null,
    company: c.company ?? null,
    profile_pic_url: c.profilePicUrl ?? null,
    twitch_url: c.twitchUrl ?? null,
    twitch_followers: c.twitchFollowers ?? null,
    kick_url: c.kickUrl ?? null,
    kick_followers: c.kickFollowers ?? null,
    ig_url: c.igUrl ?? null,
    ig_followers: c.igFollowers ?? null,
    twitter_url: c.twitterUrl ?? null,
    twitter_followers: c.twitterFollowers ?? null,
    tiktok_url: c.tiktokUrl ?? null,
    tiktok_followers: c.tiktokFollowers ?? null,
    youtube_url: c.youtubeUrl ?? null,
    youtube_followers: c.youtubeFollowers ?? null,
    notes: c.notes ?? null,
    created_at: c.createdAt,
  };
}

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    role: (row.role as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    profilePicUrl: (row.profile_pic_url as string) ?? undefined,
    twitchUrl: (row.twitch_url as string) ?? undefined,
    twitchFollowers: (row.twitch_followers as string) ?? undefined,
    kickUrl: (row.kick_url as string) ?? undefined,
    kickFollowers: (row.kick_followers as string) ?? undefined,
    igUrl: (row.ig_url as string) ?? undefined,
    igFollowers: (row.ig_followers as string) ?? undefined,
    twitterUrl: (row.twitter_url as string) ?? undefined,
    twitterFollowers: (row.twitter_followers as string) ?? undefined,
    tiktokUrl: (row.tiktok_url as string) ?? undefined,
    tiktokFollowers: (row.tiktok_followers as string) ?? undefined,
    youtubeUrl: (row.youtube_url as string) ?? undefined,
    youtubeFollowers: (row.youtube_followers as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function itemToRow(item: ProductionItem) {
  return {
    id: item.id,
    parent_id: item.parentId,
    title: item.title,
    item_type: item.itemType,
    icon: item.icon,
    color: item.color,
    content: JSON.stringify(item.content),
    sort_order: item.sortOrder,
    created_at: item.createdAt,
  };
}

function rowToItem(row: Record<string, unknown>): ProductionItem {
  let content: Record<string, unknown> = {};
  try {
    const raw = row.content;
    content = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>) ?? {};
  } catch { /* empty */ }
  return {
    id: row.id as string,
    parentId: (row.parent_id as string) ?? null,
    title: row.title as string,
    itemType: (row.item_type as ProductionItem['itemType']) ?? 'note',
    icon: (row.icon as string) ?? '📄',
    color: (row.color as string) ?? '#3b82f6',
    content,
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export const useStore = create<StoreState>()(
  (set, get) => ({
    currentView: (() => { if (typeof window === 'undefined') return 'month' as const; try { const v = localStorage.getItem('clav-calendar-view'); return (v === 'month' || v === 'week') ? v : 'month'; } catch { return 'month' as const; } })(),
    selectedDate: (() => { if (typeof window === 'undefined') return format(new Date(), 'yyyy-MM-dd'); try { return localStorage.getItem('clav-calendar-date') || format(new Date(), 'yyyy-MM-dd'); } catch { return format(new Date(), 'yyyy-MM-dd'); } })(),
    notes: [],
    events: [],
    contacts: [],
    productionItems: [],
    usedNoteIds: [],
    customTags: [],
    hasSeenOnboarding: true,
    loaded: false,

    setCurrentView: (view) => { set({ currentView: view }); try { localStorage.setItem('clav-calendar-view', view); } catch {} },
    setSelectedDate: (date) => { set({ selectedDate: date }); try { localStorage.setItem('clav-calendar-date', date); } catch {} },
    dismissOnboarding: () => set({ hasSeenOnboarding: true }),

    addCustomTag: (tag) => {
      const next = [...get().customTags.filter((t) => t.name !== tag.name), tag];
      set({ customTags: next });
      supabase.from('custom_tags').upsert({ name: tag.name, color: tag.color }).then((r) => sbLog('upsert custom_tag', r));
    },
    removeCustomTag: (name) => {
      const next = get().customTags.filter((t) => t.name !== name);
      set({ customTags: next });
      supabase.from('custom_tags').delete().eq('name', name).then((r) => sbLog('delete custom_tag', r));
    },

    loadFromSupabase: async () => {
      const [notesRes, eventsRes, contactsRes, itemsRes, tagsRes] = await Promise.all([
        supabase.from('notes').select('*').order('sort_order', { ascending: true }),
        supabase.from('events').select('*'),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('production_items').select('*').order('sort_order', { ascending: true }),
        supabase.from('custom_tags').select('*'),
      ]);
      const notes = (notesRes.data ?? []).map(rowToNote);
      const events = (eventsRes.data ?? []).map(rowToEvent);
      const contacts = (contactsRes.data ?? []).map(rowToContact);
      const productionItems = (itemsRes.data ?? []).map(rowToItem);
      const customTags: CustomTag[] = (tagsRes.data ?? []).map((r: Record<string, unknown>) => ({ name: r.name as string, color: r.color as string }));
      if (itemsRes.error) console.warn('[Supabase production_items]', itemsRes.error.message, '— run the production_items migration SQL');
      if (tagsRes.error) console.warn('[Supabase custom_tags]', tagsRes.error.message, '— run the custom_tags migration SQL');
      const calendarState: Record<string, unknown> = {};
      try {
        const savedView = localStorage.getItem('clav-calendar-view');
        if (savedView === 'month' || savedView === 'week') calendarState.currentView = savedView;
        const savedDate = localStorage.getItem('clav-calendar-date');
        if (savedDate) calendarState.selectedDate = savedDate;
      } catch { /* SSR or localStorage unavailable */ }
      set({ notes, events, contacts, productionItems, customTags, loaded: true, ...calendarState });
    },

    addNote: (note) => {
      const id = generateId();
      const full: ScratchNote = { ...note, id, createdAt: new Date().toISOString() };
      set((s) => ({ notes: [full, ...s.notes] }));
      supabase.from('notes').insert(noteToRow(full)).then((r) => sbLog('insert note', r));
      return id;
    },

    updateNote: (id, updates) => {
      const merged = get().notes.find((n) => n.id === id);
      const next = merged ? { ...merged, ...updates } : null;
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? (next ?? { ...n, ...updates }) : n)),
      }));
      const row: Record<string, unknown> = {};
      if (updates.title !== undefined) row.title = updates.title;
      if (updates.color !== undefined) row.color = updates.color;
      if (updates.tags !== undefined) row.tags = updates.tags;
      if (updates.archived !== undefined) row.archived = updates.archived;
      if (updates.keepInScratch !== undefined) row.keep_in_scratch = updates.keepInScratch;
      if (updates.complexity !== undefined) row.complexity = updates.complexity;
      if (updates.status !== undefined) row.status = updates.status;
      if (updates.description !== undefined || updates.collabProfiles !== undefined) {
        const note = next ?? merged;
        const profiles = updates.collabProfiles ?? note?.collabProfiles;
        const notes = updates.description !== undefined ? updates.description : (note?.description ?? '');
        row.description = profiles && profiles.length > 0
          ? COLLAB_PREFIX + JSON.stringify({ collabProfiles: profiles, notes })
          : (notes || null);
      }
      if (updates.address !== undefined) row.address = updates.address || null;
      if (updates.contact !== undefined) row.contact = updates.contact || null;
      if (updates.contactName !== undefined) row.contact_name = updates.contactName || null;
      if (updates.contactLastName !== undefined) row.contact_last_name = updates.contactLastName || null;
      if (updates.contactRole !== undefined) row.contact_role = updates.contactRole || null;
      if (updates.contactPhone !== undefined) row.contact_phone = updates.contactPhone || null;
      if (updates.contactEmail !== undefined) row.contact_email = updates.contactEmail || null;
      if (updates.contactNotes !== undefined) row.contact_notes = updates.contactNotes || null;
      if (updates.attachments !== undefined) row.attachments = updates.attachments;
      if (updates.linkedCollabIds !== undefined) row.linked_collab_ids = updates.linkedCollabIds;
      if (Object.keys(row).length > 0) {
        supabase.from('notes').update(row).eq('id', id).then((r) => sbLog('update note', r));
      }
    },

    deleteNote: (id) => {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      supabase.from('notes').delete().eq('id', id).then((r) => sbLog('delete note', r));
    },

    archiveNote: (id) => {
      const note = get().notes.find((n) => n.id === id);
      if (!note) return;
      const newArchived = !note.archived;
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, archived: newArchived } : n)),
      }));
      supabase.from('notes').update({ archived: newArchived }).eq('id', id).then((r) => sbLog('archive note', r));
    },

    reorderNotes: (activeId, overId) =>
      set((s) => {
        const notes = [...s.notes];
        const oldIndex = notes.findIndex((n) => n.id === activeId);
        const newIndex = notes.findIndex((n) => n.id === overId);
        if (oldIndex === -1 || newIndex === -1) return s;
        const [item] = notes.splice(oldIndex, 1);
        notes.splice(newIndex, 0, item);
        notes.forEach((n, i) => {
          supabase.from('notes').update({ sort_order: i }).eq('id', n.id).then((r) => sbLog('reorder note', r));
        });
        return { notes };
      }),

    loadTemplates: () => {
      const existing = get().notes;
      const newNotes = SHOW_TYPE_TEMPLATES.filter(
        (t) => !existing.some((n) => n.title === t.title && !n.archived)
      ).map((t) => ({
        ...t,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }));
      if (newNotes.length > 0) {
        set((s) => ({ notes: [...newNotes, ...s.notes] }));
        newNotes.forEach((n) => {
          supabase.from('notes').insert(noteToRow(n)).then((r) => sbLog('insert template', r));
        });
      }
    },

    addEvent: (event) => {
      const id = generateId();
      const full: CalendarEvent = { ...event, id };
      set((s) => ({ events: [...s.events, full] }));
      supabase.from('events').insert(eventToRow(full)).then((r) => sbLog('insert event', r));
      return id;
    },

    updateEvent: (id, updates) => {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      const row: Record<string, unknown> = {};
      if (updates.date !== undefined) row.date = updates.date;
      if (updates.startTime !== undefined) row.start_time = updates.startTime;
      if (updates.endTime !== undefined) row.end_time = updates.endTime;
      if (updates.title !== undefined) row.title = updates.title;
      if (updates.color !== undefined) row.color = updates.color;
      if (updates.address !== undefined) row.address = updates.address;
      if (updates.contact !== undefined) row.contact = updates.contact;
      if (updates.contactName !== undefined) row.contact_name = updates.contactName;
      if (updates.contactLastName !== undefined) row.contact_last_name = updates.contactLastName;
      if (updates.contactRole !== undefined) row.contact_role = updates.contactRole;
      if (updates.contactPhone !== undefined) row.contact_phone = updates.contactPhone;
      if (updates.contactEmail !== undefined) row.contact_email = updates.contactEmail;
      if (updates.contactNotes !== undefined) row.contact_notes = updates.contactNotes;
      if (updates.description !== undefined) row.description = updates.description;
      if (updates.tags !== undefined) row.tags = updates.tags;
      if (updates.complexity !== undefined) row.complexity = updates.complexity;
      if (updates.confirmed !== undefined) row.confirmed = updates.confirmed;
      if (updates.attachments !== undefined) row.attachments = updates.attachments;
      if (Object.keys(row).length > 0) {
        supabase.from('events').update(row).eq('id', id).then((r) => sbLog('update event', r));
      }
    },

    deleteEvent: (id) => {
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      supabase.from('events').delete().eq('id', id).then((r) => sbLog('delete event', r));
    },

    moveEvent: (id, newDate) => {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, date: newDate } : e)),
      }));
      supabase.from('events').update({ date: newDate }).eq('id', id).then((r) => sbLog('move event', r));
    },

    reorderEventsInDay: (activeId, overId) =>
      set((s) => {
        const events = [...s.events];
        const activeEvent = events.find((e) => e.id === activeId);
        const overEvent = events.find((e) => e.id === overId);
        if (!activeEvent || !overEvent || activeEvent.date !== overEvent.date) return s;
        const swapTime = { startTime: activeEvent.startTime, endTime: activeEvent.endTime };
        const newEvents = events.map((e) => {
          if (e.id === activeId) return { ...e, startTime: overEvent.startTime, endTime: overEvent.endTime };
          if (e.id === overId) return { ...e, startTime: swapTime.startTime, endTime: swapTime.endTime };
          return e;
        });
        supabase.from('events').update({ start_time: overEvent.startTime, end_time: overEvent.endTime }).eq('id', activeId).then((r) => sbLog('swap event', r));
        supabase.from('events').update({ start_time: swapTime.startTime, end_time: swapTime.endTime }).eq('id', overId).then((r) => sbLog('swap event', r));
        return { events: newEvents };
      }),

    addContact: (contact) => {
      const id = generateId();
      const full: Contact = { ...contact, id, createdAt: new Date().toISOString() };
      set((s) => ({ contacts: [full, ...s.contacts] }));
      supabase.from('contacts').insert(contactToRow(full)).then((r) => sbLog('insert contact', r));
      return id;
    },

    updateContact: (id, updates) => {
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
      const row: Record<string, unknown> = {};
      if (updates.name !== undefined) row.name = updates.name;
      if (updates.email !== undefined) row.email = updates.email || null;
      if (updates.phone !== undefined) row.phone = updates.phone || null;
      if (updates.role !== undefined) row.role = updates.role || null;
      if (updates.company !== undefined) row.company = updates.company || null;
      if (updates.profilePicUrl !== undefined) row.profile_pic_url = updates.profilePicUrl || null;
      if (updates.twitchUrl !== undefined) row.twitch_url = updates.twitchUrl || null;
      if (updates.twitchFollowers !== undefined) row.twitch_followers = updates.twitchFollowers || null;
      if (updates.kickUrl !== undefined) row.kick_url = updates.kickUrl || null;
      if (updates.kickFollowers !== undefined) row.kick_followers = updates.kickFollowers || null;
      if (updates.igUrl !== undefined) row.ig_url = updates.igUrl || null;
      if (updates.igFollowers !== undefined) row.ig_followers = updates.igFollowers || null;
      if (updates.twitterUrl !== undefined) row.twitter_url = updates.twitterUrl || null;
      if (updates.twitterFollowers !== undefined) row.twitter_followers = updates.twitterFollowers || null;
      if (updates.tiktokUrl !== undefined) row.tiktok_url = updates.tiktokUrl || null;
      if (updates.tiktokFollowers !== undefined) row.tiktok_followers = updates.tiktokFollowers || null;
      if (updates.youtubeUrl !== undefined) row.youtube_url = updates.youtubeUrl || null;
      if (updates.youtubeFollowers !== undefined) row.youtube_followers = updates.youtubeFollowers || null;
      if (updates.notes !== undefined) row.notes = updates.notes || null;
      if (Object.keys(row).length > 0) {
        supabase.from('contacts').update(row).eq('id', id).then((r) => sbLog('update contact', r));
      }
    },

    deleteContact: (id) => {
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
      supabase.from('contacts').delete().eq('id', id).then((r) => sbLog('delete contact', r));
    },

    addProductionItem: (item, customId) => {
      const id = customId ?? generateId();
      const full: ProductionItem = { ...item, id, createdAt: new Date().toISOString() };
      set((s) => ({ productionItems: [...s.productionItems, full] }));
      supabase.from('production_items').insert(itemToRow(full)).then((r) => sbLog('insert production_item', r));
      return id;
    },

    updateProductionItem: (id, updates) => {
      set((s) => ({
        productionItems: s.productionItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      }));
      const row: Record<string, unknown> = {};
      if (updates.title !== undefined) row.title = updates.title;
      if (updates.parentId !== undefined) row.parent_id = updates.parentId;
      if (updates.itemType !== undefined) row.item_type = updates.itemType;
      if (updates.icon !== undefined) row.icon = updates.icon;
      if (updates.color !== undefined) row.color = updates.color;
      if (updates.content !== undefined) row.content = JSON.stringify(updates.content);
      if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
      if (Object.keys(row).length > 0) {
        supabase.from('production_items').update(row).eq('id', id).then((r) => sbLog('update production_item', r));
      }
    },

    deleteProductionItem: (id) => {
      const collectIds = (parentId: string): string[] => {
        const children = get().productionItems.filter((i) => i.parentId === parentId);
        return [parentId, ...children.flatMap((c) => collectIds(c.id))];
      };
      const toDelete = new Set(collectIds(id));
      set((s) => ({ productionItems: s.productionItems.filter((i) => !toDelete.has(i.id)) }));
      supabase.from('production_items').delete().eq('id', id).then((r) => sbLog('delete production_item', r));
    },

    scheduleNoteAsEvent: (noteId, date, startTime = '10:00') => {
      const note = get().notes.find((n) => n.id === noteId);
      if (!note) return '';
      const eventId = generateId();
      const event: CalendarEvent = {
        id: eventId,
        date,
        startTime,
        endTime: `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:${startTime.split(':')[1]}`,
        title: note.title,
        color: note.color,
        address: note.address,
        contact: note.contact,
        contactName: note.contactName,
        contactPhone: note.contactPhone,
        contactEmail: note.contactEmail,
        contactNotes: note.contactNotes,
        description: note.description,
        tags: [...note.tags],
        complexity: note.complexity,
        attachments: note.attachments ?? [],
        fromNoteId: noteId,
      };
      set((s) => ({
        events: [...s.events, event],
        usedNoteIds: s.usedNoteIds.includes(noteId) ? s.usedNoteIds : [...s.usedNoteIds, noteId],
        notes: s.notes.map((n) => n.id === noteId ? { ...n, status: 'used' as const } : n),
      }));
      supabase.from('events').insert(eventToRow(event)).then((r) => sbLog('schedule event', r));
      supabase.from('notes').update({ status: 'used' }).eq('id', noteId).then((r) => sbLog('mark note used', r));
      return eventId;
    },

    exportWeeklySummary: () => {
      const { events, selectedDate } = get();
      const date = new Date(selectedDate + 'T00:00:00');
      const ws = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const we = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      return generateWeeklySummary(events, ws, we);
    },

    loadSeedData: () => {},
  })
);
