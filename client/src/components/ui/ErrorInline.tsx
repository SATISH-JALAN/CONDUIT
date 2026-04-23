import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface ErrorInlineProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const ErrorInline: React.FC<ErrorInlineProps> = ({
  message,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-3 rounded-(--r-md) bg-(--rose-pale) border border-(--rose-pale-2) flex items-start gap-3 text-left",
        className
      )}
    >
      <AlertCircle size={16} className="text-(--rose) mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-(--rose) font-secondary text-[13px]">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-mono text-[10px] text-(--rose) hover:underline uppercase tracking-wider font-medium"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
