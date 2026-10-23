import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getAuthUserId, type UsuarioAtual } from "./session";

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
  const usuarioId = await getAuthUserId();
  if (!usuarioId) redirect("/login");

  // Uma única ida ao banco: Usuário + (se for Membro) o Grupo. Cada consulta
  // a mais custa uma viagem de rede inteira até o Postgres.
  const row = await db.usuario.findUnique({
    where: { id: usuarioId },
    include: { participacoes: { where: { grupoId }, include: { grupo: true } } },
  });
  if (!row) redirect("/login");

  const grupo = row.participacoes[0]?.grupo;
  if (!grupo) redirect("/grupos");

  const { participacoes: _participacoes, ...usuario } = row;
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
