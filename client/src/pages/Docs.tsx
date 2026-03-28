import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DocSection = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  content: React.ReactNode;
};

const FLOW_STEPS = [
  {
    id: 'step-1',
    title: 'Connect Wallet',
    route: '/onboarding',
    userAction: 'Connect Freighter-compatible wallet.',
    systemAction: 'Session starts, wallet is linked to profile context.',
  },
  {
    id: 'step-2',
    title: 'Pick Bond Box',
    route: '/bonds',
    userAction: 'Compare boxes and APY profile.',
    systemAction: 'Selected box details and deposit action become available.',
  },
  {
    id: 'step-3',
    title: 'Deposit Funds',
    route: '/bonds/:id',
    userAction: 'Enter amount and sign transaction.',
    systemAction: 'Position is created and starts accruing yield.',
  },
  {
    id: 'step-4',
    title: 'Track Dashboard',
    route: '/dashboard',
    userAction: 'Monitor value, pending yield, and APY.',
    systemAction: 'Live counters and portfolio metrics update continuously.',
  },
  {
    id: 'step-5',
    title: 'Configure Split',
    route: '/dashboard',
    userAction: 'Set destination wallets and percentages.',
    systemAction: 'Config is validated and saved for future harvests.',
  },
  {
    id: 'step-6',
    title: 'Harvest Yield',
    route: '/dashboard',
    userAction: 'Click harvest and sign transaction.',
    systemAction: 'Gross yield -> fee policy -> split distribution.',
  },
  {
    id: 'step-7',
    title: 'View Race',
    route: '/race',
    userAction: 'Open leaderboard and compare rank.',
    systemAction: 'Latest standings and active race window are shown.',
  },
  {
    id: 'step-8',
    title: 'Join Race',
    route: '/race',
    userAction: 'Pay entry fee if user wants prize eligibility.',
    systemAction: 'Entry is recorded; user becomes prize-eligible.',
  },
];

const YIELD_GROWTH_DEMO = [
  { day: 'D1', portfolio: 10000, yield: 0 },
  { day: 'D5', portfolio: 10007.1, yield: 7.1 },
  { day: 'D10', portfolio: 10014.3, yield: 14.3 },
  { day: 'D15', portfolio: 10021.4, yield: 21.4 },
  { day: 'D20', portfolio: 10028.6, yield: 28.6 },
  { day: 'D25', portfolio: 10035.7, yield: 35.7 },
  { day: 'D30', portfolio: 10042.9, yield: 42.9 },
];

const HARVEST_BREAKDOWN_DEMO = [
  { stage: 'Gross Yield', amount: 100 },
  { stage: 'Protocol Fee', amount: 0.05 },
  { stage: 'Net To User Splits', amount: 99.95 },
];

const REVENUE_MIX_YEAR1 = [
  { stream: 'COND Pro', value: 216, label: '$216K' },
  { stream: 'Management Fee', value: 25, label: '$25K' },
  { stream: 'AMM Share', value: 40, label: '$40K' },
  { stream: 'Race Entry Share', value: 12, label: '$12K' },
];

const REVENUE_COLORS = ['#007A5E', '#0369A1', '#B45309', '#9F1239'];

