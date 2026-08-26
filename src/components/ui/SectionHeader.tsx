import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-indigo-600',
  badge,
  badgeColor = 'text-indigo-700 bg-indigo-50 border-indigo-200'
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          <span>{title}</span>
        </h3>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
};

export default SectionHeader;
