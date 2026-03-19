import React, { useEffect, useState, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface YieldCounterProps {
  initialValue?: number;
  ratePerSecond?: number;
}

export function YieldCounter({ initialValue = 1420.50, ratePerSecond = 0.0012 }: YieldCounterProps) {
  const [value, setValue] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateCounter = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setValue((prev) => prev + ratePerSecond * delta);
      animationFrameId = requestAnimationFrame(updateCounter);
    };

    animationFrameId = requestAnimationFrame(updateCounter);

    return () => cancelAnimationFrame(animationFrameId);
  }, [ratePerSecond]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);

  const [integerPart, fractionalPart] = formattedValue.split('.');

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center relative overflow-hidden group py-4"
    >
      <div className="relative z-10 flex flex-col items-center">
        <div 
          ref={valueRef}
          className="flex items-baseline font-display text-[var(--ink-1)] tracking-tight"
        >
          <span className="text-5xl md:text-7xl font-semibold">{integerPart}</span>
          <span className="text-3xl md:text-5xl font-medium text-[var(--ink-2)]">.{fractionalPart}</span>
        </div>
      </div>
    </div>
  );
}
