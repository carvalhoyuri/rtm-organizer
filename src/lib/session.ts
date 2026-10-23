import "server-only";
import { cache } from "react";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
};

/**
 * Id do usuário autenticado, validado no servidor do Supabase (getUser, não
 * getSession — o cookie sozinho pode ser forjado). `cache` garante uma única
 * chamada de rede por request, mesmo se vários helpers perguntarem.
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

export const getCurrentUsuario = cache(async (): Promise<UsuarioAtual | null> => {
  const id = await getAuthUserId();
  if (!id) return null;

  const usuario = await db.usuario.findUnique({ where: { id } });
  return usuario; // null = conta autenticada mas sem perfil ainda (trigger não rodou / erro no cadastro)
});
