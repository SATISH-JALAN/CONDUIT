import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { Send, Bot, User, Activity, History, Settings2, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

export function Agent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Hello. I am COND, your AI Agent. I am currently monitoring the bond market for optimal yield opportunities. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', content: 'I am analyzing your request. Based on current market conditions, I recommend maintaining your current allocation to US Treasury 10Y.' }]);
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto min-h-[calc(100vh-140px)] flex flex-col py-4 md:py-0" ref={containerRef}>
        <header className="mb-5 md:mb-8 agent-item">
          <h1 className="text-[28px] md:text-[32px] font-display font-medium text-[var(--ink-1)] tracking-tight">
            COND Agent
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-3)] font-secondary">Ask naturally. COND will explain reasoning and suggest safe actions.</p>
        </header>

        <div className="flex-1 grid lg:grid-cols-[300px_1fr] gap-5 md:gap-8 min-h-0">
          {/* Left Sidebar - Status */}
          <div className="agent-item order-2 lg:order-1 flex flex-col gap-4 md:gap-6 overflow-visible lg:overflow-y-auto pr-0 lg:pr-2">
            <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--violet-pale)] flex items-center justify-center text-[var(--violet)]">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-[16px] text-[var(--ink-1)]">Status</h3>
                    <Tooltip content="Agent is actively monitoring markets and executing strategies.">
                      <div className="flex items-center gap-2 text-mono text-[10px] text-[var(--surge)] uppercase tracking-wider cursor-help w-max">
                        <span className="dot-live"></span> Active
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-[var(--paper-edge)]">
                <div>
                  <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1 uppercase tracking-wider flex items-center gap-1">
                    Performance (30d)
                    <Tooltip content="Agent-driven yield outperformance vs. benchmark over the last 30 days.">
                      <Info size={10} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="font-display text-[24px] text-[var(--surge)] font-medium">+42 bps</div>
                </div>
                <div>
                  <div className="text-mono text-[10px] text-[var(--ink-4)] mb-1 uppercase tracking-wider">Managed Assets</div>
                  <div className="font-display text-[20px] text-[var(--ink-1)] font-medium">$15,000.00</div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] p-6">
              <h3 className="font-display font-medium text-[16px] text-[var(--ink-1)] mb-4 flex items-center gap-2">
                <History size={16} className="text-[var(--ink-3)]" /> Recent Actions
              </h3>
              <div className="space-y-4">
                {[
                  { action: 'Rotated 5% to USDY', time: '2h ago', type: 'trade' },
                  { action: 'Harvested $12.50 Yield', time: '5h ago', type: 'harvest' },
                  { action: 'Risk Alert: Market Volatility', time: '1d ago', type: 'alert' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      item.type === 'trade' ? 'bg-[var(--sky)]' : 
                      item.type === 'harvest' ? 'bg-[var(--surge)]' : 'bg-[var(--amber)]'
                    }`}></div>
                    <div>
                      <p className="font-secondary text-[13px] text-[var(--ink-1)]">{item.action}</p>
                      <p className="font-mono text-[10px] text-[var(--ink-4)] mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] p-6">
              <h3 className="font-display font-medium text-[16px] text-[var(--ink-1)] mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-[var(--ink-3)]" /> Strategy
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-secondary text-[13px] text-[var(--ink-2)] flex items-center gap-1">
                    Risk Tolerance
                    <Tooltip content="Agent will only allocate to bonds matching this risk profile or lower.">
                      <Info size={12} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-1)] bg-[var(--paper-3)] px-2 py-1 rounded">Moderate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-secondary text-[13px] text-[var(--ink-2)] flex items-center gap-1">
                    Auto-Harvest
                    <Tooltip content="Automatically claim and reinvest yield when gas fees are optimal.">
                      <Info size={12} className="text-[var(--ink-3)] cursor-help" />
                    </Tooltip>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--surge)] bg-[var(--surge-pale)] px-2 py-1 rounded">Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Area - Chat */}
          <div className="agent-item order-1 lg:order-2 bg-[var(--paper-1)] border border-[var(--paper-edge)] rounded-[var(--r-xl)] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-visible lg:overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6 scrollbar-thin scrollbar-thumb-[var(--paper-edge)] scrollbar-track-transparent">
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 rounded-full border border-[var(--paper-edge)] bg-[var(--paper-2)] text-[12px] text-[var(--ink-2)] hover:bg-[var(--paper-3)] transition-colors"
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
                      ? 'bg-[var(--paper-3)] text-[var(--ink-2)]' 
                      : 'bg-[var(--violet-pale)] text-[var(--violet)]'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-3.5 md:p-4 ${
                    msg.role === 'user' 
                      ? 'bg-[var(--paper-3)] text-[var(--ink-1)] rounded-tr-sm' 
                      : 'bg-[var(--paper-2)] border border-[var(--paper-edge)] text-[var(--ink-1)] rounded-tl-sm'
                  }`}>
                    <p className="font-secondary text-[14px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 md:p-4 border-t border-[var(--paper-edge)] bg-[var(--paper-1)]/80 backdrop-blur-md">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask COND to analyze a bond or adjust strategy..."
                  className="w-full pl-5 md:pl-6 pr-14 md:pr-16 py-3.5 md:py-4 rounded-full bg-[var(--paper-2)] border border-[var(--paper-edge)] focus:outline-none focus:border-[var(--violet-pale-2)] focus:ring-1 focus:ring-[var(--violet-pale-2)] transition-all font-secondary text-[14px] text-[var(--ink-1)] placeholder:text-[var(--ink-4)]"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--violet)] text-white flex items-center justify-center hover:bg-[var(--violet-mid)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
