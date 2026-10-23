import { uploadRevisaoAction } from "@/app/admin/actions";

export type RevisaoResumo = {
  id: string;
  arquivoNome: string;
  criadoEm: Date;
};

export function RevisoesPanel({
  edicaoId,
  revisoes,
  mensagem,
}: {
  edicaoId: string;
  revisoes: RevisaoResumo[];
  mensagem?: { tipo: "ok" | "erro"; texto: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      <form
        action={uploadRevisaoAction}
        encType="multipart/form-data"
        className="flex flex-col gap-3 rounded-xl border border-rtm-border bg-rtm-surface p-4"
      >
        <h2 className="text-sm font-semibold text-rtm-muted">Subir PDF da programação</h2>
        <input type="hidden" name="edicaoId" value={edicaoId} />

        <p className="text-xs text-rtm-muted">
          Exige texto selecionável no formato exato: linha &quot;Palco: nome&quot;, depois uma linha de data (ex:
          30/10), depois linhas &quot;HH:mm - HH:mm Artista&quot;. Não lê PDF escaneado. Linhas fora desse formato
          são ignoradas e reportadas, não adivinhadas.
        </p>

        <input
          type="file"
          name="arquivo"
          accept="application/pdf"
          required
          className="text-sm text-rtm-text file:mr-3 file:rounded-lg file:border-0 file:bg-rtm-accent2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <button type="submit" className="self-start rounded-lg bg-rtm-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Processar Revisão
        </button>
        <p className="text-xs text-rtm-muted">
          A Revisão casa shows por Artista + Palco + Dia com a programação já existente (sem revisão manual antes de publicar).
        </p>
      </form>

      {mensagem && (
        <p
          className={
            "rounded-lg px-3 py-2 text-sm " +
            (mensagem.tipo === "ok" ? "bg-rtm-accent2/10 text-rtm-accent2" : "bg-rtm-accent/10 text-rtm-accent")
          }
        >
          {mensagem.texto}
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-rtm-muted">Revisões</h2>
        {revisoes.length === 0 ? (
          <p className="text-sm text-rtm-muted">Nenhuma Revisão ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {revisoes.map((r) => (
              <li key={r.id} className="rounded-xl border border-rtm-border bg-rtm-surface p-3 text-sm">
                <p className="font-medium">{r.arquivoNome}</p>
                <p className="text-rtm-muted">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(r.criadoEm)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
