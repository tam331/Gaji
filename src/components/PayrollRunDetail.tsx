'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BanknoteIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { displayUsdc, formatDateTime, truncateAddr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Disbursement, PayrollRun, Worker } from '@/server/db/schema';

interface DisbursementWithWorker {
  disbursement: Disbursement;
  worker: Worker;
}

interface SseEvent {
  type: string;
  disbursementId?: string;
  workerId?: string;
  workerName?: string;
  status?: string;
  txHash?: string;
  claimableBalanceId?: string;
  isNew?: boolean;
  index?: number;
  totalDisbursed?: number;
  message?: string;
}

interface Props {
  initialRun: PayrollRun;
  initialDisbursements: DisbursementWithWorker[];
  autostart: boolean;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  claimed: { label: 'Claimed', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  completed: { label: 'Paid ✓', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-600', icon: Clock },
};

export function PayrollRunDetail({ initialRun, initialDisbursements, autostart }: Props) {
  const [run, setRun] = useState(initialRun);
  const [disbursements, setDisbursements] = useState(initialDisbursements);
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(initialRun.status === 'completed');
  const [cashoutRefs, setCashoutRefs] = useState<Record<string, string>>({});
  const [loadingCashout, setLoadingCashout] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  const startSSE = useCallback(() => {
    if (streaming || done) return;
    setStreaming(true);

    const es = new EventSource(`/api/sse?runId=${run.id}`);

    es.onmessage = (e) => {
      const event: SseEvent = JSON.parse(e.data);

      if (event.type === 'start') {
        setRun((r) => ({ ...r, status: 'disbursing' }));
      }

      if (event.type === 'disbursement' && event.disbursementId) {
        setDisbursements((prev) =>
          prev.map((d) =>
            d.disbursement.id === event.disbursementId
              ? {
                  ...d,
                  disbursement: {
                    ...d.disbursement,
                    status: event.status as Disbursement['status'],
                    stellarTxHash: event.txHash ?? d.disbursement.stellarTxHash,
                  },
                }
              : d,
          ),
        );
      }

      if (event.type === 'complete') {
        setRun((r) => ({ ...r, status: 'completed' }));
        setStreaming(false);
        setDone(true);
        setCompletedAt(new Date());
        es.close();
      }

      if (event.type === 'error') {
        setStreaming(false);
        es.close();
      }
    };

    es.onerror = () => {
      setStreaming(false);
      es.close();
    };

    return () => es.close();
  }, [run.id, streaming, done]);

  useEffect(() => {
    if (autostart && run.status === 'funded') {
      const timer = setTimeout(startSSE, 500);
      return () => clearTimeout(timer);
    }
  }, [autostart, run.status, startSSE]);

  async function handleCashOut(disbursementId: string) {
    setLoadingCashout(disbursementId);
    try {
      const res = await fetch(`/api/disbursements/${disbursementId}/cashout`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message);
      setCashoutRefs((prev) => ({ ...prev, [disbursementId]: json.data.withdrawalRef }));
    } catch (err) {
      console.error('Cashout error:', err);
    } finally {
      setLoadingCashout(null);
    }
  }

  const completedCount = disbursements.filter((d) => d.disbursement.status === 'completed').length;
  const totalCount = disbursements.length;

  return (
    <div className="space-y-6">
      {/* Run summary card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-gray-900">{run.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {run.workerCount} workers · Created {formatDateTime(run.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold text-rose-600">
              {displayUsdc(run.totalUsdc)} USDC
            </p>
            <p className="text-xs text-gray-500">total disbursement</p>
          </div>
        </div>

        {run.stellarTxHash && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Funding tx:</span>
            <span className="font-mono text-gray-700 truncate">{run.stellarTxHash.slice(0, 32)}...</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${run.stellarTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-500 hover:text-rose-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Progress bar */}
        {(streaming || run.status === 'disbursing' || run.status === 'completed') && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600">Disbursement progress</span>
              <span className="font-medium text-gray-900">{completedCount}/{totalCount}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA or status */}
        <div className="mt-4">
          {run.status === 'funded' && !streaming && (
            <Button onClick={startSSE} size="lg" className="w-full">
              <Zap className="w-5 h-5" />
              Start SDP Disbursement
            </Button>
          )}
          {streaming && (
            <div className="flex items-center gap-2 text-amber-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              SDP disbursing… {completedCount}/{totalCount} workers paid
            </div>
          )}
          {done && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-heading font-bold text-green-800 text-lg">
                Payroll Run Complete!
              </p>
              <p className="text-green-600 text-sm">
                {displayUsdc(run.totalUsdc)} USDC disbursed to {totalCount} workers
                {completedAt && ` · ${completedAt.toLocaleTimeString('en-MY')}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Worker payment cards */}
      <div>
        <h3 className="font-heading font-semibold text-gray-900 mb-3">Worker Disbursements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {disbursements.map(({ disbursement: disb, worker }) => {
            const statusCfg = STATUS_CONFIG[disb.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const cashoutRef = cashoutRefs[disb.id];
            const isCompleted = disb.status === 'completed';
            const isNew = worker.status === 'new';

            return (
              <div
                key={disb.id}
                className={cn(
                  'bg-white rounded-xl border p-4 shadow-sm transition-all duration-500',
                  isCompleted && 'border-green-200 shadow-green-100',
                  !isCompleted && 'border-gray-100',
                  disb.status === 'claimed' && 'border-amber-200 animate-pulse',
                )}
              >
                {/* Worker header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold',
                        isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm leading-tight">{worker.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{truncateAddr(worker.stellarAddress)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      statusCfg.color,
                    )}
                  >
                    <StatusIcon
                      className={cn('w-3 h-3', disb.status === 'claimed' && 'animate-spin')}
                    />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {isNew && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                      <Shield className="w-3 h-3" />
                      sponsored
                    </span>
                  )}
                  {disb.claimableBalanceId && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                      <BanknoteIcon className="w-3 h-3" />
                      claimable
                    </span>
                  )}
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="font-heading font-bold text-rose-600">
                    {displayUsdc(disb.amountUsdc)} USDC
                  </span>
                </div>

                {/* TX Hash */}
                {disb.stellarTxHash && (
                  <div className="text-xs text-gray-400 font-mono truncate mb-3">
                    tx: {disb.stellarTxHash.slice(0, 16)}...
                  </div>
                )}

                {/* Claimable balance ID */}
                {disb.claimableBalanceId && isCompleted && (
                  <div className="text-xs text-gray-400 font-mono truncate mb-3 bg-purple-50 px-2 py-1 rounded">
                    cb: {disb.claimableBalanceId.slice(0, 16)}...
                  </div>
                )}

                {/* Cash out button */}
                {isCompleted && !cashoutRef && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => handleCashOut(disb.id)}
                    disabled={loadingCashout === disb.id}
                  >
                    {loadingCashout === disb.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5" />
                    )}
                    Cash Out via MoneyGram
                  </Button>
                )}

                {cashoutRef && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-600 font-medium">MoneyGram Ref:</p>
                    <p className="font-mono font-bold text-green-800 text-sm">{cashoutRef}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
