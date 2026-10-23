import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { exigirMembro } from "@/lib/grupos";
import { Header } from "@/components/Header";

const MENSAGENS_ERRO: Record<string, string> = {
  edicao: "Edição não encontrada.",
};

export default async function GrupoPage({
  params,
  searchParams,
}: {
  params: Promise<{ grupoId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { grupoId } = await params;
  const { usuario, grupo } = await exigirMembro(grupoId);
  const { erro } = await searchParams;

  // A programação é global (ver ADR 0004): todo Grupo vê as mesmas Edições.
  const edicoes = await db.edicao.findMany({ orderBy: { ano: "desc" } });
  const origin = (await headers()).get("origin");
  const linkConvite = `${origin}/j/${grupo.codigoConvite}`;

  return (
    <div>
      <Header usuarioNome={usuario.nome} titulo={grupo.nome} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {erro && (
          <p className="mb-4 rounded-lg bg-rtm-accent/10 px-3 py-2 text-sm text-rtm-accent">
            {MENSAGENS_ERRO[erro] ?? "Algo deu errado."}
          </p>
        )}

        <div className="mb-6 rounded-xl border border-rtm-border bg-rtm-surface p-4">
          <h2 className="mb-1 text-sm font-semibold text-rtm-muted">Convidar amigos</h2>
          <p className="mb-2 text-xs text-rtm-muted">Quem abrir esse link autenticado entra direto no Grupo.</p>
          <code className="block overflow-x-auto whitespace-nowrap rounded-lg bg-rtm-bg px-3 py-2 text-sm">{linkConvite}</code>
        </div>

        <h1 className="mb-4 text-lg font-semibold">Edições</h1>

        {edicoes.length === 0 && (
          <p className="rounded-xl border border-rtm-border bg-rtm-surface p-4 text-sm text-rtm-muted">
            Nenhuma Edição publicada ainda — a programação ainda não foi cadastrada pelo admin.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {edicoes.map((edicao) => (
            <li key={edicao.id}>
              <Link
                href={`/grupos/${grupoId}/edicoes/${edicao.id}`}
                className="flex items-center justify-between rounded-xl border border-rtm-border bg-rtm-surface p-4 transition hover:border-rtm-accent2"
              >
                <span className="font-medium">{edicao.nome}</span>
                <span className="text-sm text-rtm-muted">{edicao.ano}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
