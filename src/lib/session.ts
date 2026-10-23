import "server-only";
import { db } from "./db";
import { createSupabaseServerClient } from "./supabase/server";

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
};

export async function getCurrentUsuario(): Promise<UsuarioAtual | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const usuario = await db.usuario.findUnique({ where: { id: user.id } });
  if (!usuario) return null; // conta autenticada mas sem perfil ainda (trigger não rodou / erro no cadastro)

  return usuario;
}
