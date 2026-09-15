import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseInitialized = false;

function getEnvUrl(): string | undefined {
  const raw =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    'https://zcmkjgjhoypbwqsxewxg.supabase.co';
  return raw ? raw.trim().replace(/^["']|["']$/g, '') : undefined;
}

function getEnvKey(): string | undefined {
  const raw =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    'sb_publishable_oZRg3Jboyqi3K7r9fcv-eg_qvT0WPxd';
  return raw ? raw.trim().replace(/^["']|["']$/g, '') : undefined;
}

/**
 * Checks if Supabase credentials are configured in environment variables
 */
export function isSupabaseConfigured(): boolean {
  const url = getEnvUrl();
  const key = getEnvKey();
  return Boolean(url && key && url.startsWith('http') && !url.includes('your-project'));
}

/**
 * Returns the Supabase configuration details (without leaking secrets)
 */
export function getSupabaseConfigInfo() {
  const isConfigured = isSupabaseConfigured();
  return {
    isConfigured,
    mode: isConfigured ? 'SUPABASE' : 'SQLITE_LOCAL',
    url: isConfigured ? getEnvUrl() : null,
  };
}

/**
 * Lazy initialization of the Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      const url = getEnvUrl()!;
      const key = getEnvKey()!;
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      supabaseInitialized = true;
      console.log('✅ Supabase client successfully initialized with URL:', url);
    } catch (err) {
      console.error('❌ Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  }

  return supabaseInstance;
}
