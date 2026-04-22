import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="w-16 h-16 mb-4 rounded-full bg-(--paper-2) border border-(--paper-edge) flex items-center justify-center">
        <Icon size={28} className="text-(--ink-4)" />
      </div>
      <h3 className="font-display text-[20px] font-medium text-(--ink-1) mb-2">{title}</h3>
      <p className="font-secondary text-[14px] text-(--ink-3) max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
