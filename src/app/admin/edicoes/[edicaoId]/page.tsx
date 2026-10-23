import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { RevisoesPanel } from "@/components/RevisoesPanel";

const MENSAGENS_ERRO: Record<string, string> = {
  arquivo: "Escolhe um arquivo PDF antes de enviar.",
  extracao: "Não consegui extrair a programação desse PDF. Tenta de novo — se persistir, o PDF pode estar corrompido ou num formato inesperado.",
};

export default async function AdminEdicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ edicaoId: string }>;
  searchParams: Promise<{
    ok?: string;
    criados?: string;
    atualizados?: string;
    cancelados?: string;
    ignoradas?: string;
    erro?: string;
    msg?: string;
  }>;
}) {
  const usuario = await exigirAdmin();
  const { edicaoId } = await params;
  const sp = await searchParams;

  const edicao = await db.edicao.findUnique({ where: { id: edicaoId } });
  if (!edicao) notFound();

  const revisoes = await db.revisao.findMany({ where: { edicaoId }, orderBy: { criadoEm: "desc" } });

  const ignoradas = Number(sp.ignoradas ?? 0);
  const mensagem = sp.ok
    ? {
        tipo: "ok" as const,
        texto:
          `Revisão aplicada: ${sp.criados ?? 0} shows novos, ${sp.atualizados ?? 0} atualizados, ${sp.cancelados ?? 0} cancelados.` +
          (ignoradas > 0 ? ` ${ignoradas} linha(s) do PDF não foram reconhecidas e ficaram de fora.` : ""),
      }
    : sp.erro === "invalido" && sp.msg
      ? { tipo: "erro" as const, texto: sp.msg }
      : sp.erro
        ? { tipo: "erro" as const, texto: MENSAGENS_ERRO[sp.erro] ?? "Algo deu errado." }
        : undefined;

  return (
    <div>
      <Header usuarioNome={usuario.nome} titulo={edicao.nome} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/admin" className="mb-4 inline-block text-sm text-rtm-muted hover:text-rtm-text hover:underline">
          ← Admin
        </Link>
        <RevisoesPanel edicaoId={edicaoId} revisoes={revisoes} mensagem={mensagem} />
      </main>
    </div>
  );
}
