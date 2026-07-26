import React, { useEffect, useState, useRef } from 'react';
import { gsap } from '@/lib/gsap';

export function Preloader() {
  const [show, setShow] = useState(true);
  const [percent, setPercent] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const ctx = gsap.context(() => {
      const counterObj = { val: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(containerRef.current, {
            yPercent: -100,
            duration: 0.8,
            ease: 'power4.inOut',
            onComplete: () => {
              setShow(false);
              document.body.style.overflow = '';
            }
          });
        }
      });

      // 1. Minimal logo reveal
      tl.fromTo(
        logoRef.current,
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )
      // 2. Track & Counter reveal
      .fromTo(
        [trackRef.current, counterRef.current],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.4'
      )
      // 3. Progress fill + counter tick
      .to(
        counterObj,
        {
          val: 100,
          duration: 1.2,
          ease: 'power2.inOut',
          onUpdate: () => {
            setPercent(Math.floor(counterObj.val));
          }
        },
        '-=0.2'
      )
      .fromTo(
        barRef.current,
        { width: '0%' },
        { width: '100%', duration: 1.2, ease: 'power2.inOut' },
        '<'
      )
      .to({}, { duration: 0.15 });

    }, containerRef);

    return () => {
      ctx.revert();
      document.body.style.overflow = '';
    };
  }, []);

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[var(--paper-1)] flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="flex flex-col items-center max-w-[260px] w-full mt-[-4vh]">
        {/* Logo */}
        <img
          ref={logoRef}
          src="/logo.png"
          alt="Conduit"
          className="h-28 sm:h-32 w-auto object-contain mb-8"
        />

        {/* Minimal Progress Track */}
        <div ref={trackRef} className="w-full h-[2px] bg-[var(--paper-edge)] rounded-full overflow-hidden mb-3">
          <div
            ref={barRef}
            className="h-full bg-[var(--surge)] rounded-full"
          />
        </div>

        {/* Counter */}
        <div ref={counterRef} className="w-full flex items-center justify-between font-mono text-[11px] text-[var(--ink-3)] tracking-widest uppercase">
          <span>CONDUIT</span>
          <span>{String(percent).padStart(2, '0')}%</span>
        </div>
      </div>
    </div>
  );
}
