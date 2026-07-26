import { useState, useMemo, useEffect, useRef } from 'react';
import { yieldPerDay, yieldPerSecond, calculateValue } from '@/lib/formula';
import type { Anchor } from '@/lib/formula';

const DEPOSIT_PRESETS = [1000, 10000, 50000, 100000];
const APY_PRESETS = [
  { label: 'Safe Harbor', apy: 480, display: '4.80%' },
  { label: 'All Weather', apy: 560, display: '5.60%' },
  { label: 'Yield Max', apy: 710, display: '7.10%' },
];

export function YieldCalculatorWidget() {
  const [principal, setPrincipal] = useState(10000);
  const [apyBps, setApyBps] = useState(560); // Default 5.60% (All Weather)

  // Live ticking counter inside calculator
  const liveCounterRef = useRef<HTMLSpanElement>(null);
  const startMsRef = useRef<number>(Date.now());

  const anchor: Anchor = useMemo(() => ({
    principal,
    apy_bps: apyBps,
    sync_ts: startMsRef.current / 1000,
    box_id: 'calc',
  }), [principal, apyBps]);

  const daily = yieldPerDay(anchor);
  const perSec = yieldPerSecond(anchor);

  // Reset live start time when principal or APY changes
  useEffect(() => {
    startMsRef.current = Date.now();
  }, [principal, apyBps]);

  // Live ticking loop
  useEffect(() => {
    let animId: number;
    const tick = () => {
      const currentVal = calculateValue({
        principal,
        apy_bps: apyBps,
        sync_ts: startMsRef.current / 1000,
        box_id: 'calc',
      });
      const yieldEarned = currentVal - principal;
      if (liveCounterRef.current) {
        liveCounterRef.current.textContent = '+$' + yieldEarned.toFixed(6);
      }
      animId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(animId);
  }, [principal, apyBps]);

  // Generate 12-month projection points
  // We normalize Y relative to max yield at 10% APY so curve slope visually changes with APY slider!
  const curvePoints = useMemo(() => {
    const points: { month: number; val: number; yieldVal: number }[] = [];
    const startTs = Date.now();
    for (let month = 0; month <= 12; month++) {
      const futureMs = startTs + month * 30 * 24 * 60 * 60 * 1000;
      const val = calculateValue(anchor, futureMs);
      points.push({ month, val, yieldVal: val - principal });
    }
    return points;
  }, [anchor, principal]);

  // Max 12mo yield potential at max APY (7.1%) for visual scaling comparison
  const maxPotentialYield = useMemo(() => {
    const maxAnchor: Anchor = {
      principal,
      apy_bps: 710,
      sync_ts: Date.now() / 1000,
      box_id: 'calc',
    };
    const yearEndMs = Date.now() + 365 * 86400 * 1000;
    return calculateValue(maxAnchor, yearEndMs) - principal;
  }, [principal]);

  const yearEndYield = curvePoints[12].yieldVal;

  // SVG Chart Dimensions
  const svgW = 400;
  const svgH = 120;
  const padX = 10;
  const padBottom = 20;
  const padTop = 15;
  const chartH = svgH - padTop - padBottom;

  // Map yield value to SVG Y coordinate
  // Baseline (0 yield) is at padTop + chartH
  // Max potential yield (7.1%) reaches padTop
  const getSvgY = (yieldVal: number) => {
    const ratio = maxPotentialYield > 0 ? Math.min(1, yieldVal / maxPotentialYield) : 0;
    return padTop + chartH - ratio * chartH;
  };

  const pathD = curvePoints
    .map((p, i) => {
      const x = padX + (p.month / 12) * (svgW - 2 * padX);
      const y = getSvgY(p.yieldVal);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaD = `${pathD} L${(svgW - padX).toFixed(1)},${(padTop + chartH).toFixed(1)} L${padX},${(padTop + chartH).toFixed(1)} Z`;

  const depositPercent = ((principal - 500) / 99500) * 100;
  const apyPercent = ((apyBps - 300) / 410) * 100;

  return (
    <div className="relative z-10 space-y-6">
      {/* 2-Column Desktop Grid inside Calculator */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Sliders & Presets */}
        <div className="space-y-6">
          {/* Deposit Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-mono text-[11px] text-[var(--ink-4)] uppercase tracking-[0.14em]">
                Deposit Amount
              </label>
              <span className="font-display text-[22px] font-bold text-[var(--ink-1)] tabular-nums">
                ${principal.toLocaleString()}
              </span>
            </div>

            <div className="relative py-2">
              <input
                type="range"
                min={500}
                max={100000}
                step={500}
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full accent-[var(--surge)] h-2 rounded-full appearance-none cursor-pointer relative z-10"
                style={{
                  background: `linear-gradient(to right, var(--surge) 0%, var(--surge) ${depositPercent}%, var(--paper-edge) ${depositPercent}%, var(--paper-edge) 100%)`,
                }}
              />
            </div>

            {/* Quick Deposit Presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              {DEPOSIT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPrincipal(amt)}
                  className={`px-2.5 py-1 rounded-[var(--r-sm)] text-mono text-[10px] transition-all ${
                    principal === amt
                      ? 'bg-[var(--surge)] text-white font-semibold shadow-sm'
                      : 'bg-[var(--paper-1)] border border-[var(--paper-edge)] text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:border-[var(--surge-pale-2)]'
                  }`}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* APY Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-mono text-[11px] text-[var(--ink-4)] uppercase tracking-[0.14em]">
                Target APY
              </label>
              <span className="font-display text-[22px] font-bold text-[var(--surge)] tabular-nums">
                {(apyBps / 100).toFixed(2)}%
              </span>
            </div>

            <div className="relative py-2">
              <input
                type="range"
                min={300}
                max={710}
                step={10}
                value={apyBps}
                onChange={(e) => setApyBps(Number(e.target.value))}
                className="w-full accent-[var(--surge)] h-2 rounded-full appearance-none cursor-pointer relative z-10"
                style={{
                  background: `linear-gradient(to right, var(--surge) 0%, var(--surge) ${apyPercent}%, var(--paper-edge) ${apyPercent}%, var(--paper-edge) 100%)`,
                }}
              />
            </div>

            {/* Strategy APY Presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              {APY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setApyBps(p.apy)}
                  className={`px-2.5 py-1 rounded-[var(--r-sm)] text-mono text-[10px] transition-all ${
                    apyBps === p.apy
                      ? 'bg-[var(--surge-pale)] border border-[var(--surge-pale-2)] text-[var(--surge)] font-semibold'
                      : 'bg-[var(--paper-1)] border border-[var(--paper-edge)] text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                  }`}
                >
                  {p.label} ({p.display})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic SVG Projection Chart & Live Ticker */}
        <div className="space-y-4">
          <div className="bg-[var(--paper-0)] border border-[var(--paper-edge)] rounded-[var(--r-md)] p-4 relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="text-mono text-[10px] text-[var(--ink-4)] uppercase tracking-[0.14em]">
                12-Month Projected Growth
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--surge-pale)] text-mono text-[9px] text-[var(--surge)]">
                <span className="dot-live" />
                <span ref={liveCounterRef} className="font-medium tabular-nums">+$0.000000</span>
              </div>
            </div>

            {/* SVG Chart */}
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" preserveAspectRatio="none">
              <defs>
                <linearGradient id="calcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--surge)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--surge)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Baseline (Principal line) */}
              <line
                x1={padX}
                y1={padTop + chartH}
                x2={svgW - padX}
                y2={padTop + chartH}
                stroke="var(--paper-edge)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Area under curve */}
              <path d={areaD} fill="url(#calcGrad)" />

              {/* Growth Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--surge)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* End Dot */}
              {(() => {
                const endX = svgW - padX;
                const endY = getSvgY(yearEndYield);
                return (
                  <g>
                    <circle cx={endX} cy={endY} r="5" fill="var(--surge)" />
                    <circle cx={endX} cy={endY} r="9" fill="var(--surge)" opacity="0.25" />
                  </g>
                );
              })()}
            </svg>

            {/* Chart Legend Labels */}
            <div className="flex justify-between text-mono text-[9px] text-[var(--ink-4)] mt-2">
              <span>Month 0 (${principal.toLocaleString()})</span>
              <span className="text-[var(--surge)] font-medium">Month 12 (+${yearEndYield.toFixed(0)})</span>
            </div>
          </div>

          {/* Results Summary Cards */}
          <div className="grid grid-cols-3 gap-px bg-[var(--paper-edge)] rounded-[var(--r-md)] overflow-hidden">
            <div className="bg-[var(--paper-0)] p-3.5 text-center">
              <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 tracking-wider">Per Second</div>
              <div className="font-display text-[15px] text-[var(--surge)] font-bold tabular-nums">
                ${perSec.toFixed(6)}
              </div>
            </div>
            <div className="bg-[var(--paper-0)] p-3.5 text-center">
              <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 tracking-wider">Daily</div>
              <div className="font-display text-[15px] text-[var(--ink-1)] font-bold tabular-nums">
                ${daily.toFixed(2)}
              </div>
            </div>
            <div className="bg-[var(--paper-0)] p-3.5 text-center">
              <div className="text-mono text-[9px] text-[var(--ink-4)] uppercase mb-1 tracking-wider">12 Month Gain</div>
              <div className="font-display text-[15px] text-[var(--amber)] font-bold tabular-nums">
                +${yearEndYield.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
