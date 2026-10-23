"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/session";

export async function criarGrupoAction(formData: FormData) {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) redirect("/grupos?erro=campos");

  const grupo = await db.grupo.create({
    data: {
      nome,
      criadoPorId: usuario.id,
      // Quem cria o Grupo já entra como Membro, pra ver os Favoritos dos amigos.
      membros: { create: { usuarioId: usuario.id } },
    },
  });

  redirect(`/grupos/${grupo.id}`);
}
