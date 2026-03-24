import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Search, ChevronDown, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { api, type BondBox } from '@/lib/api';

type SortOption = 'apy-desc' | 'apy-asc' | 'duration-asc' | 'duration-desc' | 'min-asc' | 'min-desc';

export function Bonds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allBonds, setAllBonds] = useState<BondBox[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('apy-desc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'apy-desc', label: 'Highest APY' },
    { value: 'apy-asc', label: 'Lowest APY' },
    { value: 'duration-asc', label: 'Shortest Duration' },
    { value: 'duration-desc', label: 'Longest Duration' },
    { value: 'min-asc', label: 'Lowest Min. Invest' },
    { value: 'min-desc', label: 'Highest Min. Invest' },
  ];

  const selectedSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? 'Highest APY';

  // Fetch bond boxes from API
  useEffect(() => {
    api.getBoxes()
      .then((boxes) => {
        setAllBonds(boxes);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch bond boxes:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        '.bond-card',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
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
  }, [allBonds, search, sortBy]);

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
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="w-full sm:w-[210px] flex items-center justify-between pl-4 pr-10 py-2 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] hover:border-[var(--surge-pale-2)] focus:outline-none focus:border-[var(--surge-pale-2)] focus:ring-1 focus:ring-[var(--surge-pale-2)] transition-all font-secondary text-[13px] text-[var(--ink-1)] cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={isSortOpen}
              >
                <span className="truncate">{selectedSortLabel}</span>
              </button>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-4)] pointer-events-none transition-transform ${isSortOpen ? 'rotate-180' : ''}`} size={14} />
              {isSortOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-full sm:w-[240px] z-20 paper-card p-1 rounded-[var(--r-md)]">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-[8px] font-secondary text-[13px] transition-colors ${
                        sortBy === option.value
                          ? 'bg-[var(--surge-pale)] text-[var(--surge)]'
                          : 'text-[var(--ink-2)] hover:bg-[var(--paper-3)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
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
                onClick={() => navigate(`/bonds/${bond.id}`)}
                className="bond-card bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] p-6 hover:-translate-y-1 hover:border-[var(--surge-pale-2)] hover:shadow-[0_8px_30px_var(--paper-shadow)] transition-all duration-300 cursor-pointer flex flex-col group"
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

                <div className="mt-4 pt-4 border-t border-[var(--paper-edge)] text-center">
                  <span className="text-mono text-[11px] text-[var(--ink-4)] group-hover:text-[var(--surge)] transition-colors uppercase tracking-wider">
                    View Details →
                  </span>
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
