import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DeltaStatCardProps {
  label: string;
  value: string | React.ReactNode;
  delta?: number; // percentage, positive or negative
  deltaLabel?: string;
  className?: string;
}

export const DeltaStatCard: React.FC<DeltaStatCardProps> = ({
  label,
  value,
  delta,
  deltaLabel = '24h',
  className,
}) => {
  const isPositive = delta && delta > 0;
  const isNegative = delta && delta < 0;

  return (
    <div className={cn("bg-(--paper-1) border border-(--paper-edge) rounded-(--r-md) p-5", className)}>
      <h4 className="text-[13px] font-secondary text-(--ink-3) mb-1">{label}</h4>
      <div className="flex items-baseline gap-3">
        <div className="text-2xl font-display font-medium text-(--ink-1)">
          {value}
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center text-[12px] font-mono",
              isPositive ? "text-(--surge)" : isNegative ? "text-(--rose)" : "text-(--ink-4)"
            )}
          >
            {isPositive && <ArrowUpRight size={14} className="mr-0.5" />}
            {isNegative && <ArrowDownRight size={14} className="mr-0.5" />}
            <span>
              {isPositive ? '+' : ''}{delta}% {deltaLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
