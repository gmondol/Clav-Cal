import { format, parse, addMinutes, isBefore, isEqual } from 'date-fns';
import { CalendarEvent } from './types';

export function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  if (time === '24:00') return '12:00 AM';
  const date = parse(time, 'HH:mm', new Date());
  if (isNaN(date.getTime())) return time;
  return format(date, 'h:mm a');
}

export function generateTimeSlots(startHour = 6, endHour = 24, intervalMinutes = 30): string[] {
  const slots: string[] = [];
  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += intervalMinutes) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

export function hasTimeConflict(a: CalendarEvent, b: CalendarEvent): boolean {
  if (a.date !== b.date || a.id === b.id) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

export function getEventsForDate(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events
    .filter((e) => e.date === date)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function getConflictingEvents(events: CalendarEvent[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (hasTimeConflict(events[i], events[j])) {
        conflicts.add(events[i].id);
        conflicts.add(events[j].id);
      }
    }
  }
  return conflicts;
}

export function generateDailySummary(events: CalendarEvent[], date: string): string {
  const dayEvents = events.filter((e) => e.date === date).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  if (dayEvents.length === 0) return 'No events scheduled this day.';
  const d = parse(date, 'yyyy-MM-dd', new Date());
  const lines: string[] = [`📅 ${format(d, 'EEEE, MMMM d, yyyy')}`, ''];
  dayEvents.forEach((e) => {
    lines.push(`${formatTimeDisplay(e.startTime)} – ${formatTimeDisplay(e.endTime)}: ${e.title}`);
    if (e.address) lines.push(`  📍 ${e.address}`);
    if (e.contact) lines.push(`  👤 ${e.contact}`);
    if (e.tags.length) lines.push(`  📌 ${e.tags.join(', ')}`);
  });
  return lines.join('\n');
}

export function generateMonthlySummary(events: CalendarEvent[], monthStart: string, monthEnd: string): string {
  const monthEvents = events.filter((e) => e.date >= monthStart && e.date <= monthEnd);
  if (monthEvents.length === 0) return 'No events scheduled this month.';
  const byDate = new Map<string, CalendarEvent[]>();
  monthEvents.forEach((e) => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });
  const sortedDates = Array.from(byDate.keys()).sort();
  const lines: string[] = ['📅 Monthly Plan Summary', ''];
  sortedDates.forEach((date) => {
    const d = parse(date, 'yyyy-MM-dd', new Date());
    lines.push(`${format(d, 'EEEE, MMM d')}`);
    byDate.get(date)!.forEach((e) => {
      lines.push(`  ${formatTimeDisplay(e.startTime)} – ${formatTimeDisplay(e.endTime)}: ${e.title}`);
      if (e.address) lines.push(`    📍 ${e.address}`);
      if (e.contact) lines.push(`    👤 ${e.contact}`);
    });
    lines.push('');
  });
  const tagCounts = new Map<string, number>();
  monthEvents.forEach((e) => e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
  if (tagCounts.size > 0) {
    lines.push('📊 Summary');
    tagCounts.forEach((count, tag) => lines.push(`  ${tag}: ${count}`));
  }
  return lines.join('\n');
}

export function generateWeeklySummary(events: CalendarEvent[], weekStart: string, weekEnd: string): string {
  const weekEvents = events.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  if (weekEvents.length === 0) return 'No events scheduled this week.';

  const lines: string[] = ['📅 Weekly Plan Summary', ''];
  const byDate = new Map<string, CalendarEvent[]>();
  weekEvents.forEach((e) => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });

  const sortedDates = Array.from(byDate.keys()).sort();
  sortedDates.forEach((date) => {
    const d = parse(date, 'yyyy-MM-dd', new Date());
    lines.push(`${format(d, 'EEEE, MMM d')}`);
    byDate.get(date)!.forEach((e) => {
      lines.push(`  ${formatTimeDisplay(e.startTime)} – ${formatTimeDisplay(e.endTime)}: ${e.title}`);
      if (e.address) lines.push(`    📍 ${e.address}`);
      if (e.contact) lines.push(`    👤 ${e.contact}`);
    });
    lines.push('');
  });

  const tagCounts = new Map<string, number>();
  weekEvents.forEach((e) => e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
  if (tagCounts.size > 0) {
    lines.push('📊 Summary');
    tagCounts.forEach((count, tag) => lines.push(`  ${tag}: ${count}`));
  }

  return lines.join('\n');
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
