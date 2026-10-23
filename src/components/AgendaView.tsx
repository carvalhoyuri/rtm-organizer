import { formatDia } from "@/lib/format";
import type { Agenda } from "@/lib/agenda";
import { confirmarFavoritoAction, removerFavoritoAction } from "@/app/grupos/[grupoId]/edicoes/[edicaoId]/favoritos-actions";

const ROTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  CONFIRMADO: { texto: "", classe: "" },
  ALTERADO: { texto: "Horário mudou", classe: "bg-rtm-warn/20 text-rtm-warn" },
  CANCELADO: { texto: "Cancelado", classe: "bg-rtm-muted/20 text-rtm-muted" },
};

export function AgendaView({ grupoId, edicaoId, agenda }: { grupoId: string; edicaoId: string; agenda: Agenda }) {
  if (agenda.itens.length === 0) {
    return (
      <p className="rounded-xl border border-rtm-border bg-rtm-surface p-4 text-sm text-rtm-muted">
        Sua Agenda tá vazia. Vai na aba Programação e favorita os shows que você quer ver.
      </p>
    );
  }

  const porDia = new Map<string, typeof agenda.itens>();
  for (const item of agenda.itens) {
    const lista = porDia.get(item.diaId) ?? [];
    lista.push(item);
    porDia.set(item.diaId, lista);
  }

  const avisosPorDia = new Map<string, typeof agenda.avisosLivres>();
  for (const aviso of agenda.avisosLivres) {
    const lista = avisosPorDia.get(aviso.diaId) ?? [];
    lista.push(aviso);
    avisosPorDia.set(aviso.diaId, lista);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...porDia.entries()].map(([diaId, itens]) => {
        const avisos = avisosPorDia.get(diaId) ?? [];
        return (
          <section key={diaId}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-rtm-muted">{formatDia(itens[0].dia)}</h2>
            <ul className="flex flex-col gap-2">
              {itens.map((item) => {
                const avisoAntes = avisos.find((a) => a.ate === item.horarioInicio);
                const status = ROTULO_STATUS[item.statusFavorito];
                const cancelado = item.statusFavorito === "CANCELADO";
                return (
                  <li key={item.favoritoId} className="contents">
                    {avisoAntes && (
                      <div className="rounded-xl border border-dashed border-rtm-accent2/40 bg-rtm-accent2/5 p-3 text-sm text-rtm-accent2">
                        Você tá livre das {avisoAntes.de} às {avisoAntes.ate} — que tal dar uma volta e explorar o festival?
                      </div>
                    )}
                    <div
                      className={
                        "flex items-center justify-between gap-3 rounded-xl border p-3 " +
                        (cancelado ? "border-rtm-border/50 bg-rtm-surface/50" : "border-rtm-border bg-rtm-surface")
                      }
                    >
                      <div className="min-w-0">
                        <p className={"truncate font-medium " + (cancelado ? "text-rtm-muted line-through" : "")}>
                          {item.artista}
                        </p>
                        <p className="truncate text-sm text-rtm-muted">
                          {item.palco} · {item.horarioInicio}–{item.horarioFim}
                        </p>
                        {item.amigosNoShow.length > 0 && !cancelado && (
                          <p className="mt-0.5 truncate text-xs text-rtm-accent2">{item.amigosNoShow.join(", ")}</p>
                        )}
                        {item.conflitaCom.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-rtm-accent">
                            ⚠ Conflita com {item.conflitaCom.join(", ")}
                          </p>
                        )}
                        {status.texto && (
                          <span className={"mt-1 inline-block rounded px-1.5 py-0.5 text-xs " + status.classe}>{status.texto}</span>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {item.statusFavorito === "ALTERADO" && (
                          <form action={confirmarFavoritoAction}>
                            <input type="hidden" name="grupoId" value={grupoId} />
                            <input type="hidden" name="favoritoId" value={item.favoritoId} />
                            <input type="hidden" name="edicaoId" value={edicaoId} />
                            <button type="submit" className="rounded-full bg-rtm-warn px-3 py-1.5 text-xs font-medium text-black">
                              Confirmar
                            </button>
                          </form>
                        )}
                        <form action={removerFavoritoAction}>
                          <input type="hidden" name="grupoId" value={grupoId} />
                          <input type="hidden" name="favoritoId" value={item.favoritoId} />
                          <input type="hidden" name="edicaoId" value={edicaoId} />
                          <button type="submit" className="text-xs text-rtm-muted underline-offset-2 hover:text-rtm-text hover:underline">
                            remover
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
