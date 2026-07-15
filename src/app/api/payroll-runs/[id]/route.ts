import { fromError, ok } from '@/server/lib/http';
import { getOrCreateDefaultEmployer, getPayrollRunWithDisbursements } from '@/server/service/payroll.service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employer = await getOrCreateDefaultEmployer();
    const data = await getPayrollRunWithDisbursements(id);
    if (data.run.employerId !== employer.id) {
      return fromError({ name: 'AppError', code: 'FORBIDDEN', message: 'Forbidden', status: 403 });
    }
    return ok(data);
  } catch (err) {
    return fromError(err);
  }
}
