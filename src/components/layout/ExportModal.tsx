'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { generateSchedulePDF } from '@/lib/pdfExport';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths } from 'date-fns';

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = 'daily' | 'weekly' | 'monthly';

function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="p-1 rounded-md hover:bg-zinc-200 text-blue-500 hover:text-blue-600 transition-colors"
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        {direction === 'left' ? <path d="M15 19l-7-7 7-7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const events = useStore((s) => s.events);
  const selectedDate = useStore((s) => s.selectedDate);
  const [selected, setSelected] = useState<ExportType>('weekly');
  const [downloading, setDownloading] = useState(false);

  const [dailyDate, setDailyDate] = useState(new Date(selectedDate + 'T00:00:00'));
  const [weeklyDate, setWeeklyDate] = useState(new Date(selectedDate + 'T00:00:00'));
  const [monthlyDate, setMonthlyDate] = useState(new Date(selectedDate + 'T00:00:00'));

  const activeDate = selected === 'daily' ? dailyDate : selected === 'weekly' ? weeklyDate : monthlyDate;
  const exportDateStr = format(activeDate, 'yyyy-MM-dd');

  const dayLabel = format(dailyDate, 'EEEE, MMM d');
  const weekStart = format(startOfWeek(weeklyDate, { weekStartsOn: 1 }), 'MMM d');
  const weekEnd = format(endOfWeek(weeklyDate, { weekStartsOn: 1 }), 'MMM d');
  const monthLabel = format(monthlyDate, 'MMMM yyyy');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateSchedulePDF(events, exportDateStr, selected);
      onClose();
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in mx-2 md:mx-0" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-foreground">Download Schedule PDF</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-muted mb-4">Choose which period to include in your PDF:</p>

        <div className="space-y-2 mb-6">
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-zinc-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50">
            <input type="radio" name="export" value="daily" checked={selected === 'daily'} onChange={() => setSelected('daily')} className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Daily</span>
              <div className="flex items-center gap-2 mt-0.5">
                <NavArrow direction="left" onClick={() => setDailyDate((d) => addDays(d, -1))} />
                <p className="text-[11px] text-muted min-w-[120px] text-center">{dayLabel}</p>
                <NavArrow direction="right" onClick={() => setDailyDate((d) => addDays(d, 1))} />
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-zinc-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50">
            <input type="radio" name="export" value="weekly" checked={selected === 'weekly'} onChange={() => setSelected('weekly')} className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Weekly</span>
              <div className="flex items-center gap-2 mt-0.5">
                <NavArrow direction="left" onClick={() => setWeeklyDate((d) => addWeeks(d, -1))} />
                <p className="text-[11px] text-muted min-w-[120px] text-center">{weekStart} – {weekEnd}</p>
                <NavArrow direction="right" onClick={() => setWeeklyDate((d) => addWeeks(d, 1))} />
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-zinc-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50">
            <input type="radio" name="export" value="monthly" checked={selected === 'monthly'} onChange={() => setSelected('monthly')} className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">Monthly</span>
              <div className="flex items-center gap-2 mt-0.5">
                <NavArrow direction="left" onClick={() => setMonthlyDate((d) => addMonths(d, -1))} />
                <p className="text-[11px] text-muted min-w-[120px] text-center">{monthLabel}</p>
                <NavArrow direction="right" onClick={() => setMonthlyDate((d) => addMonths(d, 1))} />
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
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
