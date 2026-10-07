import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser client for realtime presence. Game saves go through the Next.js API,
 * which checks the Clerk session and writes with the Supabase service role.
 * Pass a Clerk `getToken` so row-level reads run as the signed-in user.
 */
export function getSupabase(accessToken?: () => Promise<string | null>): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (accessToken) {
    return createClient(url, key, {
      accessToken: async () => (await accessToken()) ?? null,
    });
  }
  if (!client) client = createClient(url, key);
  return client;
}
