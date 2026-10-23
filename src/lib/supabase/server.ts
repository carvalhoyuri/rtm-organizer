import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente Supabase pra Server Components/Server Actions/Route Handlers.
 * Lê/escreve o cookie de sessão via next/headers — em Server Components a
 * escrita falha silenciosamente (não dá pra setar cookie fora de uma
 * Server Action/Route Handler); é o middleware (src/middleware.ts) quem
 * garante que a sessão seja renovada nesses casos.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component — sem problema, ver comentário acima.
        }
      },
    },
  });
}
