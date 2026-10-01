import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("Supabase credentials not configured. Auth features will not work.");
}

export const supabase = createClient(supabaseUrl || "", supabasePublishableKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata: {
    name?: string;
    avatar_url?: string;
    avatar_id?: string;
    [key: string]: unknown;
  };
  app_metadata: {
    provider?: string;
    [key: string]: unknown;
  };
};

export type SupabaseSession = {
  user: SupabaseUser | null;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
} | null;