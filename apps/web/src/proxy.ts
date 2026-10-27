import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/signin',
    '/dashboard/:path*',
    '/projects/:path*',
    '/api/v1/projects/:path*',
    '/api/v1/idea/:path*',
  ],
};
