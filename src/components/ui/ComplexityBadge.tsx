'use client';

import { Complexity, COMPLEXITY_CONFIG } from '@/lib/types';

interface ComplexityBadgeProps {
  complexity?: Complexity;
  onChange?: (c: Complexity) => void;
  editable?: boolean;
}

export default function ComplexityBadge({ complexity, onChange, editable }: ComplexityBadgeProps) {
  if (!complexity && !editable) return null;

  const current = complexity ? COMPLEXITY_CONFIG[complexity] : null;

  if (editable) {
    return (
      <div className="flex gap-1">
        {(Object.keys(COMPLEXITY_CONFIG) as Complexity[]).map((key) => {
          const cfg = COMPLEXITY_CONFIG[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange?.(key)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-all ${
                complexity === key
                  ? 'ring-1 ring-offset-1'
                  : 'opacity-40 hover:opacity-70'
              }`}
              style={{
                backgroundColor: cfg.color + '20',
                color: cfg.color,
                boxShadow: complexity === key ? `0 0 0 1px white, 0 0 0 2px ${cfg.color}` : undefined,
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    );
  }

  return current ? (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: current.color + '20',
        color: current.color,
      }}
    >
      {current.label}
    </span>
  ) : null;
}
