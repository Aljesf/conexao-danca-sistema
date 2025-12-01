import { getSupabaseServer as getSupabaseServerSSR } from "./supabaseServerSSR";

// Alias para manter compatibilidade com helpers server-side.
export const getSupabaseServer = getSupabaseServerSSR;
