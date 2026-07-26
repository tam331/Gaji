import { ArrowLeft, BanknoteIcon } from 'lucide-react';
import Link from 'next/link';
import { NewPayrollForm } from '@/components/NewPayrollForm';

export default function NewPayrollPage() {
  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center gap-3 py-3 sm:py-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600">
                <BanknoteIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold text-gray-900">New Payroll Run</h1>
                <p className="text-xs text-gray-500">Review workers before disbursement</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <NewPayrollForm />
      </main>
    </div>
  );
}
