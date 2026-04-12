import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Send, Bot, User, History, Settings2, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  api,
  getAccessToken,
  readAccessTokenFromSession,
  type AgentStatusResponse,
} from '@/lib/api';
import { ws, type CondActionEventData } from '@/lib/ws';
import { useWalletStore } from '@/stores/walletStore';

function parseCondActionData(raw: unknown): CondActionEventData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const action = typeof o.action === 'string' ? o.action : null;
  const reasoning = typeof o.reasoning === 'string' ? o.reasoning : null;
  if (!action || !reasoning) return null;
  const confidence =
    typeof o.confidence === 'number' && Number.isFinite(o.confidence)
      ? o.confidence
      : 0.5;
  return { action, reasoning, confidence };
}

type ChatMessage = { role: 'agent' | 'user'; content: string };

const DEFAULT_MESSAGE: ChatMessage = {
  role: 'agent',
  content:
    'Hello. I am COND, your AI Agent. Connect your wallet to load your mandate and receive personalized yield guidance.',
};

function getChatStorageKey(wallet: string) {
  return `conduit:agent-chat:${wallet}`;
}

function readPersistedChat(wallet: string): ChatMessage[] | null {
  try {
    const raw = window.sessionStorage.getItem(getChatStorageKey(wallet));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.filter(
      (item) =>
        (item.role === 'agent' || item.role === 'user') &&
        typeof item.content === 'string' &&
        item.content.length > 0,
    );
  } catch {
    return null;
  }
}

function persistChat(wallet: string, messages: ChatMessage[]) {
  try {
    window.sessionStorage.setItem(
      getChatStorageKey(wallet),
      JSON.stringify(messages),
    );
  } catch {
    // no-op
  }
}

