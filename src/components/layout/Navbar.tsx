import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';
import { MagneticButton } from '@/components/ui/MagneticButton';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
      );
    }
  }, []);

  if (['/dashboard', '/bonds', '/agent', '/race', '/nfts'].includes(location.pathname)) {
    return null;
  }

  const links = [
    { name: 'Bonds', path: '/bonds' },
    { name: 'COND', path: '/agent' },
    { name: 'Race', path: '/race' },
    { name: 'Docs', path: '#' },
  ];

  return (
    <header
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-[64px] transition-all duration-300 flex items-center',
        scrolled ? 'frosted-heavy shadow-[0_4px_20px_var(--paper-shadow)]' : 'bg-transparent'
      )}
    >
      <div className="w-full max-w-[1280px] mx-auto px-[24px] md:px-[56px] flex items-center justify-between">
        <Link to="/" className="flex items-center group relative">
          <span className="font-display font-bold text-[18px] tracking-tight text-[var(--ink-1)]">
            CONDUIT
          </span>
          <span className="absolute bottom-[2px] right-[-2px] w-[3px] h-[3px] rounded-full bg-[var(--surge)]"></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                'nav-link font-secondary text-[13px] font-normal pb-1',
                location.pathname === link.path
                  ? 'text-[var(--ink-1)] active'
                  : 'text-[var(--ink-3)]'
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--paper-3)] border border-[var(--surge-pale-2)]">
            <span className="dot-live"></span>
            <span className="font-display text-[11px] font-medium text-[var(--surge)] uppercase tracking-wider">Testnet Live</span>
          </div>
          <Link to="/dashboard">
            <MagneticButton variant="primary" className="font-display text-[14px] px-5 py-2 rounded-[var(--r-md)] transition-all shadow-[0_2px_8px_rgba(0,122,94,0.25)]">
              Launch App
            </MagneticButton>
          </Link>
        </div>
      </div>
    </header>
  );
}
