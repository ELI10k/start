export type SupabasePublicConfig = Readonly<{ url: string; anonKey: string }>;
export function getSupabaseConfig(): SupabasePublicConfig | null { const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(); const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(); return url && anonKey ? { url, anonKey } : null; }
export function requireSupabaseConfig(): SupabasePublicConfig { const config = getSupabaseConfig(); if (!config) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."); return config; }
