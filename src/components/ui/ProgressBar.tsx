import React from 'react';

interface ProgressBarProps {
  percentage: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const COLOR_MAP: Record<string, { bar: string; bg: string }> = {
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-100' },
  indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-100' },
  amber: { bar: 'bg-amber-500', bg: 'bg-amber-100' },
  violet: { bar: 'bg-violet-500', bg: 'bg-violet-100' },
  orange: { bar: 'bg-orange-500', bg: 'bg-orange-100' },
  sky: { bar: 'bg-sky-500', bg: 'bg-sky-100' },
  red: { bar: 'bg-red-500', bg: 'bg-red-100' },
  slate: { bar: 'bg-slate-500', bg: 'bg-slate-100' }
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color = 'emerald',
  size = 'sm',
  showLabel = false,
  className = ''
}) => {
  const colors = COLOR_MAP[color] || COLOR_MAP.emerald;
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-4';
  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${colors.bg} rounded-full overflow-hidden ${heightClass}`}>
        <div 
          className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono font-semibold text-slate-600 min-w-[3rem] text-right">
          {clampedPct.toFixed(1)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
