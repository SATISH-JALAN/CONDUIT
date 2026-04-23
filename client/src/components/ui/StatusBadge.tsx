import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  className?: string;
  showIcon?: boolean;
}

const variants = {
  success: {
    bg: 'bg-(--surge-pale)',
    text: 'text-(--surge)',
    border: 'border-(--surge-pale-2)',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-(--amber-pale)',
    text: 'text-(--amber)',
    border: 'border-(--amber-pale-2)',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-(--rose-pale)',
    text: 'text-(--rose)',
    border: 'border-(--rose-pale-2)',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-(--sky-pale)',
    text: 'text-(--sky)',
    border: 'border-(--sky-pale)', // Note: might need to add --sky-pale-2 in css if not there, using sky-pale for now
    icon: Info,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  className,
  showIcon = true,
}) => {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-wider',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon size={12} />}
      {label}
    </div>
  );
};
