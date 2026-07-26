import {
  completeDisbursementRun,
  getPayrollRunWithDisbursements,
  startDisbursement,
  updateDisbursementStatus,
} from '@/server/service/payroll.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Demo SSE stream for the staged worker disbursement animation. */
export async function GET(req: Request) {
  const runId = new URL(req.url).searchParams.get('runId');
  if (!runId) return new Response('Missing runId', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const initial = await getPayrollRunWithDisbursements(runId);
        const disbs = initial.disbursements;
        send({ type: 'start', runId, workerCount: disbs.length });
        await startDisbursement(runId);

        for (let i = 0; i < disbs.length; i += 1) {
          const entry = disbs[i];
          await sleep(500);
          const claimed = await updateDisbursementStatus(entry.disbursement.id, 'claimed');
          send({
            type: 'disbursement',
            disbursementId: claimed.id,
            workerId: entry.worker.id,
            workerName: entry.worker.name,
            status: claimed.status,
            txHash: claimed.stellarTxHash,
            claimableBalanceId: claimed.claimableBalanceId,
            isNew: entry.worker.status === 'new',
            index: i,
          });

          await sleep(400);
          const completed = await updateDisbursementStatus(entry.disbursement.id, 'completed');
          send({
            type: 'disbursement',
            disbursementId: completed.id,
            workerId: entry.worker.id,
            workerName: entry.worker.name,
            status: completed.status,
            txHash: completed.stellarTxHash,
            claimableBalanceId: completed.claimableBalanceId,
            isNew: entry.worker.status === 'new',
            index: i,
          });
        }

        await completeDisbursementRun(runId);
        send({ type: 'complete', runId, totalDisbursed: disbs.length });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
