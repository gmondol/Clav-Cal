export type Complexity = 'low' | 'medium' | 'high';
export type CalendarView = 'month' | 'week';
export type NoteStatus = 'idea' | 'workshop' | 'ready';

export const NOTE_STATUSES: { value: NoteStatus; label: string; emoji: string; color: string }[] = [
  { value: 'idea', label: 'Idea', emoji: '💡', color: '#f59e0b' },
  { value: 'ready', label: 'Approved', emoji: '✅', color: '#10b981' },
  { value: 'workshop', label: 'Potential Collabs', emoji: '🤝', color: '#8b5cf6' },
];

export const PRESET_TAGS = [
  'Desktop',
  'IRL',
  'Collab',
  'Sponsorship',
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

export interface CollabProfile {
  name: string;
  profilePicUrl?: string;
  twitchUrl?: string;
  twitchFollowers?: string;
  kickUrl?: string;
  kickFollowers?: string;
  igUrl?: string;
  igFollowers?: string;
  twitterUrl?: string;
  twitterFollowers?: string;
  tiktokUrl?: string;
  tiktokFollowers?: string;
  notes?: string;
}

export interface ScratchNote {
  id: string;
  title: string;
  color: string;
  tags: string[];
  createdAt: string;
  archived: boolean;
  description?: string;
  keepInScratch?: boolean;
  complexity?: Complexity;
  status?: NoteStatus;
  collabProfiles?: CollabProfile[];
  address?: string;
  attachments?: string[];
}

export interface CalendarEvent {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  address?: string;
  contact?: string;
  description?: string;
  tags: string[];
  complexity?: Complexity;
  fromNoteId?: string;
  confirmed?: boolean;
  attachments?: string[];
}


export const COLOR_PALETTE = [
  { name: 'Rose', value: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
  { name: 'Orange', value: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  { name: 'Amber', value: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { name: 'Emerald', value: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { name: 'Teal', value: '#14b8a6', bg: '#f0fdfa', border: '#99f6e4' },
  { name: 'Cyan', value: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  { name: 'Blue', value: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { name: 'Indigo', value: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { name: 'Violet', value: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { name: 'Pink', value: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
] as const;

export const SHOW_TYPE_TEMPLATES: Omit<ScratchNote, 'id' | 'createdAt'>[] = [];

export const TAG_DEFAULT_COLORS: Record<string, string> = {
  Desktop: '#8b5cf6',
  IRL: '#3b82f6',
  Collab: '#f43f5e',
  Sponsorship: '#10b981',
};

export const COMPLEXITY_CONFIG: Record<Complexity, { label: string; icon: string; color: string }> = {
  low: { label: 'Low', icon: '●', color: '#10b981' },
  medium: { label: 'Med', icon: '●●', color: '#f59e0b' },
  high: { label: 'High', icon: '●●●', color: '#f43f5e' },
};
