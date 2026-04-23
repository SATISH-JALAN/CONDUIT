import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface SplitItem {
  id: string;
  label: string;
  percentage: number;
  color?: string; // Tailwind class like bg-(--surge)
}

interface SplitHealthBarProps {
  items: SplitItem[];
  className?: string;
}

export const SplitHealthBar: React.FC<SplitHealthBarProps> = ({ items, className }) => {
  const total = items.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = total === 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-wider">
        <span className="text-(--ink-3)">Allocation Split</span>
        <span className={cn(isValid ? "text-(--surge)" : "text-(--rose)")}>
          Total: {total}%
        </span>
      </div>

      <div className="h-2 w-full bg-(--paper-2) rounded-full overflow-hidden flex">
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{ width: `${item.percentage}%` }}
            className={cn(
              "h-full transition-all duration-300",
              item.color || (idx % 2 === 0 ? "bg-(--surge-mid)" : "bg-(--surge-light)")
            )}
            title={`${item.label}: ${item.percentage}%`}
          />
        ))}
        {!isValid && total < 100 && (
          <div
            style={{ width: `${100 - total}%` }}
            className="h-full bg-(--rose-pale) opacity-50"
          />
        )}
      </div>

      {!isValid && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-(--rose) uppercase tracking-wider mt-1">
          <AlertCircle size={10} />
          {total > 100 ? 'Total exceeds 100%' : 'Must equal 100%'}
        </div>
      )}
    </div>
  );
};
