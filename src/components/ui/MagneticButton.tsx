import React, { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'neo' | 'ghost' | 'primary';
  magneticStrength?: number;
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, className, variant = 'neo', magneticStrength = 0.3, ...props }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const button = buttonRef.current;
      const text = textRef.current;
      if (!button || !text) return;

      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = button.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);

        gsap.to(button, {
          x: x * magneticStrength,
          y: y * magneticStrength,
          duration: 1,
          ease: 'power3.out',
        });

        gsap.to(text, {
          x: x * (magneticStrength * 0.5),
          y: y * (magneticStrength * 0.5),
          duration: 1,
          ease: 'power3.out',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 1,
          ease: 'elastic.out(1, 0.3)',
        });
        gsap.to(text, {
          x: 0,
          y: 0,
          duration: 1,
          ease: 'elastic.out(1, 0.3)',
        });
      };

      button.addEventListener('mousemove', handleMouseMove);
      button.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        button.removeEventListener('mousemove', handleMouseMove);
        button.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [magneticStrength]);

    const variants = {
      neo: 'neo-btn text-[var(--ink-1)] font-medium px-6 py-3',
      ghost: 'bg-transparent text-[var(--ink-2)] hover:text-[var(--ink-1)] px-6 py-3 transition-colors',
      primary: 'bg-[var(--surge)] text-[var(--paper-1)] hover:bg-[var(--surge-mid)] px-6 py-3 rounded-[var(--r-md)] transition-colors shadow-lg shadow-[rgba(0,122,94,0.25)]',
    };

    return (
      <button
        ref={(node) => {
          // @ts-ignore
          buttonRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn('relative flex items-center justify-center', variants[variant], className)}
        {...props}
      >
        <span ref={textRef} className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

MagneticButton.displayName = 'MagneticButton';
