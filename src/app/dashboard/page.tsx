import { BanknoteIcon, PlusCircle, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { PayrollRunCard } from '@/components/PayrollRunCard';
import { Button } from '@/components/ui/button';
import { displayUsdc } from '@/lib/format';
import { getDashboardData } from '@/server/service/payroll.service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { employer, runs, workerCount, totalDisbursed } = await getDashboardData();

  const activeRun = runs.find((r) => r.status === 'disbursing' || r.status === 'funded');
  const completedRuns = runs.filter((r) => r.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap sm:py-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 shadow-sm shadow-rose-200">
                <BanknoteIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-gray-900">Gaji</h1>
                <p className="text-xs text-gray-500">Batch payroll in USDC</p>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Demo data · Mainnet Freighter actions</span>
              </div>
              <span className="hidden text-sm text-gray-600 lg:block">{employer.name}</span>
              <Link href="/payroll/new">
                <Button size="sm" className="gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  New Run
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
              Payroll control center
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl">
              Keep every payday on track.
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Prepare a roster, review the totals, and follow each worker payment from one place.
            </p>
          </div>
          <Link href="/payroll/new" className="shrink-0">
            <Button variant="outline" size="sm" className="w-full bg-white sm:w-auto">
              Start a payroll run
              <PlusCircle className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-rose-100 border-l-4 border-l-rose-500 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <BanknoteIcon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Disbursed</p>
                <p className="text-xl font-heading font-semibold text-gray-900">
                  {displayUsdc(totalDisbursed)} USDC
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Payroll Runs</p>
                <p className="text-xl font-heading font-semibold text-gray-900">
                  {completedRuns.length} completed
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-100 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Workers</p>
                <p className="text-xl font-heading font-semibold text-gray-900">
                  {workerCount} in roster
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Run */}
        {activeRun && (
          <div className="mb-8">
            <h2 className="font-heading text-lg font-semibold text-gray-900 mb-3">Active Run</h2>
            <Link href={`/payroll/${activeRun.id}`}>
              <PayrollRunCard run={activeRun} active />
            </Link>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-semibold text-gray-900">Payroll History</h2>
            <Link href="/payroll/new">
              <Button variant="outline" size="sm">
                <PlusCircle className="w-4 h-4" />
                New Payroll Run
              </Button>
            </Link>
          </div>

          {runs.filter((r) => !activeRun || r.id !== activeRun.id).length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <BanknoteIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-heading font-medium text-gray-600">No payroll runs yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload a worker roster to get started</p>
              <Link href="/payroll/new" className="inline-block mt-4">
                <Button>Create First Run</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {runs
                .filter((r) => !activeRun || r.id !== activeRun.id)
                .map((run) => (
                  <Link key={run.id} href={`/payroll/${run.id}`}>
                    <PayrollRunCard run={run} />
                  </Link>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
