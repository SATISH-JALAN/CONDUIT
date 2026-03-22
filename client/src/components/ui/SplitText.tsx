import React, { useEffect, useRef, ReactNode } from 'react';
import { gsap } from '@/lib/gsap';

interface SplitTextProps {
  children: string;
  className?: string;
  type?: 'chars' | 'words' | 'lines';
  delay?: number;
}

export function SplitText({ children, className = '', type = 'chars', delay = 0 }: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = containerRef.current.querySelectorAll('.split-char');
    
    gsap.fromTo(chars, 
      {
        y: 80,
        opacity: 0,
        rotationX: -90,
      },
      {
        y: 0,
        opacity: 1,
        rotationX: 0,
        stagger: 0.022,
        duration: 0.7,
        ease: 'back.out(1.4)',
        transformOrigin: '0% 50% -50',
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }, [children, delay]);

  const renderSplitText = () => {
    if (type === 'chars') {
      const words = children.split(' ');
      return words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap overflow-visible">
          {word.split('').map((char, charIndex) => (
            <span key={charIndex} className="split-char inline-block" style={{ transformStyle: 'preserve-3d' }}>
              {char}
            </span>
          ))}
          {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ));
    }
    return children;
  };

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`} style={{ perspective: '1000px' }}>
      {renderSplitText()}
    </div>
  );
}
