import { z } from 'zod';
import { created, fromError, ok } from '@/server/lib/http';
import {
  createDisbursementsForRun,
  createPayrollRun,
  getOrCreateDefaultEmployer,
  listPayrollRuns,
} from '@/server/service/payroll.service';

const createSchema = z.object({
  name: z.string().min(1),
  workers: z.array(
    z.object({
      name: z.string().min(1),
      stellarAddress: z.string().min(1),
      phone: z.string().optional(),
      bankAccount: z.string().optional(),
      amountUsdc: z.string().min(1),
    }),
  ),
});

export async function GET() {
  try {
    const employer = await getOrCreateDefaultEmployer();
    const runs = await listPayrollRuns(employer.id);
    return ok({ runs, employer });
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fromError({ name: 'ZodError', issues: parsed.error.issues });
    }
    const { name, workers } = parsed.data;
    const employer = await getOrCreateDefaultEmployer();
    const run = await createPayrollRun(employer.id, name, workers);
    // Create disbursements immediately
    await createDisbursementsForRun(run.id, workers, employer.id);
    return created(run);
  } catch (err) {
    return fromError(err);
  }
}
