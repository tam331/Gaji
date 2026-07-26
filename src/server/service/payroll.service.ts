import { and, desc, eq, sql } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import {
  type DisbursementStatus,
  disbursements,
  employers,
  type NewDisbursement,
  type NewPayrollRun,
  payrollRuns,
  sdpEvents,
  workers,
} from '@/server/db/schema';
import {
  cashoutDemoWorker,
  completeDemoRun,
  createDemoDisbursements,
  createDemoRun,
  fundDemoRun,
  getDemoEmployer,
  getDemoRun,
  getDemoRunWithDisbursements,
  listDemoRuns,
  listDemoWorkers,
  startDemoDisbursement,
  updateDemoDisbursement,
} from '@/server/demo-store';
import { AppError } from '@/server/lib/http';
import { simulateClaimableBalanceId, simulateStellarTxHash } from '@/server/lib/stellar';
import { sumMinorUnits, toMinorUnits } from '@/server/lib/usdc';

const isDemo = () => env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL;

export async function getOrCreateDefaultEmployer() {
  if (isDemo()) return getDemoEmployer();

  const existing = await db.select().from(employers).limit(1);
  if (existing[0]) return existing[0];

  const [employer] = await db
    .insert(employers)
    .values({
      name: "Fatimah's BPO Solutions",
      stellarAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K',
    })
    .returning();
  return employer;
}

export async function listPayrollRuns(employerId: string) {
  if (isDemo()) return listDemoRuns(employerId);

  return db
    .select()
    .from(payrollRuns)
    .where(eq(payrollRuns.employerId, employerId))
    .orderBy(desc(payrollRuns.createdAt));
}

export async function getDashboardData() {
  const employer = await getOrCreateDefaultEmployer();
  const runs = await listPayrollRuns(employer.id);

  if (isDemo()) {
    const totalDisbursed = runs
      .filter((run) => run.status === 'completed')
      .reduce((sum, run) => sum + BigInt(run.totalUsdc), 0n)
      .toString();
    return {
      employer,
      runs: runs.slice(0, 20),
      workerCount: listDemoWorkers().length,
      totalDisbursed,
    };
  }

  const [workerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workers)
    .where(eq(workers.employerId, employer.id));
  const totalDisbursed = runs
    .filter((run) => run.status === 'completed')
    .reduce((sum, run) => sum + BigInt(run.totalUsdc), 0n)
    .toString();
  return {
    employer,
    runs: runs.slice(0, 20),
    workerCount: workerCount?.count ?? 0,
    totalDisbursed,
  };
}

export async function getPayrollRun(id: string) {
  if (isDemo()) {
    try {
      return getDemoRun(id);
    } catch {
      throw new AppError('NOT_FOUND', 'Payroll run not found', 404);
    }
  }

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1);
  if (!run) throw new AppError('NOT_FOUND', 'Payroll run not found', 404);
  return run;
}

export async function getPayrollRunWithDisbursements(id: string) {
  if (isDemo()) {
    try {
      return getDemoRunWithDisbursements(id);
    } catch {
      throw new AppError('NOT_FOUND', 'Payroll run not found', 404);
    }
  }

  const run = await getPayrollRun(id);
  const disbs = await db
    .select({
      disbursement: disbursements,
      worker: workers,
    })
    .from(disbursements)
    .innerJoin(workers, eq(disbursements.workerId, workers.id))
    .where(eq(disbursements.payrollRunId, id))
    .orderBy(disbursements.createdAt);

  return { run, disbursements: disbs };
}

export interface WorkerPayload {
  name: string;
  stellarAddress: string;
  phone?: string;
  bankAccount?: string;
  amountUsdc: string; // display e.g. "150.00"
}

export async function createPayrollRun(
  employerId: string,
  name: string,
  workerPayloads: WorkerPayload[],
) {
  if (!workerPayloads.length) {
    throw new AppError('INVALID_INPUT', 'At least one worker required', 400);
  }

  if (isDemo()) return createDemoRun(name, workerPayloads);

  const amounts = workerPayloads.map((w) => toMinorUnits(w.amountUsdc));
  const totalUsdc = sumMinorUnits(amounts);

  const [run] = await db
    .insert(payrollRuns)
    .values({
      employerId,
      name,
      totalUsdc,
      workerCount: workerPayloads.length,
      status: 'draft',
    } satisfies NewPayrollRun)
    .returning();

  return run;
}

