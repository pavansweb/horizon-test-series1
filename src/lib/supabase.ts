import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export const isSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
   process.env.SUPABASE_SERVICE_ROLE_KEY ||
   process.env.SUPABASE_KEY)
);

export const supabase = getSupabase();
