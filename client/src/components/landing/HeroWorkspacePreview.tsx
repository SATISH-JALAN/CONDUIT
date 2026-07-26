import { TiltCard } from '@/components/ui/TiltCard';
import { Activity, ShieldCheck, Zap, Cpu, CheckCircle2 } from 'lucide-react';

interface StrategyOption {
  id: string;
  name: string;
  apy: number;
  label: string;
  asset: string;
  color: string;
}

const STRATEGIES: StrategyOption[] = [
  { id: 'tbills', name: 'Safe Harbor', apy: 4.80, label: 'T-Bills', asset: 'USDY', color: 'var(--sky)' },
  { id: 'allweather', name: 'All Weather', apy: 5.21, label: 'Balanced', asset: 'BENJI', color: 'var(--surge)' },
  { id: 'yieldmax', name: 'Yield Max', apy: 7.10, label: 'High Carry', asset: 'COND-VAULT', color: 'var(--amber)' },
];

interface HeroWorkspacePreviewProps {
  counterIntRef: React.RefObject<HTMLSpanElement | null>;
  counterDecRef: React.RefObject<HTMLSpanElement | null>;
  pendingRef: React.RefObject<HTMLSpanElement | null>;
  selectedStrategy: StrategyOption;
  onSelectStrategy: (strat: StrategyOption) => void;
}

export function HeroWorkspacePreview({
  counterIntRef,
  counterDecRef,
  pendingRef,
  selectedStrategy,
  onSelectStrategy,
}: HeroWorkspacePreviewProps) {
  return (
    <div className="relative hero-counter-card w-full max-w-4xl lg:max-w-5xl mx-auto">
      {/* Soft ambient glow behind dashboard */}
      <div className="absolute inset-4 bg-[var(--surge)] rounded-[32px] filter blur-[40px] opacity-[0.12] pointer-events-none" />

      <TiltCard className="chrome-border paper-card-elevated p-6 sm:p-8 relative z-10 overflow-hidden shadow-xl rounded-[28px] border border-[var(--paper-edge)]">
        {/* Subtle radial sheen */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle,rgba(0,122,94,0.06),transparent_70%)] pointer-events-none" />

        {/* Dashboard Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--paper-edge)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-2 font-mono text-[10.5px] text-[var(--ink-3)] font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <Cpu size={13} className="text-[var(--surge)]" /> conduit.live — soroban vault
            </span>
          </div>

          {/* Strategy Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-[var(--paper-2)] p-1 rounded-full border border-[var(--paper-edge)]">
            {STRATEGIES.map((strat) => {
              const isSelected = selectedStrategy.id === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => onSelectStrategy(strat)}
                  className={`px-3 py-1 rounded-full text-mono text-[10px] font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--paper-0)] text-[var(--ink-1)] shadow-sm border border-[var(--paper-edge)]'
                      : 'text-[var(--ink-4)] hover:text-[var(--ink-2)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: strat.color }}
                  />
                  <span>{strat.name}</span>
                  <span style={{ color: strat.color }}>{strat.apy.toFixed(1)}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Active Position Display */}
        <div className="bg-[var(--paper-0)] border border-[var(--paper-edge)] rounded-[20px] p-6 sm:p-8 mb-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.16em] font-semibold">
              Active Position Value
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surge-pale)] border border-[var(--surge-pale-2)]">
              <span className="dot-live" />
              <span className="text-mono text-[10px] text-[var(--surge)] font-bold tracking-wider">
                +${(selectedStrategy.apy * 10000 / 365 / 86400).toFixed(6)}/sec
              </span>
            </div>
          </div>

          {/* Big Ticking Numbers */}
          <div className="flex items-baseline flex-wrap mb-4">
            <span
              ref={counterIntRef}
              className="font-display text-[clamp(34px,4.5vw,52px)] font-bold text-[var(--ink-1)] tabular-nums tracking-[-0.04em] leading-none"
            >
              $10,000
            </span>
            <span
              ref={counterDecRef}
              className="font-mono text-[clamp(18px,2.5vw,28px)] text-[var(--surge)] tabular-nums leading-none font-bold ml-0.5"
            >
              .000000
            </span>
          </div>

          {/* Live Progress Stream */}
          <div className="space-y-2 pt-4 border-t border-[var(--paper-edge)]">
            <div className="flex justify-between text-mono text-[10.5px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-[var(--ink-3)] font-medium">
                <Activity size={13} className="text-[var(--surge)]" /> Streaming Real-Time Yield
              </span>
              <span ref={pendingRef} className="text-[var(--surge)] font-bold">+$0.0000</span>
            </div>
            <div className="h-1.5 bg-[var(--paper-3)] rounded-full overflow-hidden">
              <div className="stream-bar-fill" />
            </div>
          </div>
        </div>

        {/* Bottom Uncluttered Telemetry Strip */}
        <div className="grid grid-cols-3 gap-3 text-center text-mono text-[10.5px] pt-1">
          <div className="flex items-center justify-center gap-1.5 text-[var(--ink-3)]">
            <Zap size={13} className="text-[var(--surge)] shrink-0" />
            <span>5s Settlement</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[var(--ink-3)]">
            <ShieldCheck size={13} className="text-[var(--sky)] shrink-0" />
            <span>Non-Custodial</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[var(--ink-3)]">
            <CheckCircle2 size={13} className="text-[var(--surge)] shrink-0" />
            <span>On-Chain Verified</span>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
