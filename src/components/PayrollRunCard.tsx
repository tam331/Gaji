import { BanknoteIcon, CheckCircle2, Clock, Loader2, Users, Zap } from 'lucide-react';
import { displayUsdc, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PayrollRun } from '@/server/db/schema';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'text-gray-500 bg-gray-50',
    icon: Clock,
    border: 'border-gray-200',
  },
  funded: {
    label: 'Funded',
    color: 'text-blue-600 bg-blue-50',
    icon: BanknoteIcon,
    border: 'border-blue-200',
  },
  disbursing: {
    label: 'Disbursing...',
    color: 'text-amber-600 bg-amber-50',
    icon: Loader2,
    border: 'border-amber-200',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 bg-green-50',
    icon: CheckCircle2,
    border: 'border-green-200',
  },
};

interface PayrollRunCardProps {
  run: PayrollRun;
  active?: boolean;
}

export function PayrollRunCard({ run, active }: PayrollRunCardProps) {
  const config = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-5 transition-all hover:shadow-md cursor-pointer',
        config.border,
        active && 'ring-2 ring-rose-500 shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {active && <Zap className="w-4 h-4 text-rose-500 flex-shrink-0" />}
            <h3 className="font-heading font-semibold text-gray-900 truncate">{run.name}</h3>
          </div>
          <p className="text-sm text-gray-500">{formatDate(run.createdAt)}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0',
            config.color,
          )}
        >
          <Icon
            className={cn('w-3.5 h-3.5', run.status === 'disbursing' && 'animate-spin')}
          />
          {config.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <BanknoteIcon className="w-4 h-4 text-rose-500" />
          <span className="font-medium">{displayUsdc(run.totalUsdc)} USDC</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{run.workerCount} workers</span>
        </div>
      </div>

      {run.stellarTxHash && (
        <p className="mt-2 text-xs text-gray-400 font-mono truncate">
          tx: {run.stellarTxHash.slice(0, 20)}...
        </p>
      )}
    </div>
  );
}
