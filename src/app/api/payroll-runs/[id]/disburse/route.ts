import { fromError, ok } from '@/server/lib/http';
import {
  completeDisbursementRun,
  getOrCreateDefaultEmployer,
  startDisbursement,
  updateDisbursementStatus,
} from '@/server/service/payroll.service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await getOrCreateDefaultEmployer();
    const disbs = await startDisbursement(id);
    // Simulate SDP disbursement: update all to completed
    for (const disb of disbs) {
      await updateDisbursementStatus(disb.id, 'claimed');
      await updateDisbursementStatus(disb.id, 'completed');
    }
    const completed = await completeDisbursementRun(id);
    return ok({ run: completed, disbursedCount: disbs.length });
  } catch (err) {
    return fromError(err);
  }
}
