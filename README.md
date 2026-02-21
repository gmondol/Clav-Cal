# StreamSchedule

A modern, drag-and-drop content calendar for organizing and brainstorming streaming content.

## Features

- **Month & Week views** with navigation and today highlighting
- **Scratch Notes panel** — create color-coded idea cards with tags and complexity levels
- **Drag & Drop** — drag notes onto calendar days to schedule them, drag events between days
- **Day Detail View** — click any day for an expanded timeline with 30-min time slots
- **Event Editor** — full-featured editor with time, address, contact, tags, and description
- **Templates** — preset show types (Podcast, IRL Stream, Gaming, Sponsorship, Admin)
- **Weekly Goals** — live counter of streams, IRL, podcasts, and collabs this week
- **Export** — generate a text summary of the current week's plan
- **Keyboard Shortcuts** — `N` new note, `/` search, `D` go to today
- **localStorage persistence** — all data saved locally with versioned storage

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Zustand (state management + persistence)
- @dnd-kit (drag and drop)
- date-fns (date utilities)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with DnD context
│   └── globals.css         # Global styles + animations
├── components/
│   ├── calendar/
│   │   ├── CalendarGrid.tsx # Month view grid
│   │   ├── WeekView.tsx     # Week view columns
│   │   ├── DayCell.tsx      # Individual day cell (droppable)
│   │   └── EventChip.tsx    # Compact event display (draggable)
│   ├── day/
│   │   ├── DayView.tsx      # Expanded day timeline modal
│   │   └── EventEditor.tsx  # Event create/edit form
│   ├── scratch/
│   │   ├── ScratchPanel.tsx  # Right sidebar panel
│   │   ├── NoteCard.tsx      # Draggable note card
│   │   └── NoteForm.tsx      # Note create/edit form
│   ├── layout/
│   │   ├── Header.tsx        # Top nav bar
│   │   ├── WeeklyGoals.tsx   # Weekly stats bar
│   │   ├── Onboarding.tsx    # First-run welcome modal
│   │   └── ExportModal.tsx   # Weekly summary export
│   └── ui/
│       ├── ColorPicker.tsx   # Color selection dots
│       ├── TagBadge.tsx      # Tag pill component
│       └── ComplexityBadge.tsx # Complexity indicator
├── store/
│   └── useStore.ts          # Zustand store with all state + actions
├── lib/
│   ├── types.ts             # TypeScript types + constants
│   ├── utils.ts             # Utility functions
│   └── seed.ts              # Sample seed data
└── hooks/
    └── useKeyboardShortcuts.ts
```
