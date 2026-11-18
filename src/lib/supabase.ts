import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cloudEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'tl_auth',
      },
    })
  : null;
