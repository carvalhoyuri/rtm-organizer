import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirMembro } from "@/lib/grupos";
import { getAgenda, amigosPorShow } from "@/lib/agenda";
import { Header } from "@/components/Header";
import { Programacao, type ShowProgramacao } from "@/components/Programacao";
import { AgendaView } from "@/components/AgendaView";

type Tab = "programacao" | "agenda";

export default async function EdicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ grupoId: string; edicaoId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { grupoId, edicaoId } = await params;
  const { usuario, grupo } = await exigirMembro(grupoId);
  const sp = await searchParams;
  const tab: Tab = sp.tab === "agenda" ? "agenda" : "programacao";

  // A Edição é global (ver ADR 0004) — qualquer Membro de qualquer Grupo pode ver.
  const edicao = await db.edicao.findUnique({ where: { id: edicaoId } });
  if (!edicao) notFound();

  let programacaoShows: ShowProgramacao[] = [];
  let agenda: Awaited<ReturnType<typeof getAgenda>> | null = null;

  if (tab === "programacao") {
    const [shows, meusFavoritos, amigos] = await Promise.all([
      db.show.findMany({
        where: { edicaoId, status: "ATIVO" },
        include: { palco: true, dia: true },
        orderBy: [{ dia: { data: "asc" } }, { horarioInicio: "asc" }],
      }),
      db.favorito.findMany({ where: { usuarioId: usuario.id, show: { edicaoId } } }),
      amigosPorShow(edicaoId, grupoId),
    ]);
    const favoritadoIds = new Set(meusFavoritos.map((f) => f.showId));
    programacaoShows = shows.map((show) => ({
      id: show.id,
      artista: show.artista,
      palco: show.palco.nome,
      horarioInicio: show.horarioInicio,
      horarioFim: show.horarioFim,
      diaId: show.diaId,
      dia: show.dia.data,
      favoritado: favoritadoIds.has(show.id),
      amigos: (amigos.get(show.id) ?? []).filter((nome) => nome !== usuario.nome),
    }));
  } else if (tab === "agenda") {
    agenda = await getAgenda(usuario.id, edicaoId, grupoId);
  }

  const abas: { id: Tab; label: string }[] = [
    { id: "programacao", label: "Programação" },
    { id: "agenda", label: "Minha Agenda" },
  ];

  return (
    <div>
      <Header usuarioNome={usuario.nome} titulo={edicao.nome} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href={`/grupos/${grupoId}`} className="mb-4 inline-block text-sm text-rtm-muted hover:text-rtm-text hover:underline">
          ← {grupo.nome}
        </Link>

        <nav className="mb-6 flex gap-1 rounded-xl border border-rtm-border bg-rtm-surface p-1">
          {abas.map((aba) => (
            <Link
              key={aba.id}
              href={`/grupos/${grupoId}/edicoes/${edicaoId}?tab=${aba.id}`}
              className={
                "flex-1 rounded-lg py-2 text-center text-sm font-medium transition " +
                (tab === aba.id ? "bg-rtm-accent2 text-white" : "text-rtm-muted hover:text-rtm-text")
              }
            >
              {aba.label}
            </Link>
          ))}
        </nav>

        {tab === "programacao" && <Programacao grupoId={grupoId} edicaoId={edicaoId} shows={programacaoShows} />}
        {tab === "agenda" && agenda && <AgendaView grupoId={grupoId} edicaoId={edicaoId} agenda={agenda} />}
      </main>
    </div>
  );
}
