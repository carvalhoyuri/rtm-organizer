"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

export async function registerAction(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/grupos");
  const nextQuery = `&next=${encodeURIComponent(next)}`;

  if (!nome || !email || !senha) {
    redirect(`/register?erro=campos${nextQuery}`);
  }
  if (senha.length < 6) {
    redirect(`/register?erro=senha-curta${nextQuery}`);
  }

  const origin = (await headers()).get("origin");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { full_name: nome },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const codigo = error.message.toLowerCase().includes("already registered") ? "email-existente" : "cadastro";
    redirect(`/register?erro=${codigo}${nextQuery}`);
  }

  // Com "Confirm email" habilitado no projeto (padrão do Supabase), o cadastro
  // não devolve sessão até a pessoa clicar o link do email — só nesse caso
  // (confirmação desligada) já criamos sessão direto.
  if (data.session) {
    redirect(next);
  }

  redirect(`/register?ok=1${nextQuery}`);
}
