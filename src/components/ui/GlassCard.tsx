import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'frosted' | 'frosted-heavy';
  chrome?: boolean;
  spinning?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  className,
  variant = 'default',
  chrome = false,
  spinning = false,
  children,
  ...props
}, ref) => {
  const baseClass = {
    default: 'paper-card',
    elevated: 'paper-card-elevated',
    frosted: 'frosted',
    'frosted-heavy': 'frosted-heavy',
  }[variant];

  return (
    <div
      ref={ref}
      className={cn(
        baseClass,
        chrome && 'chrome-border',
        spinning && 'chrome-spinning',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';

