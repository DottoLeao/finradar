import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase com a service role key. Ignora RLS.
 * Usado exclusivamente no servidor (rota de upload) para os inserts em lote
 * de statements/transactions/reports — não há sessão de usuário no MVP.
 * Nunca importar em componentes client.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
