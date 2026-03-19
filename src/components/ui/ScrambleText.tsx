import React, { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from '@/lib/gsap';

interface ScrambleTextProps {
  text: string;
  className?: string;
  duration?: number;
}

export function ScrambleText({ text, className = '', duration = 700 }: ScrambleTextProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const [hasScrambled, setHasScrambled] = useState(false);

  useEffect(() => {
    if (!elRef.current || hasScrambled) return;

    const el = elRef.current;

    const scramble = () => {
      const chars = '!@#$%^&*ABCDEFGHJKLabcdefghj0123456789';
      let startTime: number | null = null;

      const frame = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const resolvedCount = Math.floor(progress * text.length);

        let output = '';
        for (let i = 0; i < text.length; i++) {
          if (i < resolvedCount) {
            output += text[i];
          } else {
            output += text[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
          }
        }
        el.textContent = output;
        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          el.textContent = text;
          setHasScrambled(true);
        }
      };
      requestAnimationFrame(frame);
    };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      onEnter: () => scramble()
    });

  }, [text, duration, hasScrambled]);

  return (
    <span ref={elRef} className={className}>
      {text}
    </span>
  );
}
