import { createClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/supabase";

type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;

let _supabaseAdmin: TypedSupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
    }

    _supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  return _supabaseAdmin;
}

// For backward compatibility - use lazy initialization
export const supabaseAdmin = new Proxy({} as TypedSupabaseClient, {
  get(_, prop) {
    const admin = getSupabaseAdmin();
    return admin[prop as keyof typeof admin];
  },
});
