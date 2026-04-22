import React, { useEffect, useRef } from 'react';

export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // Monochrome subtle color
    const color = 'rgba(150, 150, 150, 0.3)';
    const mouse = { x: -1000, y: -1000, radius: 180 };

    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;

      constructor(x: number, y: number) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        // Vertical dash
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + 8);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      update(pointerX: number, pointerY: number) {
        const dx = pointerX - this.x;
        const dy = pointerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const forceDirectionX = dx / dist;
          const forceDirectionY = dy / dist;
          const force = (mouse.radius - dist) / mouse.radius;
          
          // Repel outward
          const directionX = forceDirectionX * force * 10;
          const directionY = forceDirectionY * force * 10;

          this.x -= directionX;
          this.y -= directionY;
        } else {
          // Return to base position with friction/easing
          if (this.x !== this.baseX) {
            const dxBase = this.x - this.baseX;
            this.x -= dxBase / 15;
          }
          if (this.y !== this.baseY) {
            const dyBase = this.y - this.baseY;
            this.y -= dyBase / 15;
          }
        }
        this.draw();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      // Make canvas slightly taller than innerHeight to cover hero section properly
      canvas.height = window.innerHeight * 1.2;
      particles = [];

      const spacing = 35; // Grid spacing
      const cols = Math.floor(canvas.width / spacing);
      const rows = Math.floor(canvas.height / spacing);

      // Create a uniform grid of particles
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = j * spacing + (spacing / 2);
          const y = i * spacing + (spacing / 2);
          particles.push(new Particle(x, y));
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const rect = canvas.getBoundingClientRect();
      const relativeMouseX = mouse.x - rect.left;
      const relativeMouseY = mouse.y - rect.top;

      particles.forEach((p) => p.update(relativeMouseX, relativeMouseY));
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY + window.scrollY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
}
