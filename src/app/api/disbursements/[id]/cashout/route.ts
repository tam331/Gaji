import { fromError, ok } from '@/server/lib/http';
import { cashOutWorker } from '@/server/service/payroll.service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await cashOutWorker(id);
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}
