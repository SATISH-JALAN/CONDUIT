import React, { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
}

export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  ({ className, children, maxTilt = 8, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const sheenRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const card = cardRef.current;
      const sheen = sheenRef.current;
      if (!card) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        const rx = (ny - 0.5) * maxTilt * -1;
        const ry = (nx - 0.5) * maxTilt;

        gsap.to(card, {
          rotateX: rx,
          rotateY: ry,
          duration: 0.35,
          ease: 'power2.out',
          transformPerspective: 1200,
        });

        if (sheen) {
          gsap.to(sheen, {
            '--sheen-x': `${(1 - nx) * 100}%`,
            '--sheen-y': `${(1 - ny) * 100}%`,
            duration: 0.35,
          });
        }
      };

      const handleMouseLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: 'power3.out',
        });
      };

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [maxTilt]);

    return (
      <div
        ref={(node) => {
          cardRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn('tilt-card relative', className)}
        {...props}
      >
        {children}
        <div ref={sheenRef} className="card-sheen" />
      </div>
    );
  }
);
TiltCard.displayName = 'TiltCard';
