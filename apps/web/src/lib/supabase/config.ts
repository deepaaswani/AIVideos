export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
      return null;
    if (
      parsed.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
