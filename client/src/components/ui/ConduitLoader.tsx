import React from 'react';
import { cn } from '@/lib/utils';

interface ConduitLoaderProps {
  size?: number;
  className?: string;
  variant?: 'primary' | 'muted';
}

export const ConduitLoader: React.FC<ConduitLoaderProps> = ({ 
  size = 24, 
  className,
  variant = 'primary'
}) => {
  return (
    <div 
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <div 
        className={cn(
          "absolute inset-0 rounded-full border-2 border-transparent animate-[spin_1.5s_linear_infinite]",
          variant === 'primary' ? "border-t-(--surge) border-l-(--surge-mid)" : "border-t-(--ink-4) border-l-(--paper-edge)"
        )} 
      />
      <div 
        className={cn(
          "absolute inset-1 rounded-full border-2 border-transparent animate-[spin_2s_linear_infinite_reverse]",
          variant === 'primary' ? "border-b-(--surge-light) border-r-(--sky)" : "border-b-(--ink-3) border-r-(--paper-edge)"
        )} 
      />
      {variant === 'primary' && (
        <div className="absolute inset-0 rounded-full bg-(--surge) opacity-10 blur-sm animate-pulse" />
      )}
    </div>
  );
};
