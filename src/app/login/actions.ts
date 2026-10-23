"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/grupos");

  if (!email || !senha) {
    redirect(`/login?erro=campos&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=credenciais&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function loginComGoogleAction(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""), "/grupos");
  const origin = (await headers()).get("origin");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    redirect(`/login?erro=google&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}
