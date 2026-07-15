import { fromError, ok } from '@/server/lib/http';
import { fundAndDisburse, getOrCreateDefaultEmployer } from '@/server/service/payroll.service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employer = await getOrCreateDefaultEmployer();
    const run = await fundAndDisburse(id, employer.id);
    return ok(run);
  } catch (err) {
    return fromError(err);
  }
}
