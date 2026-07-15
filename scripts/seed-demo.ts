import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';

const pool = new Pool({
  connectionString: process.env.DRIZZLE_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/stellar_agent_c',
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Seeding Gaji demo data...');

  // Clear existing data
  await db.delete(schema.sdpEvents);
  await db.delete(schema.disbursements);
  await db.delete(schema.payrollRuns);
  await db.delete(schema.workers);
  await db.delete(schema.employers);

  // Create employer
  const [employer] = await db
    .insert(schema.employers)
    .values({
      name: "Fatimah's BPO Solutions Sdn Bhd",
      stellarAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K',
    })
    .returning();

  console.log(`✅ Employer: ${employer.name}`);

  // Create workers (6 registered, 2 new)
  const workerData = [
    { name: 'Ahmad Rizki', stellarAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K', phone: '+60112345678', bankAccount: 'MBB-1234567890', status: 'registered' as const },
    { name: 'Siti Nurbaya', stellarAddress: 'GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP', phone: '+60193456789', bankAccount: 'CIMB-9876543210', status: 'registered' as const },
    { name: 'Nguyen Van Hoa', stellarAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGGEWODOTNZA853JNWUVHZL', phone: '+84912345678', bankAccount: null, status: 'new' as const },
    { name: 'Maria Santos', stellarAddress: 'GBVGSZA2M66CSNZH63SYGP7CXDLQZPFZAHE4SJDKXMQE4L3ZUG4B2WX', phone: '+639123456789', bankAccount: 'BDO-5555666677', status: 'registered' as const },
    { name: 'Budi Santoso', stellarAddress: 'GDFRTHDXKNQFHPIMCM2FZYYVWQHPPZE5XNMKPLKWTYMDIZSWGWVRKPXA', phone: '+62813456789', bankAccount: null, status: 'new' as const },
    { name: 'Linh Tran', stellarAddress: 'GBJCHHHWRP5MQJBQWGQHM2JBKRSKBBZHJ4MFZPJSYMIJBTLHXLHKDHY', phone: '+84987654321', bankAccount: 'Vietcombank-1234', status: 'registered' as const },
    { name: 'Priya Sharma', stellarAddress: 'GAKFD6Z3BQDCMHAKB7K4S4PPHFQHXHWXBH5SXBF6WLVHF5GQFHXKKWL', phone: '+601234567890', bankAccount: 'PBB-7654321098', status: 'registered' as const },
    { name: 'Kevin Lim', stellarAddress: 'GCKRTVGWXDMXKGGCBVQCHB5PQZXKR3MQLHJLHLPZXHGBB2JXR3W4NLHB', phone: '+6591234567', bankAccount: 'DBS-1111222233', status: 'registered' as const },
  ];

  const insertedWorkers = await db
    .insert(schema.workers)
    .values(workerData.map((w) => ({ ...w, employerId: employer.id })))
    .returning();

  console.log(`✅ Workers: ${insertedWorkers.length} created`);

  // Historical payroll runs (completed)
  const AMOUNT = '1050000000'; // 150.00 USDC in 7-decimal minor units
  const TOTAL_6 = '6300000000'; // 6 * 150 USDC
  const TOTAL_8 = '8400000000'; // 8 * 150 USDC

  const [run1] = await db
    .insert(schema.payrollRuns)
    .values({
      employerId: employer.id,
      name: 'April 2025 Payroll',
      totalUsdc: TOTAL_6,
      workerCount: 6,
      status: 'completed',
      stellarTxHash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',
      createdAt: new Date('2025-04-25T09:00:00Z'),
      updatedAt: new Date('2025-04-25T09:01:30Z'),
    })
    .returning();

  const [run2] = await db
    .insert(schema.payrollRuns)
    .values({
      employerId: employer.id,
      name: 'May 2025 Payroll',
      totalUsdc: TOTAL_8,
      workerCount: 8,
      status: 'completed',
      stellarTxHash: 'B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3',
      createdAt: new Date('2025-05-30T09:00:00Z'),
      updatedAt: new Date('2025-05-30T09:02:10Z'),
    })
    .returning();

  // Disbursements for run1 (6 workers, all completed)
  const run1Workers = insertedWorkers.slice(0, 6);
  for (const w of run1Workers) {
    const [disb] = await db
      .insert(schema.disbursements)
      .values({
        payrollRunId: run1.id,
        workerId: w.id,
        amountUsdc: AMOUNT,
        status: 'completed',
        stellarTxHash: `TX${Math.random().toString(36).slice(2, 10).toUpperCase()}`.padEnd(64, '0'),
        claimableBalanceId: w.status === 'new' ? `00000000${Math.random().toString(36).slice(2).toUpperCase().padEnd(56, '0')}` : null,
        cashedOutAt: w.status === 'registered' ? new Date('2025-04-25T10:00:00Z') : null,
        createdAt: new Date('2025-04-25T09:00:00Z'),
        updatedAt: new Date('2025-04-25T09:01:30Z'),
      })
      .returning();
    await db.insert(schema.sdpEvents).values([
      { disbursementId: disb.id, eventType: 'disbursement.claimed', payload: { status: 'claimed' }, createdAt: new Date('2025-04-25T09:00:30Z') },
      { disbursementId: disb.id, eventType: 'disbursement.completed', payload: { status: 'completed' }, createdAt: new Date('2025-04-25T09:01:00Z') },
    ]);
  }

  // Disbursements for run2 (all 8 workers, all completed)
  for (const w of insertedWorkers) {
    await db.insert(schema.disbursements).values({
      payrollRunId: run2.id,
      workerId: w.id,
      amountUsdc: AMOUNT,
      status: 'completed',
      stellarTxHash: `TX${Math.random().toString(36).slice(2, 10).toUpperCase()}`.padEnd(64, '0'),
      cashedOutAt: new Date('2025-05-30T10:00:00Z'),
      createdAt: new Date('2025-05-30T09:00:00Z'),
      updatedAt: new Date('2025-05-30T09:02:00Z'),
    });
  }

  // Active run (funded, ready to disburse)
  const [activeRun] = await db
    .insert(schema.payrollRuns)
    .values({
      employerId: employer.id,
      name: 'June 2025 Payroll',
      totalUsdc: TOTAL_8,
      workerCount: 8,
      status: 'funded',
      stellarTxHash: 'C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Disbursements for active run (all pending)
  for (const w of insertedWorkers) {
    await db.insert(schema.disbursements).values({
      payrollRunId: activeRun.id,
      workerId: w.id,
      amountUsdc: AMOUNT,
      status: 'pending',
      claimableBalanceId: w.status === 'new' ? `00000000${Math.random().toString(36).slice(2).toUpperCase().padEnd(56, '0')}` : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Payroll runs: April (completed), May (completed), June (funded/active)`);
  console.log(`\n🎉 Seed complete! Open http://localhost:3003/dashboard`);
  console.log(`   Active run: ${activeRun.id} — click to disburse!`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
