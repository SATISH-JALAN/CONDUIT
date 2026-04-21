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
import { usePortfolioStore } from '@/stores/portfolioStore';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { publicKey } = useWalletStore();
  const { totalValue, totalYieldPerSecond, setWallet: setPortfolioWallet, fetchPositions } = usePortfolioStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split('/')[1];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Stream';
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!publicKey) return;
    setPortfolioWallet(publicKey);
    void fetchPositions({ quiet: true });
  }, [publicKey, setPortfolioWallet, fetchPositions]);

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

  return (
    <div className="min-h-screen bg-(--paper-1) flex">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-(--ink-1)/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        "w-65 fixed top-0 left-0 h-screen frosted-heavy border-r border-(--paper-edge) flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-2 flex items-center justify-between overflow-hidden">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Conduit" className="h-35 w-auto object-contain -my-10 -ml-7" />
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
            const isActive = location.pathname === item.path || (location.pathname === '/dashboard' && item.name === 'Stream');
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-(--r-md) font-display text-[12px] transition-all duration-200 group',
                  isActive 
                    ? 'bg-(--surge-pale) border-l-2 border-(--surge) text-(--surge)' 
                    : 'text-(--ink-3) hover:bg-(--paper-3) hover:text-(--ink-1)'
                )}
              >
                <Icon size={18} className={cn("transition-colors", isActive ? "text-(--surge)" : "text-(--ink-4) group-hover:text-(--ink-2)")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="bg-(--paper-3) rounded-(--r-lg) p-4 border border-(--paper-edge)">
            <div className="text-mono text-[9px] text-(--ink-4) uppercase tracking-wider mb-2">Portfolio</div>
            <div className="font-display text-[22px] font-medium text-(--ink-1) mb-1">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="font-secondary text-[13px] text-(--surge)">
              +${(totalYieldPerSecond * 86400).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-65 min-h-screen flex flex-col w-full">
        {/* Top Bar */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-(--paper-edge) bg-(--paper-1)/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-(--ink-3) hover:text-(--ink-1) mr-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-(--surge) to-(--sky) shrink-0"></div>
            <div className="text-mono text-[12px] text-(--ink-4) hidden sm:block">
              {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}` : 'Wallet not connected'}
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="dot-live"></span>
              <span className="font-display text-[11px] font-medium text-(--ink-2) hidden sm:inline">COND ACTIVE</span>
            </div>
            <button className="text-(--ink-3) hover:text-(--ink-1) transition-colors">
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
