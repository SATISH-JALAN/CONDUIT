import React, { useEffect, useState, useRef } from 'react';
import { gsap } from '@/lib/gsap';

export function Preloader() {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only check sessionStorage once on mount
    const hasSeen = sessionStorage.getItem('conduit_preloader');
    
    if (!hasSeen) {
      setShow(true);
      // Disable scrolling on body while preloader is active
      document.body.style.overflow = 'hidden';

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => {
            sessionStorage.setItem('conduit_preloader', 'true');
            // Animate out the preloader (slide up)
            gsap.to(containerRef.current, {
              yPercent: -100,
              duration: 0.9,
              ease: 'power4.inOut',
              onComplete: () => {
                setShow(false);
                document.body.style.overflow = '';
              }
            });
          }
        });

        // 1. Initial wait & Logo fade in + drift up
        tl.fromTo(logoRef.current, 
          { y: 30, opacity: 0, filter: 'blur(10px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' },
          "+=0.2" // slight delay before starting to make it feel deliberate
        )
        // 2. Text fade in
        .fromTo(textRef.current, 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          "-=0.6"
        )
        // 3. Loading bar fill mimicking connection establishment
        // A staggered fake "loading" progress
        .fromTo(barRef.current, 
          { width: '0%' },
          { width: '25%', duration: 0.4, ease: 'power1.out' },
          "-=0.3"
        )
        .to(barRef.current, { width: '80%', duration: 0.8, ease: 'power2.inOut' })
        .to(barRef.current, { width: '100%', duration: 0.3, ease: 'power1.inOut' });
        
      }, containerRef);

      return () => {
        ctx.revert();
        document.body.style.overflow = '';
      };
    }
  }, []);

  if (!show) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-(--paper-1) flex flex-col items-center justify-center p-6"
    >
      <div className="relative z-10 flex flex-col items-center mt-[-10vh]">
        <img 
          ref={logoRef}
          src="/logo.png" 
          alt="Conduit Logo" 
          className="h-28 sm:h-35 mb-10 object-contain"
          style={{ willChange: 'transform, opacity, filter' }}
        />
        
        <div ref={textRef} className="flex flex-col items-center w-full max-w-[240px]">
          <div className="text-mono text-[10px] sm:text-[11px] text-(--surge) uppercase tracking-[0.25em] mb-4 text-center font-medium">
            Establishing Secured Stream
          </div>
          <div className="w-full h-[2px] bg-(--paper-edge) rounded-full overflow-hidden">
            <div ref={barRef} className="h-full bg-(--surge) rounded-full shadow-[0_0_8px_var(--surge-pale)]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