export function Agent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, publicKey } = useWalletStore();

  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_MESSAGE]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingMandate, setUpdatingMandate] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const quickPrompts = [
    'Rebalance for lower risk',
    'Show top 3 yield boxes',
    'What changed in rates today?',
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.agent-item',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform,visibility' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!publicKey) {
      setMessages([DEFAULT_MESSAGE]);
      return;
    }

    const storedMessages = readPersistedChat(publicKey);
    if (storedMessages && storedMessages.length > 0) {
      setMessages(storedMessages);
      return;
    }

    setMessages([
      {
        role: 'agent',
        content:
          'Wallet connected. Ask for a rebalance, risk review, or harvest analysis and I will log recommendations.',
      },
    ]);
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    persistChat(publicKey, messages);
  }, [publicKey, messages]);

  useEffect(() => {
    if (!isConnected) {
      setStatus(null);
      return;
    }

    const load = async () => {
      setLoadingStatus(true);
      try {
        const next = await api.getAgentStatus();
        setStatus(next);

        // If no local chat exists for this wallet, seed chat from recent actions.
        if (publicKey) {
          const hasStored = readPersistedChat(publicKey);
          if ((!hasStored || hasStored.length === 0) && next.recentActions.length > 0) {
            const seeded: ChatMessage[] = [
              {
                role: 'agent',
                content:
                  'Recovered your latest COND activity from the server. You can continue from here.',
              },
              ...next.recentActions
                .slice(0, 4)
                .reverse()
                .map((item) => ({
                  role: 'agent' as const,
                  content: `Recent action: ${item.reasoning}`,
                })),
            ];

            setMessages(seeded);
          }
        }
      } catch {
        setStatus(null);
      } finally {
        setLoadingStatus(false);
      }
    };

    void load();
  }, [isConnected, publicKey]);

  // COND v1: show internal dry-run / notify decisions in chat when the server publishes COND_ACTION for this wallet.
  useEffect(() => {
    if (!isConnected || !publicKey) return;
    const token = getAccessToken() ?? readAccessTokenFromSession();
    if (!token) return;

    ws.connect(publicKey);

    const unsub = ws.onMessage((msg) => {
      if (msg.type !== 'COND_ACTION') return;
      const d = parseCondActionData(msg.data);
      if (!d) return;
      const pct = Math.round(Math.min(1, Math.max(0, d.confidence)) * 100);
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `[Live] COND ${d.action}: ${d.reasoning} (${pct}% confidence)`,
        },
      ]);
    });

    return () => {
      unsub();
    };
  }, [isConnected, publicKey]);

  const refreshStatus = async () => {
    if (!isConnected) return;
    try {
      const next = await api.getAgentStatus();
      setStatus(next);
    } catch {
      // no-op
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    if (!isConnected) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content:
            'Connect your wallet first so I can access your mandate and provide account-specific guidance.',
        },
      ]);
      return;
    }

    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setSending(true);

    try {
      const response = await api.sendAgentMessage(userMessage);
      setMessages((prev) => [...prev, { role: 'agent', content: response.reply }]);
      await refreshStatus();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: err.message || 'I could not process that request right now. Please retry.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const setRiskTolerance = async (
    risk: 'Conservative' | 'Moderate' | 'Aggressive',
  ) => {
    if (!isConnected || !status || updatingMandate) return;
    setUpdatingMandate(true);

    try {
      await api.updateAgentMandate({ risk_tolerance: risk });
      await refreshStatus();
    } finally {
      setUpdatingMandate(false);
    }
  };

  const runRuleEvaluation = async () => {
    if (!isConnected || evaluating) return;
    setEvaluating(true);
    try {
      const res = await api.runAgentEvaluate();
      const lines = res.results
        .map(
          (r) =>
            `${r.action}: HTTP ${r.status} ${r.ok ? 'ok' : 'failed'} — ${typeof (r.body as { error?: string })?.error === 'string' ? (r.body as { error: string }).error : JSON.stringify(r.body)}`,
        )
        .join('\n');
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content:
            res.results.length === 0
              ? 'No COND v1 actions matched your mandate and positions (or you are outside the snapshot).'
              : `COND v1 evaluation finished. Submitted ${res.submitted}/${res.results.length} dry-run actions.\n${lines}`,
        },
      ]);
      await refreshStatus();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content:
            err.message ||
            'Evaluation failed. If the server is missing COND_HMAC_SECRET, this feature is disabled.',
        },
      ]);
    } finally {
      setEvaluating(false);
    }
  };

  const toggleKillSwitch = async () => {
    if (!isConnected || !status || updatingMandate) return;
    setUpdatingMandate(true);

    try {
      await api.setAgentKillSwitch(!status.mandate.paused);
      await refreshStatus();
    } finally {
      setUpdatingMandate(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-300 mx-auto min-h-[calc(100vh-140px)] flex flex-col py-4 md:py-0" ref={containerRef}>
        <header className="mb-5 md:mb-8 agent-item">
          <h1 className="text-[28px] md:text-[32px] font-display font-medium text-(--ink-1) tracking-tight">
            COND Agent
          </h1>
          <p className="mt-1 text-[13px] text-(--ink-3) font-secondary">Ask naturally. COND will explain reasoning and suggest safe actions.</p>
        </header>

        <div className="flex-1 grid lg:grid-cols-[300px_1fr] gap-5 md:gap-8 min-h-0">
          {/* Left Sidebar - Status */}
          <div className="agent-item order-2 lg:order-1 flex flex-col gap-4 md:gap-6 overflow-visible lg:overflow-y-auto pr-0 lg:pr-2">
            <div className="bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-(--violet-pale) flex items-center justify-center text-(--violet)">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-[16px] text-(--ink-1)">Status</h3>
                    <Tooltip content="Agent is actively monitoring markets and executing strategies.">
                      <div className="flex items-center gap-2 text-mono text-[10px] text-(--surge) uppercase tracking-wider cursor-help w-max">
                        <span className="dot-live"></span> {status?.active ? 'Active' : 'Paused'}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-(--paper-edge)">
                <div>
                  <div className="text-mono text-[10px] text-(--ink-4) mb-1 uppercase tracking-wider flex items-center gap-1">
                    Performance (30d)
                    <Tooltip content="Agent-driven yield outperformance vs. benchmark over the last 30 days.">
                      <Info size={10} className="text-(--ink-3) cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-(--surge) font-medium">
                    +{status?.performanceBps ?? 0} bps
                  </div>
                </div>
                <div>
                  <div className="text-mono text-[10px] text-(--ink-4) mb-1 uppercase tracking-wider">Managed Assets</div>
                  <div className="font-display text-[20px] text-(--ink-1) font-medium">
                    ${Number(status?.managedAssets ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleKillSwitch}
                  disabled={!isConnected || updatingMandate || loadingStatus}
                  className="w-full mt-1 px-3 py-2 rounded-(--r-md) border border-(--paper-edge) bg-(--paper-2) text-[12px] text-(--ink-2) hover:bg-(--paper-3) transition-colors disabled:opacity-50"
                >
                  {status?.mandate.paused ? 'Resume Automation' : 'Activate Kill-Switch'}
                </button>
              </div>
            </div>

            <div className="bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-6">
              <h3 className="font-display font-medium text-[16px] text-(--ink-1) mb-4 flex items-center gap-2">
                <History size={16} className="text-(--ink-3)" /> Recent Actions
              </h3>
              <div className="space-y-4">
                {(status?.recentActions ?? []).slice(0, 5).map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-(--surge)"></div>
                    <div>
                      <p className="font-secondary text-[13px] text-(--ink-1)">{item.reasoning}</p>
                      <p className="font-mono text-[10px] text-(--ink-4) mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
                {(status?.recentActions?.length ?? 0) === 0 && (
                  <p className="font-secondary text-[13px] text-(--ink-3)">
                    No actions yet. Ask COND for a strategy recommendation.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-6">
              <h3 className="font-display font-medium text-[16px] text-(--ink-1) mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-(--ink-3)" /> Strategy
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-secondary text-[13px] text-(--ink-2) flex items-center gap-1">
                    Risk Tolerance
                    <Tooltip content="Agent will only allocate to bonds matching this risk profile or lower.">
                      <Info size={12} className="text-(--ink-3) cursor-help" />
                    </Tooltip>
                  </span>
                  <span className="font-mono text-[11px] text-(--ink-1) bg-(--paper-3) px-2 py-1 rounded">
                    {status?.mandate.riskTolerance ?? 'Moderate'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(['Conservative', 'Moderate', 'Aggressive'] as const).map((risk) => (
                    <button
                      key={risk}
                      type="button"
                      disabled={!isConnected || updatingMandate}
                      onClick={() => setRiskTolerance(risk)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                        status?.mandate.riskTolerance === risk
                          ? 'bg-(--surge) text-white'
                          : 'bg-(--paper-3) text-(--ink-2)'
                      } disabled:opacity-50`}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-secondary text-[13px] text-(--ink-2) flex items-center gap-1">
                    Auto-Harvest
                    <Tooltip content="Automatically claim and reinvest yield when gas fees are optimal.">
                      <Info size={12} className="text-(--ink-3) cursor-help" />
                    </Tooltip>
                  </span>
                  <span className="font-mono text-[11px] text-(--surge) bg-(--surge-pale) px-2 py-1 rounded">
                    {status?.mandate.autoCompound ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void runRuleEvaluation()}
                  disabled={!isConnected || evaluating || updatingMandate}
                  className="w-full mt-2 px-3 py-2 rounded-(--r-md) border border-(--violet-pale-2) bg-(--violet-pale) text-[12px] text-(--violet) hover:bg-(--violet-pale-2) transition-colors disabled:opacity-50"
                >
                  {evaluating ? 'Running evaluation…' : 'Run COND v1 evaluation'}
                </button>
                <p className="text-[11px] text-(--ink-4) font-secondary mt-1">
                  Applies server rules and records dry-run decisions (no on-chain execution).
                </p>
              </div>
            </div>
          </div>

          {/* Right Area - Chat */}
          <div className="agent-item order-1 lg:order-2 bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) flex flex-col overflow-hidden">
            <div className="flex-1 overflow-visible lg:overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6 scrollbar-thin scrollbar-thumb-(--paper-edge) scrollbar-track-transparent">
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 rounded-full border border-(--paper-edge) bg-(--paper-2) text-[12px] text-(--ink-2) hover:bg-(--paper-3) transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-(--paper-3) text-(--ink-2)' 
                      : 'bg-(--violet-pale) text-(--violet)'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-3.5 md:p-4 ${
                    msg.role === 'user' 
                      ? 'bg-(--paper-3) text-(--ink-1) rounded-tr-sm' 
                      : 'bg-(--paper-2) border border-(--paper-edge) text-(--ink-1) rounded-tl-sm'
                  }`}>
                    <p className="font-secondary text-[14px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 md:p-4 border-t border-(--paper-edge) bg-(--paper-1)/80 backdrop-blur-md">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask COND to analyze a bond or adjust strategy..."
                  className="w-full pl-5 md:pl-6 pr-14 md:pr-16 py-3.5 md:py-4 rounded-full bg-(--paper-2) border border-(--paper-edge) focus:outline-none focus:border-(--violet-pale-2) focus:ring-1 focus:ring-(--violet-pale-2) transition-all font-secondary text-[14px] text-(--ink-1) placeholder:text-(--ink-4)"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-(--violet) text-white flex items-center justify-center hover:bg-(--violet-mid) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