export async function fundAndDisburse(runId: string, employerId: string) {
  const run = await getPayrollRun(runId);
  if (run.employerId !== employerId) {
    throw new AppError('FORBIDDEN', 'Not your payroll run', 403);
  }
  if (run.status !== 'draft') {
    throw new AppError('CONFLICT', 'Run already funded', 409);
  }

  if (isDemo()) return fundDemoRun(runId);

  const txHash = simulateStellarTxHash();

  // Mark as funded
  const [funded] = await db
    .update(payrollRuns)
    .set({
      status: 'funded',
      stellarTxHash: txHash,
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, runId))
    .returning();

  return funded;
}

export async function startDisbursement(runId: string) {
  const run = await getPayrollRun(runId);
  if (run.status !== 'funded') {
    throw new AppError('CONFLICT', 'Run must be funded first', 409);
  }

  if (isDemo()) return startDemoDisbursement(runId);

  await db
    .update(payrollRuns)
    .set({ status: 'disbursing', updatedAt: new Date() })
    .where(eq(payrollRuns.id, runId));

  // Get disbursements for this run
  const disbs = await db.select().from(disbursements).where(eq(disbursements.payrollRunId, runId));

  return disbs;
}

export async function updateDisbursementStatus(disbursementId: string, status: DisbursementStatus) {
  if (isDemo()) {
    try {
      return updateDemoDisbursement(disbursementId, status);
    } catch {
      throw new AppError('NOT_FOUND', 'Disbursement not found', 404);
    }
  }

  const updates: Partial<typeof disbursements.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'claimed' || status === 'completed') {
    updates.stellarTxHash = simulateStellarTxHash();
  }

  const [updated] = await db
    .update(disbursements)
    .set(updates)
    .where(eq(disbursements.id, disbursementId))
    .returning();

  // Log SDP event
  await db.insert(sdpEvents).values({
    disbursementId,
    eventType: `disbursement.${status}`,
    payload: { status, txHash: updated?.stellarTxHash },
  });

  return updated;
}

export async function completeDisbursementRun(runId: string) {
  if (isDemo()) return completeDemoRun(runId);

  const [completed] = await db
    .update(payrollRuns)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.status, 'disbursing')))
    .returning();
  return completed;
}

export async function cashOutWorker(disbursementId: string) {
  if (isDemo()) {
    try {
      return cashoutDemoWorker(disbursementId);
    } catch {
      throw new AppError('NOT_FOUND', 'Disbursement not found', 404);
    }
  }

  const [disb] = await db
    .select()
    .from(disbursements)
    .where(eq(disbursements.id, disbursementId))
    .limit(1);

  if (!disb) throw new AppError('NOT_FOUND', 'Disbursement not found', 404);
  if (disb.status !== 'completed') {
    throw new AppError('CONFLICT', 'Disbursement not yet completed', 409);
  }
  if (disb.cashedOutAt) {
    throw new AppError('CONFLICT', 'Already cashed out', 409);
  }

  const withdrawalRef = `MGO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  const [updated] = await db
    .update(disbursements)
    .set({ cashedOutAt: new Date(), updatedAt: new Date() })
    .where(eq(disbursements.id, disbursementId))
    .returning();

  await db.insert(sdpEvents).values({
    disbursementId,
    eventType: 'cashout.initiated',
    payload: { withdrawalRef, provider: 'MoneyGram' },
  });

  return { withdrawalRef, disbursement: updated };
}

export async function createDisbursementsForRun(
  runId: string,
  workerPayloads: WorkerPayload[],
  employerId: string,
) {
  if (isDemo()) return createDemoDisbursements(runId, workerPayloads);

  // Upsert workers and create disbursements
  const newDisbs: NewDisbursement[] = [];

  for (const wp of workerPayloads) {
    // Check if worker exists by stellar address
    let [worker] = await db
      .select()
      .from(workers)
      .where(and(eq(workers.stellarAddress, wp.stellarAddress), eq(workers.employerId, employerId)))
      .limit(1);

    if (!worker) {
      [worker] = await db
        .insert(workers)
        .values({
          employerId,
          name: wp.name,
          stellarAddress: wp.stellarAddress,
          phone: wp.phone,
          bankAccount: wp.bankAccount,
          status: 'new',
        })
        .returning();
    }

    const amountMinor = toMinorUnits(wp.amountUsdc);
    // New workers get claimable balances
    const claimableBalanceId = worker.status === 'new' ? simulateClaimableBalanceId() : undefined;

    newDisbs.push({
      payrollRunId: runId,
      workerId: worker.id,
      amountUsdc: amountMinor,
      status: 'pending',
      claimableBalanceId,
    });
  }

  return db.insert(disbursements).values(newDisbs).returning();
}
