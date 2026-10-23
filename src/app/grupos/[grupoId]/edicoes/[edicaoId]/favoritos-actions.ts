"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirMembro } from "@/lib/grupos";

export async function alternarFavoritoAction(formData: FormData) {
  const grupoId = String(formData.get("grupoId") ?? "");
  const { usuario } = await exigirMembro(grupoId);

  const showId = String(formData.get("showId") ?? "");
  const edicaoId = String(formData.get("edicaoId") ?? "");
  if (!showId) return;

  // Favorito é do Usuário e vale em todos os Grupos (ver ADR 0004) — basta o Show existir.
  const show = await db.show.findUnique({ where: { id: showId } });
  if (!show) return;

  const existente = await db.favorito.findUnique({
    where: { usuarioId_showId: { usuarioId: usuario.id, showId } },
  });

  if (existente) {
    await db.favorito.delete({ where: { id: existente.id } });
  } else {
    await db.favorito.create({ data: { usuarioId: usuario.id, showId, status: "CONFIRMADO" } });
  }

  revalidatePath(`/grupos/${grupoId}/edicoes/${edicaoId}`);
}

export async function confirmarFavoritoAction(formData: FormData) {
  const grupoId = String(formData.get("grupoId") ?? "");
  const { usuario } = await exigirMembro(grupoId);

  const favoritoId = String(formData.get("favoritoId") ?? "");
  const edicaoId = String(formData.get("edicaoId") ?? "");

  await db.favorito.updateMany({
    where: { id: favoritoId, usuarioId: usuario.id },
    data: { status: "CONFIRMADO" },
  });

  revalidatePath(`/grupos/${grupoId}/edicoes/${edicaoId}`);
}

export async function removerFavoritoAction(formData: FormData) {
  const grupoId = String(formData.get("grupoId") ?? "");
  const { usuario } = await exigirMembro(grupoId);

  const favoritoId = String(formData.get("favoritoId") ?? "");
  const edicaoId = String(formData.get("edicaoId") ?? "");

  await db.favorito.deleteMany({ where: { id: favoritoId, usuarioId: usuario.id } });

  revalidatePath(`/grupos/${grupoId}/edicoes/${edicaoId}`);
}
