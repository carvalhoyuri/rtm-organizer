import { redirect, notFound } from "next/navigation";
import { getCurrentUsuario } from "@/lib/session";
import { entrarNoGrupoPorCodigo } from "@/lib/grupos";

/** Destino do link de convite de um Grupo. Ver "Convite" em CONTEXT.md e ADR 0003. */
export default async function EntrarNoGrupoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect(`/login?next=${encodeURIComponent(`/j/${codigo}`)}`);

  const grupo = await entrarNoGrupoPorCodigo(codigo, usuario.id);
  if (!grupo) notFound();

  redirect(`/grupos/${grupo.id}`);
}
