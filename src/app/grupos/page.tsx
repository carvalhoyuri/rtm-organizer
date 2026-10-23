import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUsuario } from "@/lib/session";
import { ehAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { criarGrupoAction } from "./actions";

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");
  const { erro } = await searchParams;

  const participacoes = await db.membroGrupo.findMany({
    where: { usuarioId: usuario.id },
    include: { grupo: true },
    orderBy: { entrouEm: "desc" },
  });

  return (
    <div>
      <Header usuarioNome={usuario.nome} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {ehAdmin(usuario) && (
          <Link href="/admin" className="mb-4 inline-block text-sm text-rtm-accent2 hover:underline">
            Administrar programação →
          </Link>
        )}

        <h1 className="mb-4 text-lg font-semibold">Seus Grupos</h1>

        {participacoes.length === 0 && (
          <p className="rounded-xl border border-rtm-border bg-rtm-surface p-4 text-sm text-rtm-muted">
            Você ainda não faz parte de nenhum Grupo. Cria um abaixo, ou pede o link de convite pra um amigo que já
            tem um.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {participacoes.map(({ grupo }) => (
            <li key={grupo.id}>
              <Link
                href={`/grupos/${grupo.id}`}
                className="flex items-center justify-between rounded-xl border border-rtm-border bg-rtm-surface p-4 transition hover:border-rtm-accent2"
              >
                <span className="font-medium">{grupo.nome}</span>
                {grupo.criadoPorId === usuario.id && (
                  <span className="rounded bg-rtm-accent2/20 px-1.5 py-0.5 text-xs text-rtm-accent2">criador</span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <form action={criarGrupoAction} className="mt-8 flex flex-col gap-3 rounded-xl border border-rtm-border bg-rtm-surface p-4">
          <h2 className="text-sm font-semibold text-rtm-muted">Novo Grupo</h2>
          {erro === "campos" && <p className="text-sm text-rtm-accent">Preenche o nome do Grupo.</p>}
          <input
            name="nome"
            required
            placeholder="Eu e a galera"
            className="rounded-lg border border-rtm-border bg-rtm-bg px-3 py-2 text-sm outline-none focus:border-rtm-accent2"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-rtm-accent2 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Criar
          </button>
        </form>
      </main>
    </div>
  );
}
