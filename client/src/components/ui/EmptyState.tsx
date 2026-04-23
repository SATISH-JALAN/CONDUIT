import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type EmptyStateVariant = 'default' | 'card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  variant = 'default',
  className 
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center",
        variant === 'card' && "bg-(--paper-1) border border-(--paper-edge) rounded-(--r-lg)",
        className
      )}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-(--paper-2) border border-(--paper-edge) flex items-center justify-center shadow-inner">
        <Icon size={28} className="text-(--ink-4)" />
      </div>
      <h3 className="font-display text-[20px] font-medium text-(--ink-1) mb-2">{title}</h3>
      <p className="font-secondary text-[14px] text-(--ink-3) max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && <div>{action}</div>}
          {secondaryAction && <div>{secondaryAction}</div>}
        </div>
      )}
    </div>
  );
};
