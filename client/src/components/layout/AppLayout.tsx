import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Zap, 
  Wallet, 
  Bot, 
  Flag, 
  Image as ImageIcon, 
  Users, 
  BookOpen,
  Settings,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { publicKey } = useWalletStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Stream', path: '/dashboard', icon: Zap },
    { name: 'Bonds', path: '/bonds', icon: Wallet },
    { name: 'COND', path: '/agent', icon: Bot },
    { name: 'Race', path: '/race', icon: Flag },
    { name: 'Docs', path: '/docs', icon: BookOpen },
    { name: 'NFTs', path: '/nfts', icon: ImageIcon },
    { name: 'Creators', path: '/creators', icon: Users },
    { name: 'Settings', path: '#', icon: Settings },
  ];

  const mobilePrimaryNav = [
    { name: 'Stream', path: '/dashboard', icon: Zap },
    { name: 'Bonds', path: '/bonds', icon: Wallet },
    { name: 'COND', path: '/agent', icon: Bot },
    { name: 'Race', path: '/race', icon: Flag },
    { name: 'NFTs', path: '/nfts', icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-(--paper-1) flex overflow-x-clip">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-(--ink-1)/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        "w-[86vw] max-w-74 lg:w-65 fixed top-0 left-0 h-screen frosted-heavy border-r border-(--paper-edge) flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-[18px] tracking-tight text-(--ink-1)">
              CONDUIT
            </span>
            <span className="w-0.75 h-0.75 rounded-full bg-(--surge) mt-2"></span>
          </Link>
          <button 
            className="lg:hidden text-(--ink-3) hover:text-(--ink-1)"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path !== '#' && isActivePath(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-(--r-md) font-display text-[13px] transition-all duration-200 group',
                  isActive 
                    ? 'bg-(--surge-pale) border-l-2 border-(--surge) text-(--surge) shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' 
                    : 'text-(--ink-2) hover:bg-(--paper-2) hover:text-(--ink-1)'
                )}
              >
                <Icon size={18} className={cn("transition-colors", isActive ? "text-(--surge)" : "text-(--ink-3) group-hover:text-(--ink-1)")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="bg-(--paper-3) rounded-(--r-lg) p-4 border border-(--paper-edge)">
            <div className="text-mono text-[9px] text-(--ink-3) uppercase tracking-wider mb-2">Portfolio</div>
            <div className="font-display text-[22px] font-medium text-(--ink-1) mb-1">
              $50,000.00
            </div>
            <div className="font-secondary text-[13px] text-(--surge)">
              +$1.43 today
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-65 min-h-screen flex flex-col w-full min-w-0">
        {/* Top Bar */}
        <header className="min-h-14 md:min-h-20 px-3 sm:px-4 md:px-8 py-2 md:py-0 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-0 flex items-center justify-between border-b border-(--paper-edge) bg-(--paper-1)/80 backdrop-blur-md sticky top-0 z-30 overflow-x-clip">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              className="lg:hidden text-(--ink-2) hover:text-(--ink-1) mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-(--surge) to-(--sky) shrink-0"></div>
            <div className="text-mono text-[12px] text-(--ink-4) hidden sm:block">
              {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}` : 'Wallet not connected'}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 shrink-0">
            <div className="flex items-center gap-2">
              <span className="dot-live"></span>
              <span className="font-display text-[11px] font-medium text-(--ink-2) hidden sm:inline">COND ACTIVE</span>
            </div>
            <button className="text-(--ink-2) hover:text-(--ink-1) transition-colors" aria-label="Notifications">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-(--paper-edge) bg-(--paper-1)/95 backdrop-blur-md px-2 py-2">
          <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
            {mobilePrimaryNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-2 rounded-(--r-md) transition-colors',
                    active ? 'bg-(--surge-pale) text-(--surge)' : 'text-(--ink-2)'
                  )}
                >
                  <Icon size={16} className={active ? 'text-(--surge)' : 'text-(--ink-3)'} />
                  <span className="text-mono text-[9px] uppercase tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
