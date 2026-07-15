import { fromError, ok } from '@/server/lib/http';
import { getOrCreateDefaultEmployer } from '@/server/service/payroll.service';

export async function GET() {
  try {
    const employer = await getOrCreateDefaultEmployer();
    return ok(employer);
  } catch (err) {
    return fromError(err);
  }
}
