'use client';

import {
  AlertCircle,
  BanknoteIcon,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Star,
  Upload,
  Wallet,
} from 'lucide-react';
import { getAddress, setAllowed, signTransaction } from '@stellar/freighter-api';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MAINNET_PASSPHRASE,
  BATCH_PAYROLL_CONTRACT,
  prepareMainnetBatch,
  submitMainnetBatch,
} from '@/lib/mainnet-payroll';

const SAMPLE_WORKERS = [
  {
    name: 'Ahmad Rizki',
    stellarAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K',
    phone: '+60112345678',
    amountUsdc: '150.00',
    isNew: false,
  },
  {
    name: 'Siti Nurbaya',
    stellarAddress: 'GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP',
    phone: '+62812345678',
    amountUsdc: '150.00',
    isNew: false,
  },
  {
    name: 'Nguyen Van Hoa',
    stellarAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGGEWODOTNZA853JNWUVHZL',
    phone: '+84912345678',
    amountUsdc: '150.00',
    isNew: true,
  },
  {
    name: 'Maria Santos',
    stellarAddress: 'GBVGSZA2M66CSNZH63SYGP7CXDLQZPFZAHE4SJDKXMQE4L3ZUG4B2WX',
    phone: '+639123456789',
    amountUsdc: '150.00',
    isNew: false,
  },
  {
    name: 'Budi Santoso',
    stellarAddress: 'GDFRTHDXKNQFHPIMCM2FZYYVWQHPPZE5XNMKPLKWTYMDIZSWGWVRKPXA',
    phone: '+62813456789',
    amountUsdc: '150.00',
    isNew: true,
  },
];

