import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase pra Client Components. Não usado hoje (login/registro/OAuth
 * rodam via Server Actions), mas é o padrão oficial ter os dois lados prontos. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
