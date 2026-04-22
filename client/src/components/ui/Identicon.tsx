import React, { useMemo } from 'react';

interface IdenticonProps {
  address: string;
  size?: number | string;
  className?: string;
}

const COLORS = [
  'var(--surge)',    // #007A5E
  'var(--amber)',    // #B45309
  'var(--rose)',     // #9F1239
  'var(--sky)',      // #0369A1
  'var(--violet)',   // #5B21B6
  'var(--surge-light)' // #00C896
];

// Simple deterministic hash matching string to a number
const hashString = (str: string) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

export const Identicon: React.FC<IdenticonProps> = ({ address, size = 32, className = '' }) => {
  const { color1, color2, color3, rotation, x, y } = useMemo(() => {
    const hash = hashString(address || 'default');
    
    // Pick 3 colors from the palette deterministically
    const c1 = COLORS[hash % COLORS.length];
    const c2 = COLORS[(hash >> 2) % COLORS.length];
    const c3 = COLORS[(hash >> 4) % COLORS.length];
    
    // Angle between 0 and 360
    const rot = hash % 360;
    
    // Position of the radial glow
    const cx = 20 + (hash % 60);
    const cy = 20 + ((hash >> 3) % 60);

    return { color1: c1, color2: c2, color3: c3, rotation: rot, x: cx, y: cy };
  }, [address]);

  return (
    <div 
      className={`rounded-full overflow-hidden shrink-0 ${className} shadow-[0_2px_8px_var(--paper-shadow)]`}
      style={{ 
        width: size, 
        height: size,
        background: `conic-gradient(from ${rotation}deg, ${color1}, ${color2}, ${color3}, ${color1})`
      }}
    >
      <div 
        className="w-full h-full opacity-80 mix-blend-overlay"
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`
        }}
      />
    </div>
  );
};
