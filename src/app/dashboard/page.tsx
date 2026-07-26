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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
                <BanknoteIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-gray-900">Gaji</h1>
                <p className="text-xs text-gray-500">One click. Every worker paid in USDC.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:block">{employer.name}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
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
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
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
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
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
