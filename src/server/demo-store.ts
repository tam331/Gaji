import type {
  Disbursement,
  DisbursementStatus,
  Employer,
  PayrollRun,
  PayrollRunStatus,
  Worker,
} from '@/server/db/schema';
import { sumMinorUnits, toMinorUnits } from '@/server/lib/usdc';
import type { WorkerPayload } from '@/server/service/payroll.service';

export interface DemoDisbursementWithWorker {
  disbursement: Disbursement;
  worker: Worker;
}

const employerId = '11111111-1111-4111-8111-111111111111';
const demoEmployer: Employer = {
  id: employerId,
  name: "Fatimah's BPO Solutions",
  stellarAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const workerSeeds = [
  ['Ahmad Rizki', 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K', 'registered'],
  ['Siti Nurbaya', 'GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP', 'registered'],
  ['Nguyen Van Hoa', 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGGEWODOTNZA853JNWUVHZL', 'new'],
  ['Maria Santos', 'GBVGSZA2M66CSNZH63SYGP7CXDLQZPFZAHE4SJDKXMQE4L3ZUG4B2WX', 'registered'],
  ['Budi Santoso', 'GDFRTHDXKNQFHPIMCM2FZYYVWQHPPZE5XNMKPLKWTYMDIZSWGWVRKPXA', 'new'],
] as const;

const demoWorkers: Worker[] = workerSeeds.map(([name, stellarAddress, status], index) => ({
  id: `22222222-2222-4222-8222-22222222222${index + 1}`,
  employerId,
  name,
  stellarAddress,
  phone: `+60${index + 1}12345678`,
  bankAccount: status === 'registered' ? `DEMO-${index + 1}` : null,
  status,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
}));

const demoRuns = new Map<string, PayrollRun>();
const demoDisbursements = new Map<string, Disbursement>();
const demoWorkerMap = new Map<string, Worker>(demoWorkers.map((worker) => [worker.id, worker]));

const demoRun: PayrollRun = {
  id: '33333333-3333-4333-8333-333333333333',
  employerId,
  name: 'April Contractor Payroll',
  totalUsdc: '7500000000',
  workerCount: 5,
  status: 'completed',
  stellarTxHash: 'DEMO_FUNDING_TX_0000000000000000000000000000000000000000000000000000',
  createdAt: new Date('2026-04-25T09:00:00.000Z'),
  updatedAt: new Date('2026-04-25T09:05:00.000Z'),
};
demoRuns.set(demoRun.id, demoRun);

demoWorkers.forEach((worker, index) => {
  const id = `44444444-4444-4444-8444-44444444444${index + 1}`;
  demoDisbursements.set(id, {
    id,
    payrollRunId: demoRun.id,
    workerId: worker.id,
    amountUsdc: '1500000000',
    status: 'completed',
    claimableBalanceId:
      worker.status === 'new' ? `DEMO_CB_${String(index + 1).padStart(2, '0')}` : null,
    stellarTxHash: `DEMO_WORKER_TX_${String(index + 1).padStart(2, '0')}`,
    cashedOutAt: null,
    createdAt: demoRun.createdAt,
    updatedAt: demoRun.updatedAt,
  });
});

export function getDemoEmployer(): Employer {
  return demoEmployer;
}

export function listDemoWorkers(): Worker[] {
  return [...demoWorkerMap.values()];
}

export function listDemoRuns(employerIdValue: string): PayrollRun[] {
  return [...demoRuns.values()]
    .filter((run) => run.employerId === employerIdValue)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoRun(id: string): PayrollRun {
  const run = demoRuns.get(id);
  if (!run) throw new Error('Payroll run not found');
  return run;
}

export function getDemoRunWithDisbursements(id: string): {
  run: PayrollRun;
  disbursements: DemoDisbursementWithWorker[];
} {
  const run = getDemoRun(id);
  return {
    run,
    disbursements: [...demoDisbursements.values()]
      .filter((disb) => disb.payrollRunId === id)
      .map((disbursement) => {
        const worker = demoWorkerMap.get(disbursement.workerId);
        return worker ? { disbursement, worker } : null;
      })
      .filter((entry): entry is DemoDisbursementWithWorker => entry !== null),
  };
}

export function createDemoRun(name: string, workerPayloads: WorkerPayload[]): PayrollRun {
  const now = new Date();
  const run: PayrollRun = {
    id: crypto.randomUUID(),
    employerId,
    name,
    totalUsdc: sumMinorUnits(workerPayloads.map((worker) => toMinorUnits(worker.amountUsdc))),
    workerCount: workerPayloads.length,
    status: 'draft',
    stellarTxHash: null,
    createdAt: now,
    updatedAt: now,
  };
  demoRuns.set(run.id, run);
  return run;
}

export function createDemoDisbursements(
  runId: string,
  workerPayloads: WorkerPayload[],
): Disbursement[] {
  return workerPayloads.map((payload, index) => {
    const worker: Worker = {
      id: crypto.randomUUID(),
      employerId,
      name: payload.name,
      stellarAddress: payload.stellarAddress,
      phone: payload.phone ?? null,
      bankAccount: payload.bankAccount ?? null,
      status: index < 2 ? 'registered' : 'new',
      createdAt: new Date(),
    };
    demoWorkerMap.set(worker.id, worker);
    const disbursement: Disbursement = {
      id: crypto.randomUUID(),
      payrollRunId: runId,
      workerId: worker.id,
      amountUsdc: toMinorUnits(payload.amountUsdc),
      status: 'pending',
      claimableBalanceId: worker.status === 'new' ? `DEMO_CB_${crypto.randomUUID()}` : null,
      stellarTxHash: null,
      cashedOutAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoDisbursements.set(disbursement.id, disbursement);
    return disbursement;
  });
}

function updateDemoRun(id: string, status: PayrollRunStatus, txHash?: string | null): PayrollRun {
  const run = getDemoRun(id);
  const updated = {
    ...run,
    status,
    updatedAt: new Date(),
    stellarTxHash: txHash ?? run.stellarTxHash,
  };
  demoRuns.set(id, updated);
  return updated;
}

export function fundDemoRun(id: string): PayrollRun {
  return updateDemoRun(id, 'funded', `DEMO_FUNDING_${crypto.randomUUID()}`);
}

export function startDemoDisbursement(id: string): Disbursement[] {
  updateDemoRun(id, 'disbursing');
  return [...demoDisbursements.values()].filter((disb) => disb.payrollRunId === id);
}

export function updateDemoDisbursement(id: string, status: DisbursementStatus): Disbursement {
  const disbursement = demoDisbursements.get(id);
  if (!disbursement) throw new Error('Disbursement not found');
  const updated = {
    ...disbursement,
    status,
    stellarTxHash:
      status === 'claimed' || status === 'completed'
        ? `DEMO_TX_${crypto.randomUUID()}`
        : disbursement.stellarTxHash,
    updatedAt: new Date(),
  };
  demoDisbursements.set(id, updated);
  return updated;
}

export function completeDemoRun(id: string): PayrollRun {
  return updateDemoRun(id, 'completed');
}

export function cashoutDemoWorker(id: string): {
  withdrawalRef: string;
  disbursement: Disbursement;
} {
  const disbursement = demoDisbursements.get(id);
  if (!disbursement) throw new Error('Disbursement not found');
  const updated = { ...disbursement, cashedOutAt: new Date(), updatedAt: new Date() };
  demoDisbursements.set(id, updated);
  return {
    withdrawalRef: `MGO-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    disbursement: updated,
  };
}