const GLOSSARY = [
  {
    term: 'APY',
    definition: 'Annual Percentage Yield. It estimates yearly return assuming current rate conditions.',
  },
  {
    term: 'AUM',
    definition: 'Assets Under Management. Total user capital managed by the protocol.',
  },
  {
    term: 'Bond Box',
    definition: 'A product container where deposits follow a specific bond-backed yield strategy.',
  },
  {
    term: 'Harvest',
    definition: 'User-triggered action to realize accrued yield and distribute it to destinations.',
  },
  {
    term: 'Split Config',
    definition: 'Rules that set destination wallets and percentages for harvested yield routing.',
  },
  {
    term: 'TVL',
    definition: 'Total Value Locked. Combined value of active user positions in a given context.',
  },
  {
    term: 'Yield Race',
    definition: 'Competitive leaderboard mode where optional paid entrants become prize-eligible.',
  },
  {
    term: 'COND',
    definition: 'Conduit intelligent agent layer. Rule mode is basic; advanced reasoning is Pro-oriented.',
  },
];

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'What Is Conduit?',
    summary: 'Conduit is a Stellar-native platform for bond-backed yield with continuous visibility and user-controlled distribution.',
    keywords: ['overview', 'conduit', 'platform', 'what is conduit'],
    content: (
      <>
        <p className="font-body text-[15px] leading-[1.8] text-(--ink-2)">
          Conduit lets users deposit into Bond Boxes backed by real-world bond strategies and receive yield over time,
          not just as occasional payouts. The platform combines on-chain transparency with a simple consumer interface.
        </p>
        <p className="font-body text-[15px] leading-[1.8] text-(--ink-2) mt-3">
          If you are brand new, think of Conduit as a guided lane: you deposit once, monitor earnings live, decide where
          harvested yield should go, and optionally compete in the race layer.
        </p>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Core Promise</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Transparent yield, continuously visible.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Chain</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Built on Stellar with low-cost execution.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">User Goal</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Invest, harvest, split, and track performance.</div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'getting-started-fast',
    title: 'Getting Started Fast (2 Minutes)',
    summary: 'A zero-confusion checklist for first-time users.',
    keywords: ['quick start', 'beginner', 'new user', '2 minutes'],
    content: (
      <div className="grid md:grid-cols-2 gap-3">
        <div className="paper-card p-4">
          <div className="flex items-center gap-2 text-(--surge)">
            <CheckCircle2 size={16} />
            <span className="text-mono text-[10px] uppercase tracking-wider">Step 1</span>
          </div>
          <h4 className="font-display text-[17px] mt-2 text-(--ink-1)">Connect Wallet</h4>
          <p className="font-secondary text-[14px] mt-2 text-(--ink-2)">Use the onboarding flow and approve connection.</p>
        </div>
        <div className="paper-card p-4">
          <div className="flex items-center gap-2 text-(--surge)">
            <CheckCircle2 size={16} />
            <span className="text-mono text-[10px] uppercase tracking-wider">Step 2</span>
          </div>
          <h4 className="font-display text-[17px] mt-2 text-(--ink-1)">Deposit In Bonds</h4>
          <p className="font-secondary text-[14px] mt-2 text-(--ink-2)">Pick a Bond Box, enter amount, sign once.</p>
        </div>
        <div className="paper-card p-4">
          <div className="flex items-center gap-2 text-(--surge)">
            <CheckCircle2 size={16} />
            <span className="text-mono text-[10px] uppercase tracking-wider">Step 3</span>
          </div>
          <h4 className="font-display text-[17px] mt-2 text-(--ink-1)">Watch Dashboard</h4>
          <p className="font-secondary text-[14px] mt-2 text-(--ink-2)">See value and pending yield update in real time.</p>
        </div>
        <div className="paper-card p-4">
          <div className="flex items-center gap-2 text-(--surge)">
            <CheckCircle2 size={16} />
            <span className="text-mono text-[10px] uppercase tracking-wider">Step 4</span>
          </div>
          <h4 className="font-display text-[17px] mt-2 text-(--ink-1)">Harvest + Split</h4>
          <p className="font-secondary text-[14px] mt-2 text-(--ink-2)">Collect yield and route it with split rules.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'feature-coverage',
    title: 'Current Feature Coverage (1 to 5)',
    summary: 'What users can do right now in the product and what each feature unlocks.',
    keywords: ['feature', 'roadmap', 'feature 5', 'leaderboard', 'race'],
    content: (
      <>
        <ul className="space-y-2 text-[15px] text-(--ink-2) font-secondary list-disc pl-6 leading-[1.8]">
          <li>Feature 1: Deposit into Bond Boxes and create a live-yield position.</li>
          <li>Feature 2: Track continuously accruing yield in dashboard counters.</li>
          <li>Feature 3: Harvest yield with wallet signature and status feedback.</li>
          <li>Feature 4: Configure split destinations and percentages for harvest routing.</li>
          <li>Feature 5: View leaderboard and join Yield Race with optional paid entry.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-flow-diagram',
    title: 'End-To-End User Flow Diagram (Feature 1 to 5)',
    summary: 'Clickable visual progression from first visit to race participation.',
    keywords: ['diagram', 'flow', 'user flow', 'journey', 'feature 5'],
    content: (
      <>
        <div className="max-w-full overflow-x-auto pb-2" data-lenis-prevent>
          <div className="w-max min-w-full flex flex-nowrap items-center gap-2 pr-2">
            {FLOW_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <a
                  href={`#${step.id}`}
                  className="paper-card p-4 w-52 shrink-0 hover:border-(--surge-pale-2) transition-colors"
                >
                  <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Step {index + 1}</div>
                  <div className="font-display text-[16px] text-(--ink-1) mt-1">{step.title}</div>
                  <div className="font-secondary text-[12px] text-(--ink-3) mt-1">{step.route}</div>
                </a>
                {index < FLOW_STEPS.length - 1 && (
                  <ArrowRight size={16} className="text-(--ink-4) shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {FLOW_STEPS.map((step, index) => (
            <div id={step.id} key={step.id} className="paper-card p-4 scroll-mt-24">
              <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Step {index + 1}</div>
              <h4 className="font-display text-[17px] text-(--ink-1) mt-1">{step.title}</h4>
              <p className="font-secondary text-[14px] text-(--ink-2) mt-2">
                <span className="text-(--ink-1) font-medium">User does:</span> {step.userAction}
              </p>
              <p className="font-secondary text-[14px] text-(--ink-2) mt-1">
                <span className="text-(--ink-1) font-medium">System does:</span> {step.systemAction}
              </p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'core-definitions',
    title: 'Core Definitions',
    summary: 'Clear definitions for every term users commonly ask about.',
    keywords: ['definitions', 'bond', 'bond box', 'harvest', 'split config', 'apy', 'tvl'],
    content: (
      <div className="space-y-4">
        <div className="paper-card p-4">
          <h4 className="font-display text-[18px] text-(--ink-1)">Bond Box</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">
            A strategy container in Conduit where user deposits are allocated to bond-backed yield products.
          </p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[18px] text-(--ink-1)">Yield</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">
            Earnings generated from the underlying bond strategy. Conduit displays this as continuously accruing value.
          </p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[18px] text-(--ink-1)">Harvest</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">
            The action that realizes accumulated yield and distributes it according to the user configuration.
          </p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[18px] text-(--ink-1)">Split Config</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">
            User-defined rules that route harvested yield across one or more destination wallets by percentage.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'how-the-money-moves',
    title: 'How Money Moves Through Conduit',
    summary: 'A simple financial lifecycle so users understand what happens after deposit.',
    keywords: ['money flow', 'deposit', 'yield flow', 'distribution', 'lifecycle'],
    content: (
      <div className="space-y-3">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">1) Deposit</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">User deposit enters selected Bond Box strategy.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">2) Accrual</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Yield accrues over time and appears as pending value in dashboard.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">3) Harvest</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">User signs harvest transaction to realize accrued yield.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">4) Distribution</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Net yield is routed according to split config destinations and percentages.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'first-time-flow',
    title: 'First-Time User Flow',
    summary: 'Full spoon-fed path for a beginner from first visit to first reward loop.',
    keywords: ['beginner', 'onboarding', 'first time', 'how to use'],
    content: (
      <div className="space-y-3">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Session 1 Goal</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Reach first successful deposit and confirm live pending yield.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Session 2 Goal</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Set split config and execute first harvest.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Session 3 Goal</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Open Race page, compare rank, optionally join active race.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'how-to-invest',
    title: 'How To Invest Through Conduit',
    summary: 'Detailed step-by-step instructions with expected outcomes at each stage.',
    keywords: ['invest', 'deposit', 'portfolio', 'bond box'],
    content: (
      <div className="space-y-4">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 1: Connect Wallet</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Use Freighter-compatible wallet and approve connection.</p>
          <p className="font-secondary text-[13px] text-(--ink-3) mt-1">Expected result: wallet fingerprint appears in navigation header.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 2: Choose Bond Box</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Review APY profile and deposit amount before signing transaction.</p>
          <p className="font-secondary text-[13px] text-(--ink-3) mt-1">Expected result: selected box opens a deposit action with amount input.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 3: Monitor Performance</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Watch principal, pending yield, and overall value update in dashboard.</p>
          <p className="font-secondary text-[13px] text-(--ink-3) mt-1">Expected result: pending yield grows and total value moves upward over time.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 4: Harvest and Distribute</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Run harvest and receive distribution based on split config.</p>
          <p className="font-secondary text-[13px] text-(--ink-3) mt-1">Expected result: harvest status success and routed output to destinations.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'live-visuals',
    title: 'Visual Guides: Graphs and Metrics',
    summary: 'Interactive charts to help users understand accrual, harvest, and revenue design.',
    keywords: ['graph', 'chart', 'visual', 'yield growth', 'harvest breakdown'],
    content: (
      <div className="space-y-4">
        <div className="paper-card p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Illustrative Yield Accrual (Demo)</div>
          <div className="h-60 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={YIELD_GROWTH_DEMO}>
                <CartesianGrid stroke="var(--paper-edge)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--ink-4)" fontSize={11} />
                <YAxis stroke="var(--ink-4)" fontSize={11} />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="var(--surge)"
                  fill="var(--surge-pale)"
                  strokeWidth={2}
                  name="Yield (USD)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="font-secondary text-[12px] text-(--ink-4) mt-2">Demo-only chart to explain concept, not a guaranteed return forecast.</p>
        </div>

        <div className="paper-card p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Harvest Breakdown (Per $100 Demo Yield)</div>
          <div className="h-60 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HARVEST_BREAKDOWN_DEMO}>
                <CartesianGrid stroke="var(--paper-edge)" strokeDasharray="3 3" />
                <XAxis dataKey="stage" stroke="var(--ink-4)" fontSize={11} />
                <YAxis stroke="var(--ink-4)" fontSize={11} />
                <RechartsTooltip />
                <Bar dataKey="amount" fill="var(--sky)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'harvest-and-split',
    title: 'Harvest and Split Config Explained',
    summary: 'What happens technically during harvest and exactly how split configuration is applied.',
    keywords: ['harvest', 'split', 'config', 'distribution', 'wallet'],
    content: (
      <>
        <p className="font-body text-[15px] leading-[1.8] text-(--ink-2)">
          Harvest converts accrued yield into distributable output. The protocol applies fee logic first, then routes the net amount
          according to split rules. If no custom split is configured, yield defaults to the connected wallet destination.
        </p>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="paper-card p-4">
            <h4 className="font-display text-[16px] text-(--ink-1)">Validation Rules</h4>
            <ul className="space-y-1 mt-2 text-[14px] text-(--ink-2) font-secondary list-disc pl-5">
              <li>Total split must equal 100%.</li>
              <li>Every destination must be a valid wallet address.</li>
              <li>Empty labels are allowed, but clear labels are recommended.</li>
            </ul>
          </div>
          <div className="paper-card p-4">
            <h4 className="font-display text-[16px] text-(--ink-1)">Default Behavior</h4>
            <p className="font-secondary text-[14px] text-(--ink-2) mt-2">
              If split config is not set, harvested yield is routed to the connected wallet destination by default.
            </p>
          </div>
        </div>
        <div className="mt-4 bg-(--paper-2) border border-(--paper-edge) rounded-(--r-lg) p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider mb-2">Distribution Order</div>
          <ol className="space-y-1 text-[14px] text-(--ink-2) font-secondary list-decimal pl-5">
            <li>Calculate gross harvested yield.</li>
            <li>Apply protocol fee policy.</li>
            <li>Validate split percentages sum to 100%.</li>
            <li>Distribute net amount to configured destinations.</li>
          </ol>
        </div>
      </>
    ),
  },
  {
    id: 'yield-race',
    title: 'Yield Race (Feature 5)',
    summary: 'Leaderboard mechanics, paid entry behavior, and prize eligibility.',
    keywords: ['race', 'leaderboard', 'entry', 'prize pool', 'feature 5'],
    content: (
      <>
        <p className="font-body text-[15px] leading-[1.8] text-(--ink-2)">
          Every user can view leaderboard standings. Race entry is optional and paid. Users who enter become prize-eligible for
          the active race cycle.
        </p>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Open Access</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Leaderboard visibility for all users.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Entry Model</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">$5 entry, 80% prize pool and 20% protocol.</div>
          </div>
        </div>
        <div className="mt-4 paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Race Checklist For Users</h4>
          <ol className="space-y-1 mt-2 text-[14px] text-(--ink-2) font-secondary list-decimal pl-5">
            <li>Confirm wallet is connected.</li>
            <li>Open Race page and verify active race is available.</li>
            <li>Review current prize pool and countdown.</li>
            <li>Join race if user wants prize eligibility.</li>
          </ol>
        </div>
      </>
    ),
  },
  {
    id: 'fees-and-revenue',
    title: 'Fees and Revenue Transparency',
    summary: 'How Conduit makes money, with visual revenue mix and explicit no-hidden-fee policy.',
    keywords: ['fees', 'revenue', 'management fee', 'subscription', 'transparent'],
    content: (
      <>
        <ul className="space-y-2 text-[15px] text-(--ink-2) font-secondary list-disc pl-6 leading-[1.8]">
          <li>Management fee on AUM: 0.05% annualized.</li>
          <li>COND Pro subscription: $9.99/month (primary near-term focus).</li>
          <li>COND Institutional: $299/month tier.</li>
          <li>AMM protocol share, NFT marketplace fee, race entry share, creator pool fee, and institutional API pricing.</li>
        </ul>

        <div className="paper-card p-4 mt-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Illustrative Year 1 Revenue Mix (K USD)</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={REVENUE_MIX_YEAR1}
                  dataKey="value"
                  nameKey="stream"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {REVENUE_MIX_YEAR1.map((entry, index) => (
                    <Cell key={entry.stream} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {REVENUE_MIX_YEAR1.map((entry, index) => (
              <div key={entry.stream} className="flex items-center gap-2 text-[13px] text-(--ink-2)">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REVENUE_COLORS[index % REVENUE_COLORS.length] }}></span>
                <span className="font-secondary">{entry.stream}</span>
                <span className="font-mono text-(--ink-4)">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 bg-(--surge-pale) border border-(--surge-pale-2) rounded-(--r-lg) p-4">
          <div className="font-display text-[15px] text-(--surge)">No ads. No user-data sale. No hidden fee model.</div>
        </div>
      </>
    ),
  },
  {
    id: 'safety-and-trust',
    title: 'Safety, Signing, and Trust Model',
    summary: 'What users should understand about wallet signing and transaction behavior.',
    keywords: ['safety', 'security', 'wallet signing', 'trust'],
    content: (
      <div className="grid md:grid-cols-3 gap-3">
        <div className="paper-card p-4">
          <ShieldCheck size={18} className="text-(--surge)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">User-Signed Actions</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Deposits and harvest actions require user wallet signature.</p>
        </div>
        <div className="paper-card p-4">
          <Timer size={18} className="text-(--sky)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">Status Visibility</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">UI shows transaction progress states so users can follow each step.</p>
        </div>
        <div className="paper-card p-4">
          <CircleDollarSign size={18} className="text-(--amber)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">Transparent Fees</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Fees are policy-defined and not hidden as spread markups.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'glossary',
    title: 'Glossary (A-Z Style)',
    summary: 'Reference section users can jump to when terms are unfamiliar.',
    keywords: ['glossary', 'dictionary', 'terms', 'definitions'],
    content: (
      <div className="space-y-2">
        {GLOSSARY.map((item) => (
          <div key={item.term} className="paper-card p-4">
            <div className="font-display text-[16px] text-(--ink-1)">{item.term}</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">{item.definition}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ and Troubleshooting',
    summary: 'Quick answers for common user questions.',
    keywords: ['faq', 'troubleshooting', 'issues', 'support'],
    content: (
      <div className="space-y-3">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">I connected wallet but see no position.</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Positions appear after a successful deposit transaction settles.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Harvest button is disabled.</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Harvest is available only when pending yield is above threshold and wallet is connected.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Race entry did not apply.</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Recheck active race status, wallet auth session, and entry transaction confirmation.</p>
        </div>
      </div>
    ),
  },
];

export function Docs() {
  const [query, setQuery] = useState('');

  const visibleSections = useMemo(() => {
    if (!query.trim()) {
      return DOC_SECTIONS;
    }

    const needle = query.toLowerCase();
    return DOC_SECTIONS.filter((section) => {
      const haystack = [section.title, section.summary, ...section.keywords].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  return (
    <div className="min-h-screen bg-(--paper-1) overflow-x-hidden">
      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 pt-24 pb-16">
        <div className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">
            <BookOpen size={14} className="text-(--surge)" />
            <span>Conduit Documentation</span>
          </div>
          <h1 className="font-display text-[clamp(34px,4vw,52px)] tracking-[-0.03em] leading-[1.02] text-(--ink-1) mt-3">
            Detailed docs for every user-facing concept
          </h1>
          <p className="font-body text-[15px] leading-[1.8] text-(--ink-2) mt-4 max-w-220">
            Explore Conduit from first principles: what it is, how it works, how to invest, what harvest means,
            how split config behaves, and how Yield Race works through Feature 5. This page is intentionally detailed
            so first-time users can self-serve without confusion.
          </p>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--surge)"><Compass size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Guided</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Step-by-step explanations for beginners.</div>
            </div>
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--sky)"><Sparkles size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Visual</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Flow diagram and charts to make concepts easier.</div>
            </div>
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--amber)"><CircleDollarSign size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Transparent</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Clear breakdown of fees and revenue logic.</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--surge) text-white font-display text-[14px] hover:bg-(--surge-mid) transition-colors"
            >
              Start Onboarding
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/bonds"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) font-display text-[14px] hover:bg-(--paper-4) transition-colors"
            >
              Explore Bond Boxes
            </Link>
            <Link
              to="/race"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) font-display text-[14px] hover:bg-(--paper-4) transition-colors"
            >
              Open Race
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] items-start gap-6">
          <aside
            data-lenis-prevent
            className="paper-card-elevated rounded-(--r-lg) p-4 lg:sticky lg:top-22 lg:self-start lg:h-[calc(100vh-7rem)] lg:overflow-y-auto overscroll-contain"
          >
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider mb-3">Jump To Section</div>

            <label className="block relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ink-4)" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs"
                className="w-full h-10 pl-9 pr-3 bg-(--paper-2) border border-(--paper-edge) rounded-(--r-md) text-[14px] text-(--ink-1) outline-none focus:border-(--surge)"
              />
            </label>

            <nav className="space-y-1">
              {visibleSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block px-3 py-2 rounded-(--r-sm) text-[13px] font-secondary text-(--ink-2) hover:bg-(--paper-3) transition-colors"
                >
                  {section.title}
                </a>
              ))}

              {visibleSections.length === 0 && (
                <div className="px-3 py-2 text-[13px] text-(--ink-4)">No sections match that search.</div>
              )}
            </nav>
          </aside>

          <div className="space-y-4 min-w-0">
            {visibleSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 scroll-mt-22 min-w-0 overflow-hidden"
              >
                <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">{section.id.replaceAll('-', ' ')}</div>
                <h2 className="font-display text-[clamp(26px,3vw,38px)] tracking-[-0.025em] leading-[1.1] text-(--ink-1) mt-2">
                  {section.title}
                </h2>
                <p className="font-secondary text-[14px] text-(--ink-3) mt-2 leading-[1.7]">{section.summary}</p>
                <div className="mt-5">{section.content}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
