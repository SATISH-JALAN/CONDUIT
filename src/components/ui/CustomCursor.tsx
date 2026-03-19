import React, { useEffect, useRef } from 'react';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = `${mx}px`;
      cursor.style.top = `${my}px`;
    };

    const tick = () => {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      animationFrameId = requestAnimationFrame(tick);
    };

    const onMouseEnter = () => {
      cursor.style.width = '6px';
      cursor.style.height = '6px';
      ring.style.width = '56px';
      ring.style.height = '56px';
    };

    const onMouseLeave = () => {
      cursor.style.width = '10px';
      cursor.style.height = '10px';
      ring.style.width = '40px';
      ring.style.height = '40px';
    };

    document.addEventListener('mousemove', onMouseMove);
    tick();

    const interactiveElements = document.querySelectorAll('button, a, .tilt-card');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
    });

    // MutationObserver to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const newInteractiveElements = document.querySelectorAll('button, a, .tilt-card');
          newInteractiveElements.forEach(el => {
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);
            el.addEventListener('mouseenter', onMouseEnter);
            el.addEventListener('mouseleave', onMouseLeave);
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div id="cursor" ref={cursorRef} />
      <div id="cursor-ring" ref={ringRef} />
    </>
  );
}
