import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, Shield, Clock, DollarSign, TrendingUp, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { api, BondBox } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';

type DepositState = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

export function BondDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [bond, setBond] = useState<(BondBox & { contractId?: string; createdAt: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit state
  const [amount, setAmount] = useState<string>('');
  const [depositState, setDepositState] = useState<DepositState>('idle');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Wallet
  const { publicKey, isConnected: walletConnected, signTx } = useWalletStore();

  useEffect(() => {
    if (!id) return;
    api.getBox(id)
      .then((data) => {
        setBond(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && !error && containerRef.current) {
      gsap.fromTo(
        '.detail-item',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' }
      );
    }
  }, [loading, error]);

  // ── Deposit handler ──
  const handleDeposit = async () => {
    if (!bond || !publicKey || !id) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setDepositError('Enter a valid amount');
      return;
    }
    if (depositAmount < bond.min) {
      setDepositError(`Minimum investment is $${bond.min.toLocaleString()}`);
      return;
    }

    setDepositError(null);
    setDepositState('building');

    try {
      // Step 1: Build unsigned transaction
      const buildResult = await api.depositBuild(publicKey, id, depositAmount);

      // Step 2: User signs with Freighter
      setDepositState('signing');
      const signedXdr = await signTx(buildResult.xdr, buildResult.networkPassphrase);

      // Step 3: Submit signed transaction
      setDepositState('submitting');
      const submitResult = await api.depositSubmit(publicKey, id, depositAmount, signedXdr);

      setTxHash(submitResult.txHash);
      setDepositState('success');
    } catch (err: any) {
      setDepositError(err.message || 'Deposit failed');
      setDepositState('error');
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-225 mx-auto space-y-6">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-75 w-full rounded-(--r-xl)" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-50 rounded-(--r-xl)" />
            <Skeleton className="h-50 rounded-(--r-xl)" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !bond) {
    return (
      <AppLayout>
        <div className="max-w-225 mx-auto text-center py-20">
          <p className="text-(--ink-3) font-secondary text-[15px] mb-4">
            {error || 'Bond not found'}
          </p>
          <button
            onClick={() => navigate('/bonds')}
            className="text-(--surge) text-mono text-[12px] uppercase tracking-wider hover:underline"
          >
            ← Back to Bond Market
          </button>
        </div>
      </AppLayout>
    );
  }

  const riskColor = bond.risk === 'Low' 
    ? { bg: 'var(--surge-pale)', border: 'var(--surge-pale-2)', text: 'var(--surge)' }
    : bond.risk === 'Medium' 
    ? { bg: 'var(--amber-pale)', border: 'var(--amber-pale-2)', text: 'var(--amber)' }
    : { bg: 'var(--rose-pale)', border: 'var(--rose-pale-2)', text: 'var(--rose)' };

  const parsedAmount = parseFloat(amount) || 0;
  const projectedMonthly = (parsedAmount * bond.apy / 100 / 12);
  const projectedYearly = (parsedAmount * bond.apy / 100);

  const depositButtonText = () => {
    switch (depositState) {
      case 'building': return 'Building Transaction...';
      case 'signing': return 'Confirm in Freighter...';
      case 'submitting': return 'Submitting to Stellar...';
      case 'success': return '✓ Deposit Successful!';
      default: return 'Deposit & Start Earning';
    }
  };

  const isProcessing = ['building', 'signing', 'submitting'].includes(depositState);

  return (
    <AppLayout>
      <div className="max-w-225 mx-auto" ref={containerRef}>
        {/* Back button */}
        <button
          onClick={() => navigate('/bonds')}
          className="detail-item flex items-center gap-2 text-mono text-[12px] text-(--ink-4) hover:text-(--surge) transition-colors uppercase tracking-wider mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Bond Market
        </button>

        {/* Hero Card */}
        <div className="detail-item bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            background: `radial-gradient(circle at 80% 20%, ${bond.accentColor || 'var(--surge)'}, transparent 60%)`
          }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{bond.flag}</span>
                <div>
                  <h1 className="font-display text-[28px] font-medium text-(--ink-1) tracking-tight">{bond.name}</h1>
                  <p className="font-secondary text-[14px] text-(--ink-3) mt-1">{bond.description}</p>
                </div>
              </div>
              <div
                className="px-4 py-1.5 rounded-full border text-mono text-[11px] uppercase tracking-wider"
                style={{ background: riskColor.bg, borderColor: riskColor.border, color: riskColor.text }}
              >
                {bond.risk} Risk
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-mono text-[10px] text-(--ink-4) uppercase mb-2 flex items-center gap-1">
                  <TrendingUp size={10} /> APY
                </div>
                <div className="font-display text-[32px] font-medium text-(--surge) leading-none">{bond.apy.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-mono text-[10px] text-(--ink-4) uppercase mb-2 flex items-center gap-1">
                  <Clock size={10} /> Duration
                </div>
                <div className="font-display text-[24px] font-medium text-(--ink-1) leading-none">{bond.duration} Yr</div>
              </div>
              <div>
                <div className="text-mono text-[10px] text-(--ink-4) uppercase mb-2 flex items-center gap-1">
                  <DollarSign size={10} /> Min Invest
                </div>
                <div className="font-display text-[24px] font-medium text-(--ink-1) leading-none">${bond.min.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-mono text-[10px] text-(--ink-4) uppercase mb-2 flex items-center gap-1">
                  <Shield size={10} /> Type
                </div>
                <div className="font-display text-[24px] font-medium text-(--ink-1) leading-none">{bond.type}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Projected Returns */}
          <div className="detail-item bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-6">
            <h3 className="text-mono text-[11px] text-(--ink-4) uppercase tracking-wider mb-6">
              Projected Returns {parsedAmount > 0 ? `(on $${parsedAmount.toLocaleString()})` : ''}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-(--paper-edge)">
                <span className="font-secondary text-[14px] text-(--ink-3)">Monthly Yield</span>
                <span className="font-display text-[18px] text-(--surge) font-medium">
                  +${projectedMonthly.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-(--paper-edge)">
                <span className="font-secondary text-[14px] text-(--ink-3)">Yearly Yield</span>
                <span className="font-display text-[18px] text-(--surge) font-medium">
                  +${projectedYearly.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-secondary text-[14px] text-(--ink-3)">After {bond.duration} Year{bond.duration > 1 ? 's' : ''}</span>
                <span className="font-display text-[18px] text-(--ink-1) font-medium">
                  ${parsedAmount > 0 ? (parsedAmount + projectedYearly * bond.duration).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Deposit Action */}
          <div className="detail-item bg-(--paper-1) border border-(--paper-edge) rounded-(--r-xl) p-6 flex flex-col">
            <h3 className="text-mono text-[11px] text-(--ink-4) uppercase tracking-wider mb-6">
              Deposit
            </h3>
            <div className="flex-1 flex flex-col justify-between">
              {depositState === 'success' ? (
                /* Success State */
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-(--surge-pale) flex items-center justify-center">
                    <CheckCircle size={32} className="text-(--surge)" />
                  </div>
                  <div>
                    <p className="font-display text-[18px] text-(--ink-1) font-medium mb-1">Deposit Successful!</p>
                    <p className="font-secondary text-[13px] text-(--ink-3)">
                      Your yield is now streaming continuously.
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-mono text-[11px] text-(--surge) hover:underline uppercase tracking-wider"
                    >
                      View Transaction <ExternalLink size={10} />
                    </a>
                  )}
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 px-6 py-2 rounded-full border border-(--surge) text-(--surge) font-display text-[13px] hover:bg-(--surge-pale) transition-all"
                  >
                    Go to Dashboard →
                  </button>
                </div>
              ) : (
                /* Input State */
                <div className="space-y-4">
                  <div>
                    <label className="text-mono text-[10px] text-(--ink-4) uppercase mb-2 block">Amount (XLM)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setDepositError(null); }}
                      placeholder={`Min $${bond.min.toLocaleString()}`}
                      disabled={isProcessing}
                      className="w-full px-4 py-3 rounded-(--r-md) bg-(--paper-2) border border-(--paper-edge) focus:outline-none focus:border-(--surge-pale-2) focus:ring-1 focus:ring-(--surge-pale-2) font-display text-[20px] text-(--ink-1) placeholder:text-(--ink-4) transition-all disabled:opacity-50"
                    />
                  </div>

                  {parsedAmount > 0 && (
                    <div className="p-3 rounded-(--r-md) bg-(--surge-pale) border border-(--surge-pale-2)">
                      <p className="text-mono text-[10px] text-(--surge) uppercase tracking-wider">
                        Estimated daily yield: ${(parsedAmount * bond.apy / 100 / 365).toFixed(4)} / day
                      </p>
                    </div>
                  )}

                  {/* Error message */}
                  {(depositError || depositState === 'error') && (
                    <div className="p-3 rounded-(--r-md) bg-(--rose-pale) border border-(--rose-pale-2) flex items-start gap-2">
                      <AlertCircle size={14} className="text-(--rose) mt-0.5 shrink-0" />
                      <p className="text-mono text-[10px] text-(--rose) uppercase tracking-wider">
                        {depositError}
                      </p>
                    </div>
                  )}

                  {!walletConnected ? (
                    <MagneticButton
                      variant="custom"
                      className="w-full mt-4 py-3 rounded-full bg-(--ink-1) text-(--paper-1) font-display text-[14px] font-medium text-center cursor-pointer hover:brightness-110 transition-all"
                      onClick={() => navigate('/onboarding')}
                    >
                      Connect Wallet First
                    </MagneticButton>
                  ) : (
                    <MagneticButton
                      variant="custom"
                      className={`w-full mt-4 py-3 rounded-full font-display text-[14px] font-medium text-center transition-all flex items-center justify-center gap-2 ${
                        isProcessing
                          ? 'bg-(--surge) text-white opacity-80 cursor-wait'
                          : 'bg-(--surge) text-white cursor-pointer hover:brightness-110'
                      }`}
                      onClick={isProcessing ? undefined : handleDeposit}
                    >
                      {isProcessing && <Loader2 size={16} className="animate-spin" />}
                      {depositButtonText()}
                    </MagneticButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
