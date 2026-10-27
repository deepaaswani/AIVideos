import { redirect } from 'next/navigation';
import { safeAuthDestination } from '@/lib/auth/validation';

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  redirect(`/login?next=${encodeURIComponent(safeAuthDestination((await searchParams).next))}`);
}
