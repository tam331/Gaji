import { ArrowLeft, BanknoteIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrCreateDefaultEmployer, getPayrollRunWithDisbursements } from '@/server/service/payroll.service';
import { PayrollRunDetail } from '@/components/PayrollRunDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autostart?: string }>;
}

export default async function PayrollRunPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { autostart } = await searchParams;

  try {
    const employer = await getOrCreateDefaultEmployer();
    const data = await getPayrollRunWithDisbursements(id);

    if (data.run.employerId !== employer.id) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 h-16">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                  <BanknoteIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="font-heading text-lg font-bold text-gray-900">{data.run.name}</h1>
                  <p className="text-xs text-gray-500">{data.run.workerCount} workers · {data.run.status}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PayrollRunDetail
            initialRun={data.run}
            initialDisbursements={data.disbursements}
            autostart={autostart === '1'}
          />
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}
