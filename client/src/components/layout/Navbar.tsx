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

  const links = [
    { name: 'Bonds', path: '/bonds' },
    { name: 'COND', path: '/agent' },
    { name: 'Race', path: '/race' },
    { name: 'Docs', path: '/docs' },
  ];

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-14 sm:h-16 transition-all duration-300 flex items-center overflow-x-clip pt-[env(safe-area-inset-top)]',
        scrolled ? 'frosted-heavy shadow-[0_4px_20px_var(--paper-shadow)]' : 'bg-transparent'
      )}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-14 flex items-center justify-between gap-3 min-w-0">
        <Link to="/" className="flex items-center group relative">
          <span className="font-display font-bold text-[18px] tracking-tight text-(--ink-1)">
            CONDUIT
          </span>
          <span className="absolute bottom-0.5 -right-0.5 w-0.75 h-0.75 rounded-full bg-(--surge)"></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                'nav-link font-secondary text-[13px] font-normal pb-1',
                isLinkActive(link.path)
                  ? 'text-(--ink-1) active'
                  : 'text-(--ink-3)'
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--paper-3) border border-(--surge-pale-2)">
            <span className="dot-live"></span>
            <span className="font-display text-[11px] font-medium text-(--surge) uppercase tracking-wider">Testnet Live</span>
          </div>
          
          {isConnected && publicKey ? (
            <Link to="/dashboard">
              <div className="flex flex-col items-end mr-2">
                <span className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Connected</span>
                <span className="font-mono text-[13px] text-(--surge)">{publicKey.slice(0, 4)}...{publicKey.slice(-4)}</span>
              </div>
            </Link>
          ) : (
            <Link to="/onboarding">
              <MagneticButton variant="primary" className="font-display text-[13px] sm:text-[14px] px-3.5 sm:px-5 py-2 rounded-(--r-md) transition-all shadow-[0_2px_8px_rgba(0,122,94,0.25)] whitespace-nowrap">
                <span className="sm:hidden">Connect</span>
                <span className="hidden sm:inline">Connect Wallet</span>
              </MagneticButton>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
