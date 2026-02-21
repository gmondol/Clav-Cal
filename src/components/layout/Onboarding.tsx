'use client';

import { useStore } from '@/store/useStore';

interface OnboardingProps {
  onClose?: () => void;
}

export default function Onboarding({ onClose }: OnboardingProps) {
  const dismissOnboarding = useStore((s) => s.dismissOnboarding);
  const loadTemplates = useStore((s) => s.loadTemplates);
  const loadSeedData = useStore((s) => s.loadSeedData);

  const handleClose = () => {
    dismissOnboarding();
    onClose?.();
  };

  const handleGetStarted = () => {
    loadTemplates();
    loadSeedData();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 text-center animate-scale-in mx-2 md:mx-0">
        <div className="text-4xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to <span className="text-primary">Stream</span>Schedule
        </h2>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          Your content calendar for planning, brainstorming, and organizing streams.
          Drag ideas from the Scratch Notes panel onto your calendar to schedule them.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6 text-left">
          <div className="bg-zinc-50 rounded-lg p-3">
            <div className="text-lg mb-1">💡</div>
            <h4 className="text-xs font-semibold mb-0.5">Create Ideas</h4>
            <p className="text-[10px] text-muted">
              Add scratch notes in the right panel with colors and tags
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3">
            <div className="text-lg mb-1">📅</div>
            <h4 className="text-xs font-semibold mb-0.5">Drag & Schedule</h4>
            <p className="text-[10px] text-muted">
              Drag notes onto calendar days to create scheduled events
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3">
            <div className="text-lg mb-1">⚡</div>
            <h4 className="text-xs font-semibold mb-0.5">Plan Details</h4>
            <p className="text-[10px] text-muted">
              Click any day to open the timeline with detailed event editing
            </p>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-lg p-3 mb-6 text-left">
          <h4 className="text-xs font-semibold mb-1">⌨️ Keyboard Shortcuts</h4>
          <div className="flex gap-4 text-[10px] text-muted">
            <span><kbd className="px-1 py-0.5 bg-white rounded border border-border text-foreground font-mono">N</kbd> New note</span>
            <span><kbd className="px-1 py-0.5 bg-white rounded border border-border text-foreground font-mono">/</kbd> Search</span>
            <span><kbd className="px-1 py-0.5 bg-white rounded border border-border text-foreground font-mono">D</kbd> Go to today</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleGetStarted}
            className="px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started with Templates
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-sm text-muted bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
