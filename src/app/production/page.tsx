'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { ProductionItem, ProductionItemType } from '@/lib/types';

const NAV_ITEMS = [
  { href: '/', accent: 'Clav', rest: 'StreamSchedule' },
  { href: '/content', accent: 'Content', rest: 'Workshop' },
  { href: '/production', accent: 'Production', rest: 'Hub' },
] as const;

const TYPE_META: Record<ProductionItemType, { label: string; defaultIcon: string }> = {
  folder:    { label: 'Folder',    defaultIcon: '📁' },
  note:      { label: 'Note',      defaultIcon: '📄' },
  checklist: { label: 'Checklist', defaultIcon: '✅' },
  sheet:     { label: 'Sheet',     defaultIcon: '📊' },
  gallery:   { label: 'Gallery',   defaultIcon: '🖼️' },
};

const ITEM_COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ━━━ Breadcrumb Path Builder ━━━ */
function buildPath(items: ProductionItem[], folderId: string | null): { id: string | null; title: string }[] {
  const crumbs: { id: string | null; title: string }[] = [{ id: null, title: 'Home' }];
  if (!folderId) return crumbs;
  const chain: ProductionItem[] = [];
  let cur: string | null = folderId;
  while (cur) {
    const item = items.find((i) => i.id === cur);
    if (!item) break;
    chain.unshift(item);
    cur = item.parentId;
  }
  return [...crumbs, ...chain.map((i) => ({ id: i.id, title: i.title }))];
}

