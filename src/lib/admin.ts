import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUsuario, type UsuarioAtual } from "./session";

/**
 * Admin global (ver ADR 0004): único papel que cria Edições e sobe PDFs. Vem da
 * env ADMIN_EMAIL (lista separada por vírgula) — não é salvo no banco.
 */
export function ehAdmin(usuario: Pick<UsuarioAtual, "email">): boolean {
  const admins = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(usuario.email.toLowerCase());
}

/** Garante que a pessoa está autenticada e é admin; redireciona senão. */
export async function exigirAdmin(): Promise<UsuarioAtual> {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");
  if (!ehAdmin(usuario)) redirect("/grupos");
  return usuario;
}
