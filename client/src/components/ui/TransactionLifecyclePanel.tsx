import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Loader2, ExternalLink } from 'lucide-react';

export type TransactionStep = 'build' | 'sign' | 'submit' | 'confirm';

interface TransactionLifecyclePanelProps {
  currentStep: TransactionStep;
  isError?: boolean;
  errorMessage?: string;
  txHash?: string;
  explorerUrl?: string;
  className?: string;
}

const STEPS: { id: TransactionStep; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'sign', label: 'Sign' },
  { id: 'submit', label: 'Submit' },
  { id: 'confirm', label: 'Confirm' },
];

export const TransactionLifecyclePanel: React.FC<TransactionLifecyclePanelProps> = ({
  currentStep,
  isError,
  errorMessage,
  txHash,
  explorerUrl,
  className,
}) => {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className={cn("bg-(--paper-2) border border-(--paper-edge) rounded-(--r-md) p-4", className)}>
      <div className="flex justify-between items-center mb-6 relative">
        {/* Connecting line */}
        <div className="absolute top-3 left-0 right-0 h-[1px] bg-(--paper-edge) -z-10" />
        
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx || (idx === STEPS.length - 1 && currentStep === 'confirm' && !isError);
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 px-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted ? "bg-(--surge) border-(--surge) text-white" :
                  isCurrent && !isError ? "bg-(--paper-2) border-(--surge) text-(--surge)" :
                  isCurrent && isError ? "bg-(--paper-2) border-(--rose) text-(--rose)" :
                  "bg-(--paper-2) border-(--paper-edge) text-(--ink-4)"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : isCurrent && !isError ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Circle size={8} className="fill-current" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wider",
                  isCompleted || isCurrent ? "text-(--ink-1)" : "text-(--ink-4)"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {isError && errorMessage && (
        <div className="mt-4 p-3 rounded bg-(--rose-pale) border border-(--rose-pale-2) text-(--rose) text-xs font-secondary">
          {errorMessage}
        </div>
      )}

      {currentStep === 'confirm' && txHash && explorerUrl && !isError && (
        <div className="mt-4 p-3 rounded bg-(--surge-pale) border border-(--surge-pale-2) flex items-center justify-between">
          <div className="text-[11px] font-mono text-(--surge) truncate max-w-[200px]">
            Tx: {txHash}
          </div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-(--surge) hover:underline uppercase tracking-wider"
          >
            Explorer <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
};
