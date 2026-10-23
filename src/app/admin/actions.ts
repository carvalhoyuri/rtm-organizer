"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/admin";
import { extrairProgramacaoPorTexto, ExtracaoInvalidaError } from "@/lib/extraction-texto";
import { aplicarRevisao } from "@/lib/revisao";

export async function criarEdicaoAction(formData: FormData) {
  await exigirAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const ano = Number(formData.get("ano"));

  if (!nome || !ano) {
    redirect("/admin?erro=campos");
  }

  const edicao = await db.edicao.create({ data: { nome, ano } });
  redirect(`/admin/edicoes/${edicao.id}`);
}

export async function uploadRevisaoAction(formData: FormData) {
  await exigirAdmin();

  const edicaoId = String(formData.get("edicaoId") ?? "");
  const arquivo = formData.get("arquivo") as File | null;
  const base = `/admin/edicoes/${edicaoId}`;

  if (!edicaoId || !arquivo || arquivo.size === 0) {
    redirect(`${base}?erro=arquivo`);
  }

  const edicao = await db.edicao.findUnique({ where: { id: edicaoId } });
  if (!edicao) {
    redirect("/admin?erro=edicao");
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  let resumo;
  let linhasIgnoradas = 0;
  try {
    const resultado = await extrairProgramacaoPorTexto(buffer, edicao.ano);
    linhasIgnoradas = resultado.linhasIgnoradas.length;
    resumo = await aplicarRevisao(edicaoId, arquivo.name, resultado.shows);
  } catch (err) {
    if (err instanceof ExtracaoInvalidaError) {
      redirect(`${base}?erro=invalido&msg=${encodeURIComponent(err.message)}`);
    }
    console.error("Falha ao processar revisão:", err);
    redirect(`${base}?erro=extracao`);
  }

  // A programação é global: invalida a página de qualquer Grupo que a exiba.
  revalidatePath("/grupos", "layout");
  redirect(
    `${base}?ok=1&criados=${resumo.showsCriados}&atualizados=${resumo.showsAtualizados}&cancelados=${resumo.showsCancelados}&ignoradas=${linhasIgnoradas}`
  );
}
