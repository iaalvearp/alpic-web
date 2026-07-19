import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabase: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
	}

	supabase ??= createClient(supabaseUrl, supabasePublishableKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});

	return supabase;
}
