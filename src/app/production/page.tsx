'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', accent: 'Clav', rest: 'StreamSchedule' },
  { href: '/content', accent: 'Content', rest: 'Workshop' },
  { href: '/production', accent: 'Production', rest: 'Hub' },
] as const;

type TaskStatus = 'todo' | 'in_progress' | 'done';
type BlockType = 'checklist' | 'notes' | 'options' | 'gallery';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface OptionItem {
  id: string;
  label: string;
  detail?: string;
  selected?: boolean;
}

interface TaskBlock {
  id: string;
  type: BlockType;
  title: string;
  checklist?: ChecklistItem[];
  notes?: string;
  options?: OptionItem[];
  images?: string[];
}

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  blocks: TaskBlock[];
  notes: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; emoji: string; bg: string }> = {
  todo: { label: 'To Do', emoji: '📋', bg: 'bg-zinc-50' },
  in_progress: { label: 'In Progress', emoji: '🔨', bg: 'bg-blue-50' },
  done: { label: 'Done', emoji: '✅', bg: 'bg-green-50' },
};

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#000000'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('clav-tasks') || '[]'); } catch { return []; }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem('clav-tasks', JSON.stringify(tasks));
}

function TaskEditor({
  task,
  onSave,
  onCancel,
  onDelete,
}: {
  task?: Task;
  onSave: (t: Task) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [color, setColor] = useState(task?.color ?? '#3b82f6');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [blocks, setBlocks] = useState<TaskBlock[]>(task?.blocks ?? []);
  const [showAddBlock, setShowAddBlock] = useState(false);

  const addBlock = (type: BlockType) => {
    const block: TaskBlock = {
      id: uid(),
      type,
      title: type === 'checklist' ? 'Checklist' : type === 'notes' ? 'Notes' : type === 'options' ? 'Options' : 'Gallery',
      ...(type === 'checklist' ? { checklist: [] } : {}),
      ...(type === 'notes' ? { notes: '' } : {}),
      ...(type === 'options' ? { options: [] } : {}),
      ...(type === 'gallery' ? { images: [] } : {}),
    };
    setBlocks((prev) => [...prev, block]);
    setShowAddBlock(false);
  };

  const updateBlock = (blockId: string, updates: Partial<TaskBlock>) => {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, ...updates } : b));
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: task?.id ?? uid(),
      title: title.trim(),
      status: task?.status ?? 'todo',
      color,
      blocks,
      notes: notes.trim(),
      createdAt: task?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in mx-2 md:mx-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-light flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider">{task ? 'Edit Task' : 'New Task'}</h3>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name"
            className="w-full text-sm font-semibold bg-transparent border-b border-border-light pb-1 outline-none placeholder:text-zinc-300 focus:border-blue-400 transition-colors"
          />

          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full transition-transform"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : 'none', transform: color === c ? 'scale(1.15)' : 'scale(1)' }}
              />
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
            rows={2}
            className="w-full text-xs bg-zinc-50 rounded-md border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-blue-400"
          />

          {blocks.map((block) => (
            <div key={block.id} className="rounded-lg border border-border-light bg-zinc-50/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100/80">
                <input
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  className="text-[11px] font-semibold uppercase tracking-wide bg-transparent outline-none flex-1 text-zinc-600"
                />
                <button type="button" onClick={() => removeBlock(block.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-0.5">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-2.5">
                {block.type === 'checklist' && (
                  <ChecklistEditor
                    items={block.checklist ?? []}
                    onChange={(items) => updateBlock(block.id, { checklist: items })}
                  />
                )}
                {block.type === 'notes' && (
                  <textarea
                    value={block.notes ?? ''}
                    onChange={(e) => updateBlock(block.id, { notes: e.target.value })}
                    placeholder="Write notes here..."
                    rows={3}
                    className="w-full text-xs bg-white rounded border border-border-light p-2 outline-none resize-none placeholder:text-zinc-300 focus:border-blue-400"
                  />
                )}
                {block.type === 'options' && (
                  <OptionsEditor
                    items={block.options ?? []}
                    onChange={(items) => updateBlock(block.id, { options: items })}
                  />
                )}
                {block.type === 'gallery' && (
                  <GalleryEditor
                    images={block.images ?? []}
                    onChange={(images) => updateBlock(block.id, { images })}
                  />
                )}
              </div>
            </div>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddBlock(!showAddBlock)}
              className="w-full text-[11px] py-2 border border-dashed border-blue-400 rounded-lg text-blue-500 hover:bg-blue-50 hover:border-blue-500 font-medium transition-colors"
            >
              + Add Block
            </button>
            {showAddBlock && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border-light rounded-lg shadow-lg z-10 py-1">
                {([
                  { type: 'checklist' as BlockType, label: 'Checklist', icon: '☑️' },
                  { type: 'notes' as BlockType, label: 'Notes', icon: '📝' },
                  { type: 'options' as BlockType, label: 'Options Board', icon: '🗂️' },
                  { type: 'gallery' as BlockType, label: 'Image Gallery', icon: '🖼️' },
                ]).map(({ type, label, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 transition-colors flex items-center gap-2"
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border-light flex items-center justify-between">
          <div>
            {onDelete && (
              <button type="button" onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors">
                Delete Task
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim()} className="px-4 py-1.5 text-xs bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors">
              {task ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ChecklistEditor({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [newItem, setNewItem] = useState('');

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => onChange(items.map((i) => i.id === item.id ? { ...i, done: !i.done } : i))}
            className="rounded border-zinc-300 text-blue-500 cursor-pointer"
          />
          <span className={`flex-1 text-xs ${item.done ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{item.text}</span>
          <button
            type="button"
            onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
          className="flex-1 text-xs bg-white border border-border-light rounded px-2 py-1 outline-none placeholder:text-zinc-300 focus:border-blue-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim()) {
              e.preventDefault();
              onChange([...items, { id: uid(), text: newItem.trim(), done: false }]);
              setNewItem('');
            }
          }}
        />
      </div>
    </div>
  );
}

function OptionsEditor({ items, onChange }: { items: OptionItem[]; onChange: (items: OptionItem[]) => void }) {
  const [newLabel, setNewLabel] = useState('');

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group p-1.5 rounded-md hover:bg-white transition-colors">
          <button
            type="button"
            onClick={() => onChange(items.map((i) => i.id === item.id ? { ...i, selected: !i.selected } : i))}
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${item.selected ? 'bg-blue-500 border-blue-500' : 'border-zinc-300'}`}
          />
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-medium ${item.selected ? 'text-blue-600' : 'text-zinc-700'}`}>{item.label}</span>
            {item.detail && <p className="text-[10px] text-zinc-400 truncate">{item.detail}</p>}
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add option..."
          className="flex-1 text-xs bg-white border border-border-light rounded px-2 py-1 outline-none placeholder:text-zinc-300 focus:border-blue-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newLabel.trim()) {
              e.preventDefault();
              onChange([...items, { id: uid(), label: newLabel.trim() }]);
              setNewLabel('');
            }
          }}
        />
      </div>
    </div>
  );
}

function GalleryEditor({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [newUrl, setNewUrl] = useState('');

  return (
    <div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {images.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-zinc-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste image URL..."
          className="flex-1 text-xs bg-white border border-border-light rounded px-2 py-1 outline-none placeholder:text-zinc-300 focus:border-blue-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newUrl.trim()) {
              e.preventDefault();
              onChange([...images, newUrl.trim()]);
              setNewUrl('');
            }
          }}
        />
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onStatusChange,
}: {
  task: Task;
  onEdit: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const completedCount = task.blocks.reduce((acc, b) => {
    if (b.type === 'checklist' && b.checklist) return acc + b.checklist.filter((i) => i.done).length;
    return acc;
  }, 0);
  const totalCount = task.blocks.reduce((acc, b) => {
    if (b.type === 'checklist' && b.checklist) return acc + b.checklist.length;
    return acc;
  }, 0);

  return (
    <div
      onClick={onEdit}
      className="rounded-lg p-3 cursor-pointer group hover:shadow-sm transition-shadow"
      style={{ border: `1.5px solid ${task.color}`, backgroundColor: task.color + '10' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold leading-tight" style={{ color: task.color }}>{task.title}</h4>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {task.status !== 'done' && (
            <button
              onClick={() => onStatusChange(task.status === 'todo' ? 'in_progress' : 'done')}
              className="p-1 rounded hover:bg-white/80 text-zinc-400 hover:text-green-600 transition-colors"
              title={task.status === 'todo' ? 'Start' : 'Complete'}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {task.status === 'todo' ? <path d="M5 12h14M12 5l7 7-7 7" /> : <path d="M20 6L9 17l-5-5" />}
              </svg>
            </button>
          )}
          {task.status === 'done' && (
            <button
              onClick={() => onStatusChange('todo')}
              className="p-1 rounded hover:bg-white/80 text-zinc-400 hover:text-orange-500 transition-colors"
              title="Reopen"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
            </button>
          )}
        </div>
      </div>
      {task.notes && <p className="text-[10px] text-zinc-500 leading-snug mb-1.5 line-clamp-2">{task.notes}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {totalCount > 0 && (
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            {completedCount}/{totalCount}
          </span>
        )}
        {task.blocks.length > 0 && (
          <span className="text-[10px] text-zinc-400">
            {task.blocks.length} block{task.blocks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Task | null | 'new'>(null);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => { setTasks(loadTasks()); }, []);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveTask = useCallback((task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      const next = exists ? prev.map((t) => t.id === task.id ? task : t) : [...prev, task];
      saveTasks(next);
      return next;
    });
    setEditing(null);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTasks(next);
      return next;
    });
    setEditing(null);
  }, []);

  const changeStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, status } : t);
      saveTasks(next);
      return next;
    });
  }, []);

  const columns: TaskStatus[] = ['todo', 'in_progress', 'done'];

  return (
    <div className="h-screen flex flex-col" style={{ background: '#e8e8eb' }}>
      <header className="relative flex items-center px-3 md:px-6 py-2 md:py-3 bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <a href="/" className="overflow-hidden flex items-center justify-center flex-shrink-0 w-[60px] h-[32px] md:w-[116px] md:h-[61px]" title="Back to Calendar">
          <img src="/Favicon.png" alt="Clav Cal" className="h-auto scale-125 translate-y-1 w-[84px] md:w-[162px]" />
        </a>

        <div ref={navRef} className="absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setNavOpen((o) => !o)}
            className="flex items-center gap-1 text-base md:text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            <span className="text-blue-500">Production</span> Hub
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
      </header>

      <div className="flex-1 overflow-x-auto md:overflow-hidden flex gap-4 p-2 md:p-4">
        {columns.map((status) => {
          const col = STATUS_CONFIG[status];
          const colTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="flex-1 flex flex-col min-w-[260px] md:min-w-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-base">{col.emoji}</span>
                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest">{col.label}</h2>
                <span className="text-[10px] font-semibold text-white bg-blue-500 rounded-full px-1.5 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <div className={`flex-1 overflow-y-auto space-y-2 ${col.bg} rounded-xl p-3 border border-border-light`}>
                {status === 'todo' && (
                  <button
                    onClick={() => setEditing('new')}
                    className="w-full py-3 border-2 border-dashed border-blue-400 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-colors"
                  >
                    + NEW TASK
                  </button>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditing(task)}
                    onStatusChange={(s) => changeStatus(task.id, s)}
                  />
                ))}
                {colTasks.length === 0 && status !== 'todo' && (
                  <p className="text-[11px] text-zinc-400 text-center py-6">No tasks here yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <TaskEditor
          task={editing === 'new' ? undefined : editing}
          onSave={saveTask}
          onCancel={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => deleteTask((editing as Task).id) : undefined}
        />
      )}
    </div>
  );
}
