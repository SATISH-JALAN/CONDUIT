import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { Sparkles, Zap, Bot, Radio, KeyRound, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface OrbitNode {
  label: string;
  description: string;
  color: string;
  Icon: LucideIcon;
}

const NODES: OrbitNode[] = [
  { label: 'Stellar', description: 'Layer-1 blockchain network', color: 'var(--sky)', Icon: Sparkles },
  { label: 'Soroban', description: 'Smart contract platform', color: 'var(--violet)', Icon: Zap },
  { label: 'AI Agents', description: 'COND autonomous engine', color: 'var(--surge)', Icon: Bot },
  { label: 'Pyth', description: 'Real-time oracle feeds', color: 'var(--amber)', Icon: Radio },
  { label: 'Freighter', description: 'Stellar wallet integration', color: 'var(--sky)', Icon: KeyRound },
  { label: 'Passkey', description: 'Passwordless auth security', color: 'var(--rose)', Icon: ShieldCheck },
];

export function OrbitWheel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!wheelRef.current) return;

      tweenRef.current = gsap.to(wheelRef.current, {
        rotation: 360,
        duration: 30,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Slow down on hover
  useEffect(() => {
    if (!tweenRef.current) return;
    gsap.to(tweenRef.current, {
      timeScale: hoveredIdx !== null ? 0.15 : 1,
      duration: 0.6,
      ease: 'power2.out',
    });
  }, [hoveredIdx]);

  const radius = 42; // percentage from center

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-w-[520px] mx-auto">
      {/* Orbit ring */}
      <div
        className="absolute inset-[8%] rounded-full border border-dashed"
        style={{ borderColor: 'var(--paper-edge)' }}
      />
      <div
        className="absolute inset-[15%] rounded-full border border-dashed opacity-50"
        style={{ borderColor: 'var(--paper-edge)' }}
      />

      {/* Central node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center paper-card-elevated"
          style={{
            boxShadow: '0 0 40px rgba(0,122,94,0.12), 0 0 80px rgba(0,122,94,0.06)',
          }}
        >
          <img src="/logofevicon.png" alt="Conduit" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
        </div>
      </div>

      {/* Orbiting nodes */}
      <div ref={wheelRef} className="absolute inset-0">
        {NODES.map((node, i) => {
          const angle = (i * 360) / NODES.length;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + radius * Math.cos(rad);
          const y = 50 + radius * Math.sin(rad);

          return (
            <div
              key={node.label}
              className="absolute z-20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Counter-rotate so labels stay upright */}
              <div className="orbit-node-inner">
                <div
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center paper-card cursor-default transition-all duration-300 hover:scale-110"
                  style={{
                    borderColor: hoveredIdx === i ? node.color : undefined,
                    boxShadow: hoveredIdx === i ? `0 0 20px ${node.color}22` : undefined,
                  }}
                >
                  <node.Icon
                    size={22}
                    style={{ color: hoveredIdx === i ? node.color : 'var(--ink-2)' }}
                    className="transition-colors duration-300"
                  />
                </div>

                {/* Label */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                  <span
                    className="font-display text-[11px] md:text-[12px] font-medium tracking-[-0.01em]"
                    style={{ color: hoveredIdx === i ? node.color : 'var(--ink-3)' }}
                  >
                    {node.label}
                  </span>
                </div>

                {/* Tooltip */}
                {hoveredIdx === i && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap glass-pill px-3 py-1.5 rounded-full z-30 shadow-md">
                    <span className="font-secondary text-[11px] text-[var(--ink-2)]">{node.description}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