function parseCSV(text: string) {
  const lines = text.trim().split('\n');
  // skip header
  const data = lines.slice(1).filter((l) => l.trim());
  return data.map((line) => {
    const parts = line.split(',').map((p) => p.trim().replace(/"/g, ''));
    return {
      name: parts[0] ?? '',
      stellarAddress: parts[1] ?? '',
      phone: parts[2] ?? '',
      amountUsdc: parts[3] ?? '150.00',
      isNew: false,
    };
  });
}

type Step = 'upload' | 'preview' | 'disbursing';

export function NewPayrollForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [runName, setRunName] = useState(
    `Payroll Run — ${new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}`,
  );
  const [workerRows, setWorkerRows] = useState(SAMPLE_WORKERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mainnetWallet, setMainnetWallet] = useState('');
  const [mainnetBusy, setMainnetBusy] = useState(false);
  const [mainnetStatus, setMainnetStatus] = useState('');
  const [mainnetHash, setMainnetHash] = useState('');

  const totalUsdc = workerRows.reduce((s, w) => s + parseFloat(w.amountUsdc || '0'), 0);

  function loadSample() {
    setWorkerRows(SAMPLE_WORKERS);
    setStep('preview');
  }

  async function connectMainnet() {
    try {
      const allowed = await setAllowed();
      if (allowed.error || !allowed.isAllowed)
        throw new Error(allowed.error?.message ?? 'Freighter access was not allowed');
      const address = await getAddress();
      if (address.error || !address.address)
        throw new Error(address.error?.message ?? 'No wallet address returned');
      setMainnetWallet(address.address);
    } catch (err) {
      setMainnetStatus(err instanceof Error ? err.message : 'Could not connect Freighter');
    }
  }

  async function fundMainnet() {
    if (!mainnetWallet) return setMainnetStatus('Connect Freighter first.');
    setMainnetBusy(true);
    setMainnetStatus('Preparing Mainnet batch transaction…');
    setMainnetHash('');
    try {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`024:${runName}:${Date.now()}`),
      );
      const prepared = await prepareMainnetBatch(mainnetWallet, new Uint8Array(digest), workerRows);
      const signed = await signTransaction(prepared.toXDR(), {
        address: mainnetWallet,
        networkPassphrase: MAINNET_PASSPHRASE,
      });
      if (signed.error || !signed.signedTxXdr)
        throw new Error(signed.error?.message ?? 'Freighter did not return a signature');
      const submitted = await submitMainnetBatch(signed.signedTxXdr);
      if (submitted.status === 'ERROR')
        throw new Error('Stellar rejected the Mainnet payroll batch');
      setMainnetHash(submitted.hash);
      setMainnetStatus(
        'Batch created and funded on Stellar Mainnet. Each worker must claim separately.',
      );
    } catch (err) {
      setMainnetStatus(err instanceof Error ? err.message : 'Mainnet payroll failed');
    } finally {
      setMainnetBusy(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No valid rows found in CSV');
        return;
      }
      setWorkerRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleFundDisburse() {
    setLoading(true);
    setError('');
    try {
      // Create payroll run
      const res = await fetch('/api/payroll-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: runName,
          workers: workerRows.map((w) => ({
            name: w.name,
            stellarAddress: w.stellarAddress,
            phone: w.phone,
            amountUsdc: w.amountUsdc,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Failed to create run');
      const run = json.data;

      // Fund the run
      const fundRes = await fetch(`/api/payroll-runs/${run.id}/fund`, { method: 'POST' });
      const fundJson = await fundRes.json();
      if (!fundJson.ok) throw new Error(fundJson.error?.message ?? 'Failed to fund run');

      // Navigate to run detail page for SSE streaming
      router.push(`/payroll/${run.id}?autostart=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm">
        <span className={cn('font-medium', step === 'upload' ? 'text-rose-600' : 'text-gray-400')}>
          1. Upload
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className={cn('font-medium', step === 'preview' ? 'text-rose-600' : 'text-gray-400')}>
          2. Preview
        </span>
        <ChevronRight className="w-4 h-4" />
        <span
          className={cn('font-medium', step === 'disbursing' ? 'text-rose-600' : 'text-gray-400')}
        >
          3. Disburse
        </span>
      </div>

      {/* Run Name */}
      <div>
        <label htmlFor="run-name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Run Name
        </label>
        <input
          id="run-name"
          type="text"
          value={runName}
          onChange={(e) => setRunName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          placeholder="e.g. June 2025 Payroll"
        />
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          {/* CSV Upload */}
          <label
            htmlFor="csv-upload"
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-rose-400 transition-colors cursor-pointer"
          >
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-heading font-medium text-gray-600">
              Drop CSV here or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Format: name, stellar_address, phone, amount_usdc
            </p>
            <input
              ref={fileRef}
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <div className="text-center text-gray-400 text-sm">— or —</div>

          {/* Sample roster */}
          <button
            type="button"
            onClick={loadSample}
            className="w-full flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-heading font-semibold text-rose-700">Load sample roster</p>
              <p className="text-sm text-gray-500">
                5 call-center contractors • 150 USDC each • 750 USDC total
              </p>
            </div>
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="text-center flex-1">
                <p className="text-2xl font-heading font-bold text-rose-600">
                  {totalUsdc.toFixed(2)} USDC
                </p>
                <p className="text-sm text-gray-500">Total disbursement</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center flex-1">
                <p className="text-2xl font-heading font-bold text-gray-900">{workerRows.length}</p>
                <p className="text-sm text-gray-500">Workers</p>
              </div>
              <div className="w-px h-12 bg-rose-200" />
              <div className="text-center flex-1">
                <p className="text-2xl font-heading font-bold text-gray-900">
                  {workerRows.filter((w) => w.isNew).length}
                </p>
                <p className="text-sm text-gray-500">New (sponsored)</p>
              </div>
            </div>
          </div>

          {/* Worker cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workerRows.map((worker) => (
              <div
                key={`${worker.name}-${worker.stellarAddress}`}
                className={cn(
                  'bg-white rounded-xl border p-4 shadow-sm',
                  worker.isNew ? 'border-amber-200' : 'border-gray-100',
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm leading-tight">
                        {worker.name}
                      </p>
                      <p className="text-xs text-gray-400">{worker.phone}</p>
                    </div>
                  </div>
                  {worker.isNew ? (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      new
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      reg.
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">
                    {worker.stellarAddress.slice(0, 8)}...
                  </span>
                  <span className="font-heading font-semibold text-rose-600 text-sm">
                    {worker.amountUsdc} USDC
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Stellar Mainnet
                </p>
                <p className="font-semibold text-emerald-950">
                  Create and fund this batch with Freighter
                </p>
                <p className="text-xs text-emerald-800 mt-1">
                  Native XLM SAC · worker amounts are converted from the preview values to XLM
                  stroops
                </p>
              </div>
              <button
                type="button"
                onClick={connectMainnet}
                disabled={mainnetBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Wallet className="w-3.5 h-3.5" />
                {mainnetWallet
                  ? `${mainnetWallet.slice(0, 5)}…${mainnetWallet.slice(-4)}`
                  : 'Connect Freighter'}
              </button>
            </div>
            <button
              type="button"
              onClick={fundMainnet}
              disabled={mainnetBusy || !mainnetWallet || workerRows.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {mainnetBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              {mainnetBusy ? 'Waiting for wallet…' : 'Fund payroll batch on Mainnet'}
            </button>
            {mainnetStatus && <p className="text-xs text-emerald-900">{mainnetStatus}</p>}
            {mainnetHash && (
              <p className="flex items-center gap-1 text-xs text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <a
                  className="underline"
                  href={`https://stellar.expert/explorer/public/tx/${mainnetHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Mainnet transaction <ExternalLink className="inline w-3 h-3" />
                </a>
              </p>
            )}
            <p className="text-[11px] font-mono text-emerald-800 truncate">
              Contract: {BATCH_PAYROLL_CONTRACT}
            </p>
          </section>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('upload')} disabled={loading}>
              ← Back
            </Button>
            <Button
              onClick={handleFundDisburse}
              disabled={loading || workerRows.length === 0}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>Signing transaction…</>
              ) : (
                <>
                  <BanknoteIcon className="w-5 h-5" />
                  Demo only · Fund & Disburse {totalUsdc.toFixed(2)} USDC
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
