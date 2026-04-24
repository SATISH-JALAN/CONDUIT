import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { cn } from '@/lib/utils';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useWalletStore } from '@/stores/walletStore';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { isConnected, publicKey } = useWalletStore();

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

  const appShellRoutes = ['/dashboard', '/bonds', '/agent', '/race', '/nfts', '/creators', '/docs'];
  const isAppShellRoute = appShellRoutes.some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  );

  if (isAppShellRoute) {
    return null;
  }

  return (
    <header
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-18 transition-all duration-300 flex items-center overflow-hidden',
        scrolled ? 'frosted-heavy shadow-[0_4px_20px_var(--paper-shadow)]' : 'bg-transparent'
      )}
    >
      <div className="w-full max-w-7xl mx-auto px-4 md:px-14 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center group">
          <img src="/logo.png" alt="Conduit" className="h-35 w-auto object-contain -my-10 -ml-7" />
        </Link>



        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--paper-3) border border-(--surge-pale-2)">
            <span className="dot-live"></span>
            <span className="font-display text-[11px] font-medium text-(--surge) uppercase tracking-wider">Testnet Live</span>
          </div>
          
          {isConnected && publicKey ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <div className="flex flex-col items-end px-2.5 py-1.5 rounded-(--r-md) bg-(--paper-3) border border-(--surge-pale-2) max-w-36 sm:max-w-none">
                  <span className="text-mono text-[9px] sm:text-[10px] text-(--ink-4) uppercase tracking-wider leading-none">Connected</span>
                  <span className="font-mono text-[11px] sm:text-[13px] text-(--surge) leading-tight truncate max-w-30 sm:max-w-none">
                    {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
                  </span>
                </div>
              </Link>
              <Link to="/dashboard" className="hidden sm:block">
                <MagneticButton variant="primary" className="font-display text-[12px] sm:text-[14px] px-3 sm:px-5 py-2 rounded-(--r-md) transition-all shadow-[0_2px_8px_rgba(0,122,94,0.25)]">
                  Dashboard
                </MagneticButton>
              </Link>
            </div>
          ) : (
            <Link to="/onboarding">
              <MagneticButton variant="primary" className="font-display text-[12px] sm:text-[14px] px-3 sm:px-5 py-2 rounded-(--r-md) transition-all shadow-[0_2px_8px_rgba(0,122,94,0.25)]">
                Connect
              </MagneticButton>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
