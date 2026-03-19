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
  Settings,
  Bell,
  Menu,
  X
} from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split('/')[1];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Stream';
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Stream', path: '/dashboard', icon: Zap },
    { name: 'Bonds', path: '/bonds', icon: Wallet },
    { name: 'COND', path: '/agent', icon: Bot },
    { name: 'Race', path: '/race', icon: Flag },
    { name: 'NFTs', path: '/nfts', icon: ImageIcon },
    { name: 'Creators', path: '/creators', icon: Users },
    { name: 'Settings', path: '#', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--paper-1)] flex">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[var(--ink-1)]/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        "w-[260px] fixed top-0 left-0 h-screen frosted-heavy border-r border-[var(--paper-edge)] flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-[18px] tracking-tight text-[var(--ink-1)]">
              CONDUIT
            </span>
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--surge)] mt-2"></span>
          </Link>
          <button 
            className="lg:hidden text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (location.pathname === '/dashboard' && item.name === 'Stream');
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--r-md)] font-display text-[12px] transition-all duration-200 group',
                  isActive 
                    ? 'bg-[var(--surge-pale)] border-l-2 border-[var(--surge)] text-[var(--surge)]' 
                    : 'text-[var(--ink-3)] hover:bg-[var(--paper-3)] hover:text-[var(--ink-1)]'
                )}
              >
                <Icon size={18} className={cn("transition-colors", isActive ? "text-[var(--surge)]" : "text-[var(--ink-4)] group-hover:text-[var(--ink-2)]")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="bg-[var(--paper-3)] rounded-[var(--r-lg)] p-4 border border-[var(--paper-edge)]">
            <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase tracking-wider mb-2">Portfolio</div>
            <div className="font-display text-[22px] font-medium text-[var(--ink-1)] mb-1">
              $50,000.00
            </div>
            <div className="font-secondary text-[13px] text-[var(--surge)]">
              +$1.43 today
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-[260px] min-h-screen flex flex-col w-full">
        {/* Top Bar */}
        <header className="h-[80px] px-4 md:px-8 flex items-center justify-between border-b border-[var(--paper-edge)] bg-[var(--paper-1)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-[var(--ink-3)] hover:text-[var(--ink-1)] mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--surge)] to-[var(--sky)] shrink-0"></div>
            <div className="text-mono text-[12px] text-[var(--ink-4)] hidden sm:block">0x7F...3A92</div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="dot-live"></span>
              <span className="font-display text-[11px] font-medium text-[var(--ink-2)] hidden sm:inline">COND ACTIVE</span>
            </div>
            <button className="text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
