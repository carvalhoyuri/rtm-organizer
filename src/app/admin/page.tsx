import Link from "next/link";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { criarEdicaoAction } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  campos: "Preenche nome e ano da Edição.",
  edicao: "Edição não encontrada.",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const usuario = await exigirAdmin();
  const { erro } = await searchParams;

  const edicoes = await db.edicao.findMany({ orderBy: { ano: "desc" } });

  return (
    <div>
      <Header usuarioNome={usuario.nome} titulo="Admin" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/grupos" className="mb-4 inline-block text-sm text-rtm-muted hover:text-rtm-text hover:underline">
          ← Grupos
        </Link>

        {erro && (
          <p className="mb-4 rounded-lg bg-rtm-accent/10 px-3 py-2 text-sm text-rtm-accent">
            {MENSAGENS_ERRO[erro] ?? "Algo deu errado."}
          </p>
        )}

        <h1 className="mb-4 text-lg font-semibold">Edições (programação global)</h1>

        {edicoes.length === 0 && (
          <p className="rounded-xl border border-rtm-border bg-rtm-surface p-4 text-sm text-rtm-muted">
            Nenhuma Edição criada ainda.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {edicoes.map((edicao) => (
            <li key={edicao.id}>
              <Link
                href={`/admin/edicoes/${edicao.id}`}
                className="flex items-center justify-between rounded-xl border border-rtm-border bg-rtm-surface p-4 transition hover:border-rtm-accent2"
              >
                <span className="font-medium">{edicao.nome}</span>
                <span className="text-sm text-rtm-muted">{edicao.ano}</span>
              </Link>
            </li>
          ))}
        </ul>

        <form
          action={criarEdicaoAction}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-rtm-border bg-rtm-surface p-4"
        >
          <h2 className="text-sm font-semibold text-rtm-muted">Nova Edição</h2>
          <div className="flex gap-3">
            <input
              name="nome"
              required
              placeholder="Rock The Mountain 2026"
              className="flex-1 rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-sm outline-none focus:border-rtm-accent2"
            />
            <input
              name="ano"
              type="number"
              required
              placeholder="2026"
              className="w-24 rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-sm outline-none focus:border-rtm-accent2"
            />
          </div>
          <button type="submit" className="self-start rounded-lg bg-rtm-accent2 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Criar
          </button>
        </form>
      </main>
    </div>
  );
}
