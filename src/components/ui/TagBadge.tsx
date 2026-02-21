'use client';

interface TagBadgeProps {
  tag: string;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
  color?: string;
}

export default function TagBadge({ tag, removable, onRemove, onClick, active, size = 'sm', color }: TagBadgeProps) {
  const base =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5'
      : 'text-xs px-2 py-0.5';

  const colorStyle = color
    ? active
      ? { backgroundColor: color, color: '#fff' }
      : { backgroundColor: color + '18', color, borderColor: color + '40' }
    : undefined;

  return (
    <span
      onClick={onClick}
      style={colorStyle}
      className={`${base} rounded-full font-medium inline-flex items-center gap-0.5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        color
          ? active ? 'ring-1 ring-offset-1' : 'border hover:opacity-80'
          : active
            ? 'bg-primary text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      {tag}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 hover:text-red-500 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}
