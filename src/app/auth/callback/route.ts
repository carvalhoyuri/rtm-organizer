import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

/**
 * Destino do redirectTo usado no login com Google e na confirmação de email do
 * cadastro — troca o `code` (PKCE) pela sessão e seta os cookies via
 * createSupabaseServerClient (Route Handler consegue escrever cookie, diferente
 * de um Server Component). `next` carrega de volta pra onde a pessoa estava
 * indo antes do login (ex: um link de convite de Grupo, ver src/app/j/).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/grupos");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}
