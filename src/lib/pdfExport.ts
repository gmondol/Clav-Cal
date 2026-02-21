import { jsPDF } from 'jspdf';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarEvent } from './types';
import { formatTimeDisplay, timeToMinutes } from './utils';

type SummaryType = 'daily' | 'weekly' | 'monthly';

function loadFavicon(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = '/Favicon.png';
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [59, 130, 246];
}

export async function generateSchedulePDF(
  events: CalendarEvent[],
  selectedDate: string,
  type: SummaryType
): Promise<void> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = margin;

  const faviconData = await loadFavicon();
  if (faviconData) {
    doc.addImage(faviconData, 'PNG', pageW - margin - 24, margin, 24, 24);
  }

  const date = new Date(selectedDate + 'T00:00:00');
  let rangeStart: string;
  let rangeEnd: string;
  let title: string;
  let filteredEvents: CalendarEvent[];

  if (type === 'daily') {
    rangeStart = selectedDate;
    rangeEnd = selectedDate;
    title = format(date, 'EEEE, MMMM d, yyyy');
    filteredEvents = events.filter((e) => e.date === selectedDate).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  } else if (type === 'weekly') {
    rangeStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    rangeEnd = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const ws = parse(rangeStart, 'yyyy-MM-dd', new Date());
    const we = parse(rangeEnd, 'yyyy-MM-dd', new Date());
    title = `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`;
    filteredEvents = events.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);
  } else {
    rangeStart = format(startOfMonth(date), 'yyyy-MM-dd');
    rangeEnd = format(endOfMonth(date), 'yyyy-MM-dd');
    title = format(date, 'MMMM yyyy');
    filteredEvents = events.filter((e) => e.date >= rangeStart && e.date <= rangeEnd);
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Clav StreamSchedule', margin, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text((type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : 'Monthly') + ' Summary', margin, 30);

  y = 48;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 10;

  const byDate = new Map<string, CalendarEvent[]>();
  filteredEvents.forEach((e) => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });
  const sortedDates = Array.from(byDate.keys()).sort();

  if (filteredEvents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No events scheduled.', margin, y);
  } else {
    sortedDates.forEach((dStr) => {
      const dayEvents = byDate.get(dStr)!;
      const d = parse(dStr, 'yyyy-MM-dd', new Date());
      const dayLabel = format(d, 'EEEE, MMM d');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(dayLabel, margin, y);
      y += 6;

      dayEvents.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      dayEvents.forEach((e) => {
        const [r, g, b] = hexToRgb(e.color);
        const lightR = Math.min(255, Math.round(r * 0.2 + 240));
        const lightG = Math.min(255, Math.round(g * 0.2 + 240));
        const lightB = Math.min(255, Math.round(b * 0.2 + 240));
        doc.setFillColor(lightR, lightG, lightB);
        doc.rect(margin, y - 4, pageW - margin * 2, 14, 'F');
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.line(margin, y - 4, margin, y + 10);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(r, g, b);
        doc.text(e.title, margin + 6, y + 2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.text(`${formatTimeDisplay(e.startTime)} – ${formatTimeDisplay(e.endTime)}`, margin + 6, y + 7);

        if (e.tags.length) {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(e.tags.join(' • '), margin + 6, y + 11);
          y += 4;
        }
        y += 16;

        if (e.address || e.contact) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          if (e.address) {
            doc.text(`📍 ${e.address}`, margin + 6, y + 2);
            y += 4;
          }
          if (e.contact) {
            doc.text(`👤 ${e.contact}`, margin + 6, y + 2);
            y += 4;
          }
          y += 2;
        }

        if (y > pageH - 30) {
          doc.addPage();
          y = margin;
        }
      });
      y += 4;
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by Clav StreamSchedule • ${format(new Date(), 'MMM d, yyyy h:mm a')}`, margin, pageH - 10);

  const filename = `clav-schedule-${type}-${selectedDate}.pdf`;
  doc.save(filename);
}
