import { formatDia } from "@/lib/format";
import { alternarFavoritoAction } from "@/app/grupos/[grupoId]/edicoes/[edicaoId]/favoritos-actions";

export type ShowProgramacao = {
  id: string;
  artista: string;
  palco: string;
  horarioInicio: string;
  horarioFim: string | null;
  diaId: string;
  dia: Date;
  favoritado: boolean;
  amigos: string[];
};

export function Programacao({
  grupoId,
  edicaoId,
  shows,
}: {
  grupoId: string;
  edicaoId: string;
  shows: ShowProgramacao[];
}) {
  if (shows.length === 0) {
    return (
      <p className="rounded-xl border border-rtm-border bg-rtm-surface p-4 text-sm text-rtm-muted">
        Nenhum show na programação ainda. {" "}
        {"A programação ainda não foi publicada pelo admin."}
      </p>
    );
  }

  const porDia = new Map<string, ShowProgramacao[]>();
  for (const show of shows) {
    const lista = porDia.get(show.diaId) ?? [];
    lista.push(show);
    porDia.set(show.diaId, lista);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...porDia.entries()].map(([diaId, doDia]) => (
        <section key={diaId}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-rtm-muted">{formatDia(doDia[0].dia)}</h2>
          <ul className="flex flex-col gap-2">
            {doDia.map((show) => (
              <li
                key={show.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-rtm-border bg-rtm-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{show.artista}</p>
                  <p className="truncate text-sm text-rtm-muted">
                    {show.palco} · {show.horarioInicio}
                    {show.horarioFim ? `–${show.horarioFim}` : ""}
                  </p>
                  {show.amigos.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-rtm-accent2">
                      {show.amigos.length === 1 ? `${show.amigos[0]} vai` : `${show.amigos.length} amigos vão`}
                    </p>
                  )}
                </div>
                <form action={alternarFavoritoAction}>
                  <input type="hidden" name="grupoId" value={grupoId} />
                  <input type="hidden" name="showId" value={show.id} />
                  <input type="hidden" name="edicaoId" value={edicaoId} />
                  <button
                    type="submit"
                    aria-pressed={show.favoritado}
                    className={
                      "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition " +
                      (show.favoritado
                        ? "bg-rtm-accent text-white"
                        : "border border-rtm-border text-rtm-muted hover:border-rtm-accent")
                    }
                  >
                    {show.favoritado ? "♥ Favoritado" : "♡ Favoritar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