/* ━━━ Note Editor ━━━ */
function NoteContent({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [text, setText] = useState((content.text as string) ?? '');
  const handleChange = (val: string) => { setText(val); onChange({ text: val }); };
  return (
    <textarea
      autoFocus
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Start writing..."
      className="w-full flex-1 p-6 text-sm leading-relaxed resize-none outline-none bg-transparent font-[inherit]"
    />
  );
}

/* ━━━ Checklist Editor ━━━ */
function ChecklistContent({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  type Item = { id: string; text: string; done: boolean };
  const [items, setItems] = useState<Item[]>((content.items as Item[]) ?? []);
  const [newText, setNewText] = useState('');

  const sync = (next: Item[]) => { setItems(next); onChange({ items: next }); };
  const toggle = (id: string) => sync(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => sync(items.filter((i) => i.id !== id));
  const updateText = (id: string, text: string) => sync(items.map((i) => i.id === id ? { ...i, text } : i));
  const addItem = () => {
    if (!newText.trim()) return;
    sync([...items, { id: uid(), text: newText.trim(), done: false }]);
    setNewText('');
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="p-6 space-y-1">
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
          </div>
          <span className="text-[11px] text-zinc-400 font-medium tabular-nums">{doneCount}/{items.length}</span>
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-zinc-50 transition-colors">
          <button onClick={() => toggle(item.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 hover:border-emerald-400'}`}>
            {item.done && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
          </button>
          <input
            value={item.text}
            onChange={(e) => updateText(item.id, e.target.value)}
            className={`flex-1 text-sm bg-transparent outline-none ${item.done ? 'line-through text-zinc-400' : 'text-zinc-700'}`}
          />
          <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-5 h-5 rounded-md border-2 border-dashed border-zinc-200 flex-shrink-0" />
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="Add an item..."
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-zinc-300"
        />
        {newText.trim() && (
          <button onClick={addItem} className="text-xs text-blue-500 font-medium hover:text-blue-600">Add</button>
        )}
      </div>
    </div>
  );
}

/* ━━━ Sheet Editor ━━━ */
function SheetContent({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const [columns, setColumns] = useState<string[]>((content.columns as string[]) ?? ['Column 1', 'Column 2', 'Column 3']);
  const [rows, setRows] = useState<string[][]>((content.rows as string[][]) ?? [['', '', '']]);

  const sync = (cols: string[], rws: string[][]) => { setColumns(cols); setRows(rws); onChange({ columns: cols, rows: rws }); };

  const updateCol = (i: number, val: string) => { const c = [...columns]; c[i] = val; sync(c, rows); };
  const updateCell = (ri: number, ci: number, val: string) => { const r = rows.map((row) => [...row]); r[ri][ci] = val; sync(columns, r); };
  const addRow = () => sync(columns, [...rows, columns.map(() => '')]);
  const removeRow = (ri: number) => sync(columns, rows.filter((_, i) => i !== ri));
  const addCol = () => {
    const newCols = [...columns, `Column ${columns.length + 1}`];
    const newRows = rows.map((r) => [...r, '']);
    sync(newCols, newRows);
  };
  const removeCol = (ci: number) => {
    if (columns.length <= 1) return;
    sync(columns.filter((_, i) => i !== ci), rows.map((r) => r.filter((_, i) => i !== ci)));
  };

  return (
    <div className="p-4 overflow-auto flex-1">
      <div className="inline-block min-w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-left group relative">
                  <input value={col} onChange={(e) => updateCol(i, e.target.value)} className="w-full text-xs font-semibold bg-transparent outline-none text-zinc-600 uppercase tracking-wide" />
                  {columns.length > 1 && (
                    <button onClick={() => removeCol(i)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all">
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </th>
              ))}
              <th className="border border-zinc-200 bg-zinc-50 w-10">
                <button onClick={addCol} className="w-full py-2 text-zinc-400 hover:text-blue-500 transition-colors text-sm font-bold">+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-zinc-200 px-3 py-2">
                    <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} className="w-full text-sm bg-transparent outline-none text-zinc-700" />
                  </td>
                ))}
                <td className="border border-zinc-200 w-10 text-center">
                  <button onClick={() => removeRow(ri)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-2 text-xs text-blue-500 font-medium hover:text-blue-600 transition-colors px-3 py-1.5">
        + Add row
      </button>
    </div>
  );
}

/* ━━━ Gallery Editor ━━━ */
function GalleryContent({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  type Img = { id: string; url: string; caption?: string };
  const [images, setImages] = useState<Img[]>((content.images as Img[]) ?? []);
  const [newUrl, setNewUrl] = useState('');

  const sync = (next: Img[]) => { setImages(next); onChange({ images: next }); };
  const addImage = () => {
    if (!newUrl.trim()) return;
    sync([...images, { id: uid(), url: newUrl.trim() }]);
    setNewUrl('');
  };
  const removeImage = (id: string) => sync(images.filter((i) => i.id !== id));
  const updateCaption = (id: string, caption: string) => sync(images.map((i) => i.id === id ? { ...i, caption } : i));

  return (
    <div className="p-6 space-y-4 flex-1 overflow-auto">
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <div className="aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
              </div>
              <button onClick={() => removeImage(img.id)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              <input
                value={img.caption ?? ''}
                onChange={(e) => updateCaption(img.id, e.target.value)}
                placeholder="Caption..."
                className="mt-1.5 w-full text-[11px] text-zinc-500 bg-transparent outline-none placeholder:text-zinc-300"
              />
            </div>
          ))}
        </div>
      )}
      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
          <span className="text-4xl mb-3">🖼️</span>
          <p className="text-sm">No images yet</p>
        </div>
      )}
      <div className="flex items-center gap-2 pt-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
          placeholder="Paste image URL..."
          className="flex-1 text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none placeholder:text-zinc-300 focus:border-blue-400 transition-colors"
        />
        <button onClick={addImage} disabled={!newUrl.trim()} className="px-4 py-2 text-xs bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

/* ━━━ Item Card (for folder view) ━━━ */
function ItemCard({
  item,
  onOpen,
  onDelete,
  onRename,
}: {
  item: ProductionItem;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handle = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMenu]);

  const meta = TYPE_META[item.itemType];
  const preview = item.itemType === 'checklist'
    ? (() => { const items = (item.content.items as { done: boolean }[]) ?? []; const done = items.filter((i) => i.done).length; return items.length > 0 ? `${done}/${items.length} done` : null; })()
    : item.itemType === 'note'
      ? ((item.content.text as string) ?? '').slice(0, 60) || null
      : item.itemType === 'sheet'
        ? `${((item.content.rows as unknown[]) ?? []).length} rows`
        : item.itemType === 'gallery'
          ? `${((item.content.images as unknown[]) ?? []).length} images`
          : null;

  return (
    <div
      onClick={onOpen}
      className="group bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="h-1 w-full" style={{ backgroundColor: item.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl">{item.icon}</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all text-zinc-400"
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-zinc-200 shadow-lg py-1 w-36 z-50" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setShowMenu(false); onRename(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors flex items-center gap-2">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  Rename
                </button>
                <button onClick={() => { setShowMenu(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <h3 className="text-sm font-semibold text-zinc-800 mt-3 truncate">{item.title}</h3>
        <p className="text-[11px] text-zinc-400 mt-1">
          {meta.label}
          {preview && <span className="ml-1.5 text-zinc-300">· {preview}</span>}
        </p>
      </div>
    </div>
  );
}

/* ━━━ Main Page ━━━ */
export default function ProductionPage() {
  const { productionItems, addProductionItem, updateProductionItem, deleteProductionItem } = useStore();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<Record<string, unknown>>({});
  const pathname = usePathname();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setShowNewMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const currentItems = useMemo(() => {
    const items = productionItems.filter((i) => i.parentId === currentFolderId);
    const folders = items.filter((i) => i.itemType === 'folder').sort((a, b) => a.sortOrder - b.sortOrder);
    const files = items.filter((i) => i.itemType !== 'folder').sort((a, b) => a.sortOrder - b.sortOrder);
    return [...folders, ...files];
  }, [productionItems, currentFolderId]);

  const openItem = openItemId ? productionItems.find((i) => i.id === openItemId) ?? null : null;
  const breadcrumb = useMemo(() => buildPath(productionItems, currentFolderId), [productionItems, currentFolderId]);

  const createItem = useCallback((type: ProductionItemType) => {
    const meta = TYPE_META[type];
    const defaultContent: Record<string, unknown> =
      type === 'checklist' ? { items: [] } :
      type === 'sheet' ? { columns: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] } :
      type === 'gallery' ? { images: [] } :
      {};
    const id = addProductionItem({
      parentId: currentFolderId,
      title: `Untitled ${meta.label}`,
      itemType: type,
      icon: meta.defaultIcon,
      color: ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)],
      content: defaultContent,
      sortOrder: currentItems.length,
    });
    setShowNewMenu(false);
    setRenamingId(id);
    setRenameValue(`Untitled ${meta.label}`);
  }, [currentFolderId, currentItems.length, addProductionItem]);

  const handleItemClick = useCallback((item: ProductionItem) => {
    if (renamingId) return;
    if (item.itemType === 'folder') {
      setCurrentFolderId(item.id);
    } else {
      contentRef.current = { ...item.content };
      setOpenItemId(item.id);
    }
  }, [renamingId]);

  const handleBack = useCallback(() => {
    if (openItem) {
      updateProductionItem(openItem.id, { content: contentRef.current });
      setOpenItemId(null);
    }
  }, [openItem, updateProductionItem]);

  const handleContentChange = useCallback((newContent: Record<string, unknown>) => {
    contentRef.current = newContent;
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      updateProductionItem(renamingId, { title: renameValue.trim() });
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, updateProductionItem]);

  const handleDelete = useCallback((id: string) => {
    const item = productionItems.find((i) => i.id === id);
    if (item?.itemType === 'folder') {
      const hasChildren = productionItems.some((i) => i.parentId === id);
      if (hasChildren) { setDeleteConfirmId(id); return; }
    }
    deleteProductionItem(id);
  }, [productionItems, deleteProductionItem]);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteProductionItem(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteProductionItem]);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#f5f5f7' }}>
      {/* ── Header ── */}
      <header className="relative flex items-center px-3 md:px-6 py-2 md:py-3 bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <a href="/" className="overflow-hidden flex items-center justify-center flex-shrink-0 w-[60px] h-[32px] md:w-[116px] md:h-[61px]" title="Back to Calendar">
          <img src="/Favicon.png" alt="Clav Cal" className="h-auto scale-125 translate-y-1 w-[84px] md:w-[162px]" />
        </a>
        <div ref={navRef} className="absolute left-1/2 -translate-x-1/2">
          <button onClick={() => setNavOpen((o) => !o)} className="flex items-center gap-1 text-base md:text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity">
            <span className="text-blue-500">Production</span> Hub
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-0.5 transition-transform ${navOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {navOpen && (() => {
            const others = NAV_ITEMS.filter((i) => i.href !== pathname);
            return others.length > 0 ? (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg border border-zinc-200 shadow-lg py-1 min-w-[180px] z-50">
                {others.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setNavOpen(false)} className="block px-4 py-2 text-xl font-bold tracking-tight whitespace-nowrap hover:bg-zinc-50 transition-colors">
                    <span className="text-blue-500">{item.accent}</span> {item.rest}
                  </a>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {openItem ? (
          /* ━━ Item Editor View ━━ */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-4 md:px-8 py-3 bg-white border-b border-zinc-200">
              <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xl mr-1">{openItem.icon}</span>
              <input
                value={openItem.title}
                onChange={(e) => updateProductionItem(openItem.id, { title: e.target.value })}
                className="flex-1 text-lg font-bold bg-transparent outline-none text-zinc-800"
              />
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">{TYPE_META[openItem.itemType].label}</span>
            </div>
            <div className="flex-1 flex flex-col overflow-auto bg-white">
              {openItem.itemType === 'note' && <NoteContent content={openItem.content} onChange={handleContentChange} />}
              {openItem.itemType === 'checklist' && <ChecklistContent content={openItem.content} onChange={handleContentChange} />}
              {openItem.itemType === 'sheet' && <SheetContent content={openItem.content} onChange={handleContentChange} />}
              {openItem.itemType === 'gallery' && <GalleryContent content={openItem.content} onChange={handleContentChange} />}
            </div>
          </div>
        ) : (
          /* ━━ Folder View ━━ */
          <>
            {/* Breadcrumb + Toolbar */}
            <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
              <div className="flex items-center gap-1 text-sm overflow-x-auto">
                {breadcrumb.map((crumb, i) => (
                  <span key={crumb.id ?? 'home'} className="flex items-center gap-1 flex-shrink-0">
                    {i > 0 && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>}
                    <button
                      onClick={() => setCurrentFolderId(crumb.id)}
                      className={`hover:text-blue-500 transition-colors ${i === breadcrumb.length - 1 ? 'font-semibold text-zinc-800' : 'text-zinc-400'}`}
                    >
                      {crumb.title}
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative flex-shrink-0" ref={newMenuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                  New
                </button>
                {showNewMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-zinc-200 shadow-xl py-2 w-48 z-50">
                    {(Object.entries(TYPE_META) as [ProductionItemType, { label: string; defaultIcon: string }][]).map(([type, meta]) => (
                      <button
                        key={type}
                        onClick={() => createItem(type)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center gap-3"
                      >
                        <span className="text-lg">{meta.defaultIcon}</span>
                        <span className="font-medium text-zinc-700">{meta.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
              {currentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-300">
                  <div className="text-6xl mb-4">📂</div>
                  <p className="text-lg font-medium mb-1">
                    {currentFolderId ? 'This folder is empty' : 'Your Production Hub'}
                  </p>
                  <p className="text-sm mb-6">
                    {currentFolderId ? 'Create something to get started' : 'Create folders, notes, checklists, and more'}
                  </p>
                  <button
                    onClick={() => setShowNewMenu(true)}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    + Create First Item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {currentItems.map((item) => (
                    renamingId === item.id ? (
                      <div key={item.id} className="bg-white rounded-xl border-2 border-blue-400 overflow-hidden">
                        <div className="h-1 w-full" style={{ backgroundColor: item.color }} />
                        <div className="p-4">
                          <span className="text-2xl">{item.icon}</span>
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                            className="w-full text-sm font-semibold mt-3 bg-transparent outline-none border-b border-blue-400 pb-1 text-zinc-800"
                          />
                          <p className="text-[11px] text-zinc-400 mt-1">{TYPE_META[item.itemType].label}</p>
                        </div>
                      </div>
                    ) : (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onOpen={() => handleItemClick(item)}
                        onDelete={() => handleDelete(item.id)}
                        onRename={() => { setRenamingId(item.id); setRenameValue(item.title); }}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-zinc-800">Delete folder?</h3>
            <p className="text-sm text-zinc-500">This will permanently delete this folder and everything inside it.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 font-medium transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
