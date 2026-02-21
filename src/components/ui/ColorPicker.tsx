'use client';

import { COLOR_PALETTE } from '@/lib/types';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

export default function ColorPicker({ value, onChange, size = 'md' }: ColorPickerProps) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`${dim} rounded-full transition-all duration-150 hover:scale-110`}
          style={{
            backgroundColor: c.value,
            ...(value === c.value ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${c.value}` } : {}),
          }}
          title={c.name}
        />
      ))}
    </div>
  );
}
