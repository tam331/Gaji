import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { disbursements, payrollRuns, workers } from '@/server/db/schema';
import { simulateStellarTxHash } from '@/server/lib/stellar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for SDP disbursement simulation.
 * Query: ?runId=<uuid>
 * Streams: pending → claimed → completed for each worker, 500ms apart.
 * Uses manual ReadableStream per pitfall #9 (do NOT use sdk stream()).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');

  if (!runId) {
    return new Response('Missing runId', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Get run and disbursements
        const [run] = await db
          .select()
          .from(payrollRuns)
          .where(eq(payrollRuns.id, runId))
          .limit(1);

        if (!run) {
          send({ type: 'error', message: 'Run not found' });
          controller.close();
          return;
        }

        const disbs = await db
          .select({ disbursement: disbursements, worker: workers })
          .from(disbursements)
          .innerJoin(workers, eq(disbursements.workerId, workers.id))
          .where(eq(disbursements.payrollRunId, runId));

        send({ type: 'start', runId, workerCount: disbs.length });

        // Mark run as disbursing
        await db
          .update(payrollRuns)
          .set({ status: 'disbursing', updatedAt: new Date() })
          .where(eq(payrollRuns.id, runId));

        // Stream each worker status update with delay
        for (let i = 0; i < disbs.length; i++) {
          const { disbursement: disb, worker } = disbs[i];

          await sleep(500);

          // claimed
          const claimedTx = simulateStellarTxHash();
          await db
            .update(disbursements)
            .set({ status: 'claimed', stellarTxHash: claimedTx, updatedAt: new Date() })
            .where(eq(disbursements.id, disb.id));

          send({
            type: 'disbursement',
            disbursementId: disb.id,
            workerId: disb.workerId,
            workerName: worker.name,
            status: 'claimed',
            txHash: claimedTx,
            claimableBalanceId: disb.claimableBalanceId,
            isNew: worker.status === 'new',
            index: i,
          });

          await sleep(400);

          // completed
          const completedTx = simulateStellarTxHash();
          await db
            .update(disbursements)
            .set({ status: 'completed', stellarTxHash: completedTx, updatedAt: new Date() })
            .where(eq(disbursements.id, disb.id));

          send({
            type: 'disbursement',
            disbursementId: disb.id,
            workerId: disb.workerId,
            workerName: worker.name,
            status: 'completed',
            txHash: completedTx,
            claimableBalanceId: disb.claimableBalanceId,
            isNew: worker.status === 'new',
            index: i,
          });
        }

        // Complete the run
        await db
          .update(payrollRuns)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(payrollRuns.id, runId));

        send({ type: 'complete', runId, totalDisbursed: disbs.length });
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
