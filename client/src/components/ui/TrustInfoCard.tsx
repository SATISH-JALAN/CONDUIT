import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, Lock, CheckCircle } from 'lucide-react';

interface TrustInfoCardProps {
  className?: string;
}

export const TrustInfoCard: React.FC<TrustInfoCardProps> = ({ className }) => {
  return (
    <div className={cn("bg-(--paper-2) border border-(--paper-edge) rounded-(--r-md) p-4", className)}>
      <h4 className="flex items-center gap-2 text-sm font-medium text-(--ink-1) mb-3">
        <ShieldCheck size={16} className="text-(--surge)" />
        Secure & Non-Custodial
      </h4>
      <ul className="space-y-2">
        <li className="flex items-start gap-2 text-[13px] text-(--ink-3) font-secondary">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span>You retain full custody of your assets. Conduit cannot access your private keys.</span>
        </li>
        <li className="flex items-start gap-2 text-[13px] text-(--ink-3) font-secondary">
          <CheckCircle size={14} className="mt-0.5 shrink-0 text-(--surge)" />
          <span>All transactions require explicit cryptographic signature via your wallet.</span>
        </li>
      </ul>
    </div>
  );
};
