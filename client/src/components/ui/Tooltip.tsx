import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { gsap } from '@/lib/gsap';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      gsap.fromTo(
        tooltipRef.current,
        { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [isVisible]);

  return (
    <div 
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs font-secondary text-[var(--ink-1)] z-50 frosted-heavy shadow-lg w-max max-w-[200px] md:max-w-[280px] text-center leading-relaxed",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
