import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
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

type DocTopic = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
  keywords: string[];
  content: React.ReactNode;
};

function useReadTopics() {
  const [readTopics, setReadTopics] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('conduit:read-topics');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markRead = (slug: string) => {
    setReadTopics((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      try { localStorage.setItem('conduit:read-topics', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { readTopics, markRead };
}

const FLOW_STEPS = [
  {
    title: 'Connect Wallet',
    route: '/onboarding',
    userAction: 'Connect a Freighter-compatible wallet and approve access.',
    systemAction: 'Conduit establishes wallet session and user context.',
  },
  {
    title: 'Pick Bond Box',
    route: '/bonds',
    userAction: 'Choose the Bond Box matching risk and APY preference.',
    systemAction: 'Conduit loads strategy details and deposit action.',
  },
  {
    title: 'Deposit Funds',
    route: '/bonds/:id',
    userAction: 'Enter amount, review details, sign transaction.',
    systemAction: 'Position is created and starts yield accrual.',
  },
  {
    title: 'Track Dashboard',
    route: '/dashboard',
    userAction: 'Monitor principal, pending yield, and APY.',
    systemAction: 'Live values refresh from portfolio data stream.',
  },
  {
    title: 'Configure Split',
    route: '/dashboard',
    userAction: 'Set destination wallets and allocation percentages.',
    systemAction: 'Split config is validated and persisted.',
  },
  {
    title: 'Harvest Yield',
    route: '/dashboard',
    userAction: 'Click harvest and sign transaction.',
    systemAction: 'Gross yield to fee policy to destination split routing.',
  },
  {
    title: 'Race Participation',
    route: '/race',
    userAction: 'View leaderboard and optionally join active race.',
    systemAction: 'Race entry status and prize eligibility update.',
  },
];

const YIELD_GROWTH_DEMO = [
  { day: 'D1', yield: 0 },
  { day: 'D5', yield: 7.1 },
  { day: 'D10', yield: 14.3 },
  { day: 'D15', yield: 21.4 },
  { day: 'D20', yield: 28.6 },
  { day: 'D25', yield: 35.7 },
  { day: 'D30', yield: 42.9 },
];

const HARVEST_BREAKDOWN_DEMO = [
  { stage: 'Gross Yield', amount: 100 },
  { stage: 'Protocol Fee', amount: 0.05 },
  { stage: 'Net Distributed', amount: 99.95 },
];

const REVENUE_MIX_YEAR1 = [
  { stream: 'COND Pro', value: 216, label: '$216K' },
  { stream: 'Management Fee', value: 25, label: '$25K' },
  { stream: 'AMM Share', value: 40, label: '$40K' },
  { stream: 'Race Entry', value: 12, label: '$12K' },
];

const REVENUE_COLORS = ['#007A5E', '#0369A1', '#B45309', '#9F1239'];

const TOPICS: DocTopic[] = [
  {
    slug: 'overview',
    title: 'What Is Conduit?',
    summary: 'Platform overview, promise, and where users start.',
    category: 'Getting Started',
    readTime: '4 min',
    keywords: ['overview', 'what is conduit', 'intro'],
    content: (
      <div className="space-y-4">
        <p className="font-body text-[15px] text-(--ink-2) leading-[1.8]">
          Conduit is a Stellar-native interface for bond-backed yield products. Users deposit into Bond Boxes,
          monitor continuous accrual, harvest yield, and route harvested output to custom destinations.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Core Promise</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Transparent yield with clear mechanics.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">User Control</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Wallet-signed actions and configurable splits.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Current Scope</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">Features 1 to 5 are user-facing in this guide.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: 'quickstart',
    title: 'Quickstart (2 Minutes)',
    summary: 'Fast path for first-time users with exact expected outcomes.',
    category: 'Getting Started',
    readTime: '3 min',
    keywords: ['quickstart', 'beginner', 'new user'],
    content: (
      <div className="grid md:grid-cols-2 gap-3">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">1. Connect Wallet</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Outcome: wallet fingerprint appears in header.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">2. Deposit In Bonds</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Outcome: position appears in dashboard.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">3. Track Pending Yield</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Outcome: values start changing over time.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">4. Set Split and Harvest</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Outcome: realized output routes to configured wallets.</p>
        </div>
      </div>
    ),
  },
  {
    slug: 'user-flow',
    title: 'User Flow (Feature 1 to 5)',
    summary: 'Complete click-to-outcome flow with user and system actions.',
    category: 'Getting Started',
    readTime: '6 min',
    keywords: ['user flow', 'journey', 'feature 5', 'diagram'],
    content: (
      <div className="space-y-4">
        <div className="max-w-full overflow-x-auto pb-2" data-lenis-prevent>
          <div className="w-max min-w-full flex flex-nowrap items-center gap-2 pr-2">
            {FLOW_STEPS.map((step, index) => (
              <React.Fragment key={step.title}>
                <div className="paper-card p-4 w-56 shrink-0">
                  <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Step {index + 1}</div>
                  <div className="font-display text-[16px] text-(--ink-1) mt-1">{step.title}</div>
                  <div className="font-secondary text-[12px] text-(--ink-3) mt-1">{step.route}</div>
                </div>
                {index < FLOW_STEPS.length - 1 && <ArrowRight size={16} className="text-(--ink-4) shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {FLOW_STEPS.map((step, index) => (
            <div key={step.title} className="paper-card p-4">
              <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Step {index + 1}</div>
              <h4 className="font-display text-[16px] text-(--ink-1) mt-1">{step.title}</h4>
              <p className="font-secondary text-[14px] text-(--ink-2) mt-2">
                <span className="text-(--ink-1) font-medium">User does:</span> {step.userAction}
              </p>
              <p className="font-secondary text-[14px] text-(--ink-2) mt-1">
                <span className="text-(--ink-1) font-medium">Conduit does:</span> {step.systemAction}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: 'how-to-invest',
    title: 'How To Invest Through Conduit',
    summary: 'Detailed investing guide from wallet connection to first harvest.',
    category: 'Core Operations',
    readTime: '7 min',
    keywords: ['invest', 'deposit', 'bonds', 'portfolio'],
    content: (
      <div className="space-y-3">
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 1: Open Bonds</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Review APY, available boxes, and product context.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 2: Choose Amount</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Input deposit amount and verify before signing.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 3: Confirm Position</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Check dashboard position card and pending yield.</p>
        </div>
        <div className="paper-card p-4">
          <h4 className="font-display text-[16px] text-(--ink-1)">Step 4: Configure Split</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Set where harvested yield should be routed.</p>
        </div>
      </div>
    ),
  },
  {
    slug: 'harvest-and-split',
    title: 'Harvest and Split Config',
    summary: 'Exact harvest order, validation rules, and default behaviors.',
    category: 'Core Operations',
    readTime: '6 min',
    keywords: ['harvest', 'split', 'config', 'distribution'],
    content: (
      <div className="space-y-4">
        <p className="font-body text-[15px] text-(--ink-2) leading-[1.8]">
          Harvest realizes accrued yield. Conduit applies fee policy first and then distributes net output by split configuration.
          If no split config exists, yield is routed to the connected wallet destination.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="paper-card p-4">
            <h4 className="font-display text-[16px] text-(--ink-1)">Validation Rules</h4>
            <ul className="mt-2 space-y-1 list-disc pl-5 text-[14px] text-(--ink-2) font-secondary">
              <li>Total split must equal 100%.</li>
              <li>Each destination must be valid.</li>
              <li>At least one destination should be present.</li>
            </ul>
          </div>
          <div className="paper-card p-4">
            <h4 className="font-display text-[16px] text-(--ink-1)">Execution Order</h4>
            <ol className="mt-2 space-y-1 list-decimal pl-5 text-[14px] text-(--ink-2) font-secondary">
              <li>Compute gross yield.</li>
              <li>Apply protocol fee policy.</li>
              <li>Allocate net by split percentages.</li>
              <li>Submit destination outputs.</li>
            </ol>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: 'yield-race',
    title: 'Yield Race (Feature 5)',
    summary: 'Leaderboard mechanics, optional entry fee, and prize eligibility.',
    category: 'Core Operations',
    readTime: '5 min',
    keywords: ['race', 'leaderboard', 'entry fee', 'feature 5'],
    content: (
      <div className="space-y-3">
        <p className="font-body text-[15px] text-(--ink-2) leading-[1.8]">
          All users can view rankings. Race entry is optional. Paid entrants become prize-eligible for the active race.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Entry</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">$5 per race participation.</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Split</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-2">80% to prize pool, 20% to protocol.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: 'visual-guides',
    title: 'Visual Guides and Graphs',
    summary: 'Charts to explain accrual, harvest, and commercial model.',
    category: 'Visual Guides',
    readTime: '5 min',
    keywords: ['charts', 'graph', 'visual', 'accrual'],
    content: (
      <div className="space-y-4">
        <div className="paper-card p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Illustrative Yield Accrual</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={YIELD_GROWTH_DEMO}>
                <CartesianGrid stroke="var(--paper-edge)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--ink-4)" fontSize={11} />
                <YAxis stroke="var(--ink-4)" fontSize={11} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="yield" stroke="var(--surge)" fill="var(--surge-pale)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="paper-card p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Harvest Breakdown per $100 Demo Yield</div>
          <div className="h-56 mt-3">
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

        <div className="paper-card p-4">
          <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Year 1 Revenue Mix (Illustrative)</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={REVENUE_MIX_YEAR1} dataKey="value" nameKey="stream" outerRadius={90} innerRadius={50} paddingAngle={3}>
                  {REVENUE_MIX_YEAR1.map((entry, index) => (
                    <Cell key={entry.stream} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: 'fees-and-revenue',
    title: 'Fees and Revenue Model',
    summary: 'How Conduit makes money and what users are not charged for.',
    category: 'Economics',
    readTime: '5 min',
    keywords: ['fees', 'revenue', 'cond pro', 'management fee'],
    content: (
      <div className="space-y-3">
        <ul className="space-y-2 list-disc pl-6 text-[15px] text-(--ink-2) font-secondary leading-[1.8]">
          <li>Management fee on AUM: 0.05% annualized.</li>
          <li>COND Pro subscription: $9.99 per month.</li>
          <li>COND Institutional: $299 per month.</li>
          <li>AMM share, marketplace fee, race entry share, and institutional API pricing.</li>
        </ul>
        <div className="bg-(--surge-pale) border border-(--surge-pale-2) rounded-(--r-lg) p-4">
          <div className="font-display text-[15px] text-(--surge)">No ads, no user-data sales, no hidden fee model.</div>
        </div>
      </div>
    ),
  },
  {
    slug: 'safety-and-signing',
    title: 'Safety and Signing',
    summary: 'What users should know about signatures, status states, and trust signals.',
    category: 'Trust and Safety',
    readTime: '4 min',
    keywords: ['safety', 'wallet', 'signing', 'security'],
    content: (
      <div className="grid md:grid-cols-3 gap-3">
        <div className="paper-card p-4">
          <ShieldCheck size={18} className="text-(--surge)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">User-Signed Actions</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Deposits and harvests require wallet signature.</p>
        </div>
        <div className="paper-card p-4">
          <Timer size={18} className="text-(--sky)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">Status Tracking</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Building, signing, and submission states are shown clearly.</p>
        </div>
        <div className="paper-card p-4">
          <CheckCircle2 size={18} className="text-(--amber)" />
          <h4 className="font-display text-[16px] text-(--ink-1) mt-2">Transparent Policy</h4>
          <p className="font-secondary text-[14px] text-(--ink-2) mt-2">Fee and output logic is documented in-product.</p>
        </div>
      </div>
    ),
  },
  {
    slug: 'glossary',
    title: 'Glossary',
    summary: 'Definitions for key terms users see across the app.',
    category: 'Reference',
    readTime: '4 min',
    keywords: ['glossary', 'definitions', 'bond box', 'apy', 'tvl'],
    content: (
      <div className="space-y-2">
        {[
          ['Bond Box', 'A strategy container where deposits are allocated to bond-backed yield products.'],
          ['Yield', 'Earnings generated by the underlying strategy over time.'],
          ['Harvest', 'Action that realizes accrued yield for distribution.'],
          ['Split Config', 'Destination and percentage rules for harvested output.'],
          ['APY', 'Annual Percentage Yield estimate under current conditions.'],
          ['TVL', 'Total Value Locked in a strategy or leaderboard context.'],
        ].map(([term, meaning]) => (
          <div key={term} className="paper-card p-4">
            <div className="font-display text-[16px] text-(--ink-1)">{term}</div>
            <div className="font-secondary text-[14px] text-(--ink-2) mt-1 leading-[1.7]">{meaning}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    slug: 'faq',
    title: 'FAQ and Troubleshooting',
    summary: 'Common user questions and first checks before support.',
    category: 'Reference',
    readTime: '4 min',
    keywords: ['faq', 'support', 'troubleshooting'],
    content: (
      <div className="space-y-2">
        {[
          ['I connected wallet but cannot see my position.', 'Ensure at least one deposit transaction was confirmed.'],
          ['Harvest button is disabled.', 'Harvest requires connected wallet and positive pending yield threshold.'],
          ['Race entry did not update.', 'Confirm active race exists and join transaction and auth completed.'],
          ['Why do values change every refresh?', 'Portfolio values are live and depend on accrual and latest state sync.'],
        ].map(([q, a]) => (
          <div key={q} className="paper-card p-4">
            <h4 className="font-display text-[16px] text-(--ink-1)">{q}</h4>
            <p className="font-secondary text-[14px] text-(--ink-2) mt-2">{a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const TOPIC_MAP = Object.fromEntries(TOPICS.map((topic) => [topic.slug, topic]));

export function Docs() {
  const { topic } = useParams<{ topic?: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { readTopics, markRead } = useReadTopics();

  useEffect(() => {
    if (topic) {
      markRead(topic);
    }
  }, [topic]);

  const filteredTopics = useMemo(() => {
    if (!query.trim()) {
      return TOPICS;
    }

    const needle = query.toLowerCase();
    return TOPICS.filter((item) => {
      const haystack = [item.title, item.summary, item.category, ...item.keywords].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  const groupedTopics = useMemo(() => {
    return filteredTopics.reduce<Record<string, DocTopic[]>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredTopics]);

  const activeTopic = topic ? TOPIC_MAP[topic] : null;
  const activeIndex = activeTopic ? TOPICS.findIndex((item) => item.slug === activeTopic.slug) : -1;
  const prevTopic = activeIndex > 0 ? TOPICS[activeIndex - 1] : null;
  const nextTopic = activeIndex >= 0 && activeIndex < TOPICS.length - 1 ? TOPICS[activeIndex + 1] : null;

  return (
    <div className="min-h-screen bg-(--paper-1) overflow-x-hidden">
      <div className="w-full max-w-350 mx-auto px-4 md:px-8 lg:px-12 pt-24 pb-16">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) text-[13px] font-secondary hover:bg-(--paper-4) transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <div className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">
            <BookOpen size={14} className="text-(--surge)" />
            <span>Conduit Docs</span>
          </div>
          <h1 className="font-display text-[clamp(32px,4vw,50px)] tracking-[-0.03em] leading-[1.04] text-(--ink-1) mt-3">
            Structured docs with one topic per page
          </h1>
          <p className="font-body text-[15px] leading-[1.8] text-(--ink-2) mt-4 max-w-220">
            Similar to modern documentation systems, each topic has its own page and URL so users can read one concept at a time.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--surge) text-white font-display text-[14px] hover:bg-(--surge-mid) transition-colors"
            >
              Docs Home
            </Link>
            <Link
              to="/docs/quickstart"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) font-display text-[14px] hover:bg-(--paper-4) transition-colors"
            >
              Read Quickstart
            </Link>
            <Link
              to="/docs/user-flow"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) font-display text-[14px] hover:bg-(--paper-4) transition-colors"
            >
              Open User Flow
            </Link>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--surge)"><Compass size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Navigable</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Separate pages and URLs for each concept.</div>
            </div>
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--sky)"><Sparkles size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Visual</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Flow diagram and charts on dedicated topics.</div>
            </div>
            <div className="paper-card p-3">
              <div className="flex items-center gap-2 text-(--amber)"><CheckCircle2 size={14} /><span className="text-mono text-[10px] uppercase tracking-wider">Guided</span></div>
              <div className="font-secondary text-[13px] text-(--ink-2) mt-2">Step-based guidance from onboarding to race.</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] items-start gap-6">
          <aside
            data-lenis-prevent
            className="paper-card-elevated rounded-(--r-lg) p-4 lg:sticky lg:top-22 lg:self-start lg:h-[calc(100vh-7rem)] lg:overflow-y-auto overscroll-contain"
          >
            <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider mb-3">Documentation</div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center text-mono text-[9px] text-(--ink-4) uppercase tracking-wider mb-2">
                <span>Reading Progress</span>
                <span className="text-(--surge)">{Math.round((readTopics.length / TOPICS.length) * 100)}%</span>
              </div>
              <div className="h-1 bg-(--paper-edge) rounded-full overflow-hidden">
                <div className="h-full bg-(--surge) transition-all duration-500" style={{ width: `${(readTopics.length / TOPICS.length) * 100}%` }} />
              </div>
            </div>

            <label className="block relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ink-4)" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search topics"
                className="w-full h-10 pl-9 pr-3 bg-(--paper-2) border border-(--paper-edge) rounded-(--r-md) text-[14px] text-(--ink-1) outline-none focus:border-(--surge)"
              />
            </label>

            <nav className="space-y-3">
              <Link
                to="/docs"
                className={`block px-3 py-2 rounded-(--r-sm) text-[13px] font-secondary transition-colors ${
                  !topic ? 'bg-(--surge-pale) text-(--surge)' : 'text-(--ink-2) hover:bg-(--paper-3)'
                }`}
              >
                Docs Home
              </Link>

              {(Object.entries(groupedTopics) as Array<[string, DocTopic[]]>).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 text-mono text-[10px] text-(--ink-4) uppercase tracking-wider mb-1">{category}</div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const active = topic === item.slug;
                      return (
                        <Link
                          key={item.slug}
                          to={`/docs/${item.slug}`}
                          className={`flex items-center justify-between px-3 py-2 rounded-(--r-sm) text-[13px] font-secondary transition-colors ${
                            active ? 'bg-(--surge-pale) text-(--surge)' : 'text-(--ink-2) hover:bg-(--paper-3)'
                          }`}
                        >
                          <span>{item.title}</span>
                          {readTopics.includes(item.slug) && (
                            <CheckCircle2 size={12} className={active ? "text-(--surge)" : "text-(--ink-4)"} />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredTopics.length === 0 && (
                <div className="px-3 py-2 text-[13px] text-(--ink-4)">No topics match that search.</div>
              )}
            </nav>
          </aside>

          <div className="min-w-0 space-y-4">
            {!topic && (
              <section className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 min-w-0 overflow-hidden">
                <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Docs Home</div>
                <h2 className="font-display text-[clamp(26px,3vw,38px)] tracking-[-0.025em] leading-[1.1] text-(--ink-1) mt-2">
                  Pick a topic and read it as a dedicated page
                </h2>
                <p className="font-secondary text-[14px] text-(--ink-3) mt-2 leading-[1.7]">
                  This section is organized for focused reading. Start with quickstart or user flow if you are new.
                </p>

                <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {TOPICS.map((item) => (
                    <Link key={item.slug} to={`/docs/${item.slug}`} className="paper-card p-4 hover:border-(--surge-pale-2) transition-colors">
                      <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">{item.category}</div>
                      <h3 className="font-display text-[18px] text-(--ink-1) mt-2">{item.title}</h3>
                      <p className="font-secondary text-[13px] text-(--ink-3) mt-2 leading-[1.7]">{item.summary}</p>
                      <div className="mt-3 text-mono text-[10px] text-(--ink-4)">{item.readTime}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {topic && !activeTopic && (
              <section className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 min-w-0 overflow-hidden">
                <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Not Found</div>
                <h2 className="font-display text-[30px] tracking-[-0.02em] text-(--ink-1) mt-2">Topic does not exist</h2>
                <p className="font-secondary text-[14px] text-(--ink-3) mt-2">Choose an existing topic from the sidebar.</p>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-(--r-md) bg-(--surge) text-white font-display text-[14px] hover:bg-(--surge-mid) transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back To Docs Home
                </Link>
              </section>
            )}

            {activeTopic && (
              <section className="paper-card-elevated rounded-(--r-xl) p-6 md:p-8 min-w-0 overflow-hidden">
                <div className="mb-4">
                  <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-(--r-md) bg-(--paper-3) border border-(--paper-edge) text-(--ink-2) text-[13px] font-secondary hover:bg-(--paper-4) transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back to Docs Home
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">
                  <span>{activeTopic.category}</span>
                  <span>•</span>
                  <span>{activeTopic.readTime}</span>
                </div>
                <h2 className="font-display text-[clamp(28px,3vw,42px)] tracking-[-0.025em] leading-[1.08] text-(--ink-1) mt-2">
                  {activeTopic.title}
                </h2>
                <p className="font-secondary text-[14px] text-(--ink-3) mt-2 leading-[1.7]">{activeTopic.summary}</p>

                <div className="mt-5">{activeTopic.content}</div>

                <div className="mt-8 grid sm:grid-cols-2 gap-3">
                  {prevTopic ? (
                    <Link
                      to={`/docs/${prevTopic.slug}`}
                      className="paper-card p-4 flex items-center gap-2 hover:border-(--surge-pale-2) transition-colors"
                    >
                      <ArrowLeft size={14} className="text-(--ink-4)" />
                      <div>
                        <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Previous</div>
                        <div className="font-secondary text-[14px] text-(--ink-2)">{prevTopic.title}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="paper-card p-4 opacity-60">
                      <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Previous</div>
                      <div className="font-secondary text-[14px] text-(--ink-3)">None</div>
                    </div>
                  )}

                  {nextTopic ? (
                    <Link
                      to={`/docs/${nextTopic.slug}`}
                      className="paper-card p-4 flex items-center justify-between gap-2 hover:border-(--surge-pale-2) transition-colors"
                    >
                      <div>
                        <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Next</div>
                        <div className="font-secondary text-[14px] text-(--ink-2)">{nextTopic.title}</div>
                      </div>
                      <ArrowRight size={14} className="text-(--ink-4)" />
                    </Link>
                  ) : (
                    <div className="paper-card p-4 opacity-60">
                      <div className="text-mono text-[10px] text-(--ink-4) uppercase tracking-wider">Next</div>
                      <div className="font-secondary text-[14px] text-(--ink-3)">None</div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
