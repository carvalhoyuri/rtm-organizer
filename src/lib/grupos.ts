import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUsuario, type UsuarioAtual } from "./session";

export type GrupoComPapel = {
  id: string;
  nome: string;
  codigoConvite: string;
  criadoPorId: string;
  criadoEm: Date;
  souCriador: boolean;
};

/**
 * Garante que a pessoa está autenticada e é Membro do Grupo; redireciona
 * senão. Ver "Grupo" em CONTEXT.md e ADRs 0003/0004 — o Grupo só delimita quem
 * vê os Favoritos de quem; não há papel de Curador (o admin é global, ver admin.ts).
 */
export async function exigirMembro(grupoId: string): Promise<{ usuario: UsuarioAtual; grupo: GrupoComPapel }> {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const grupo = await db.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) redirect("/grupos");

  const membro = await db.membroGrupo.findUnique({
    where: { grupoId_usuarioId: { grupoId, usuarioId: usuario.id } },
  });
  if (!membro) redirect("/grupos");

  return { usuario, grupo: { ...grupo, souCriador: grupo.criadoPorId === usuario.id } };
}

/**
 * Adiciona o Usuário como Membro do Grupo dono desse código de convite (ver
 * "Convite" em CONTEXT.md). Idempotente — visitar o link de novo não duplica
 * a participação. Retorna null se o código não corresponde a nenhum Grupo.
 */
export async function entrarNoGrupoPorCodigo(codigo: string, usuarioId: string) {
  const grupo = await db.grupo.findUnique({ where: { codigoConvite: codigo } });
  if (!grupo) return null;

  await db.membroGrupo.upsert({
    where: { grupoId_usuarioId: { grupoId: grupo.id, usuarioId } },
    create: { grupoId: grupo.id, usuarioId },
    update: {},
  });

  return grupo;
}
