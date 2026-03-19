import React, { useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Search, ChevronDown, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';

const allBonds = [
  { id: '1', flag: '🇺🇸', name: 'US Treasury 10Y', type: 'Government', risk: 'Low', apy: 4.2, duration: 10, min: 100 },
  { id: '2', flag: '🏢', name: 'Corporate Bond A', type: 'Corporate', risk: 'Medium', apy: 6.5, duration: 5, min: 500 },
  { id: '3', flag: '🌍', name: 'Emerging Market B', type: 'Sovereign', risk: 'High', apy: 12.0, duration: 3, min: 1000 },
  { id: '4', flag: '🌱', name: 'Green Energy Fund', type: 'Corporate', risk: 'Medium', apy: 7.8, duration: 7, min: 250 },
  { id: '5', flag: '💻', name: 'Tech Growth Bond', type: 'Corporate', risk: 'High', apy: 15.5, duration: 2, min: 5000 },
  { id: '6', flag: '🇩🇪', name: 'German Bund 2027', type: 'Government', risk: 'Low', apy: 3.84, duration: 3, min: 100 },
];

type SortOption = 'apy-desc' | 'apy-asc' | 'duration-asc' | 'duration-desc' | 'min-asc' | 'min-desc';

export function Bonds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('apy-desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        '.bond-card',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const filteredAndSortedBonds = useMemo(() => {
    let result = allBonds.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.type.toLowerCase().includes(search.toLowerCase()));
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'apy-desc': return b.apy - a.apy;
        case 'apy-asc': return a.apy - b.apy;
        case 'duration-asc': return a.duration - b.duration;
        case 'duration-desc': return b.duration - a.duration;
        case 'min-asc': return a.min - b.min;
        case 'min-desc': return b.min - a.min;
        default: return 0;
      }
    });
    
    return result;
  }, [search, sortBy]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto" ref={containerRef}>
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-[32px] font-display font-medium text-[var(--ink-1)] tracking-tight">
            Bond Market
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" size={16} />
              <input 
                type="text" 
                placeholder="Search bonds..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[240px] pl-9 pr-4 py-2 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] focus:outline-none focus:border-[var(--surge-pale-2)] focus:ring-1 focus:ring-[var(--surge-pale-2)] transition-all font-secondary text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-4)]"
              />
            </div>
            <div className="relative flex items-center">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-4 pr-10 py-2 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] focus:outline-none focus:border-[var(--surge-pale-2)] focus:ring-1 focus:ring-[var(--surge-pale-2)] transition-all font-secondary text-[13px] text-[var(--ink-1)] cursor-pointer"
              >
                <option value="apy-desc">Highest APY</option>
                <option value="apy-asc">Lowest APY</option>
                <option value="duration-asc">Shortest Duration</option>
                <option value="duration-desc">Longest Duration</option>
                <option value="min-asc">Lowest Min. Invest</option>
                <option value="min-desc">Highest Min. Invest</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)] pointer-events-none" size={14} />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[220px] w-full rounded-[var(--r-xl)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBonds.map((bond) => (
              <div 
                key={bond.id} 
                className="bond-card bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] p-6 hover:-translate-y-1 hover:border-[var(--surge-pale-2)] hover:shadow-[0_8px_30px_var(--paper-shadow)] transition-all duration-300 cursor-pointer flex flex-col"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">{bond.flag}</span>
                  <h3 className="font-display font-medium text-[16px] text-[var(--ink-1)]">{bond.name}</h3>
                </div>
                
                <div className="flex items-end justify-between mb-8 flex-1">
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1 uppercase tracking-wider flex items-center gap-1">
                      Current APY
                      <Tooltip content="Annual Percentage Yield. The expected return over one year.">
                        <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="font-display text-[32px] font-medium text-[var(--surge)] leading-none">{bond.apy.toFixed(1)}%</div>
                  </div>
                  <Tooltip content={`Risk assessment based on historical volatility and issuer credit rating.`}>
                    <div className={`px-3 py-1 rounded-full border text-mono text-[10px] uppercase tracking-wider cursor-help ${
                      bond.risk === 'Low' ? 'bg-[var(--surge-pale)] border-[var(--surge-pale-2)] text-[var(--surge)]' :
                      bond.risk === 'Medium' ? 'bg-[var(--amber-pale)] border-[var(--amber-pale-2)] text-[var(--amber)]' :
                      'bg-[var(--rose-pale)] border-[var(--rose-pale-2)] text-[var(--rose)]'
                    }`}>
                      {bond.risk} Risk
                    </div>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--paper-edge)]">
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1 uppercase tracking-wider flex items-center gap-1">
                      Duration
                      <Tooltip content="The time until the bond matures and the principal is repaid.">
                        <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="font-secondary text-[14px] text-[var(--ink-1)]">{bond.duration} Years</div>
                  </div>
                  <div>
                    <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1 uppercase tracking-wider flex items-center gap-1">
                      Min Invest
                      <Tooltip content="The minimum amount required to purchase this bond.">
                        <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="font-secondary text-[14px] text-[var(--ink-1)]">${bond.min.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAndSortedBonds.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-[var(--ink-3)] font-secondary text-[15px]">No bonds found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
