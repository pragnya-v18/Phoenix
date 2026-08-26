import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  footerLabel?: string;
  footerValue?: string | number;
  footerBadge?: string;
  footerBadgeColor?: string;
  valueColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'bg-slate-50 text-slate-600',
  footerLabel,
  footerValue,
  footerBadge,
  footerBadgeColor = 'bg-slate-50 text-slate-700',
  valueColor = 'text-slate-900'
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-2xl font-bold ${valueColor} tracking-tight font-mono`}>
          {value}
        </div>
        {(footerLabel || footerBadge) && (
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            {footerLabel && <span className="text-[11px]">{footerLabel}</span>}
            {footerBadge && (
              <span className={`font-bold ${footerBadgeColor} px-1.5 py-0.2 rounded text-[11px]`}>
                {footerBadge}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
