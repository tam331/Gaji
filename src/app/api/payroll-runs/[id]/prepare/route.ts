import { fail } from '@/server/lib/http';

export async function POST(_req: Request) {
  return fail('CONFLICT', 'Wallet signing is not enabled in the public demo yet.', 409);
}
