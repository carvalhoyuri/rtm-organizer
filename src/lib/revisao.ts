import "server-only";
import { db } from "./db";
import type { ShowExtraido } from "./extraction-texto";

export type ResumoRevisao = {
  revisaoId: string;
  showsCriados: number;
  showsAtualizados: number;
  showsCancelados: number;
};

/**
 * Aplica uma Revisão (novo upload de PDF já extraído) a uma Edição.
 * Casa Shows existentes por Artista + Palco + Dia (ver "Show" em CONTEXT.md):
 * - combinação não vista antes -> cria Show novo
 * - combinação já existente com horário diferente -> atualiza e marca os
 *   Favoritos ligados a ele como ALTERADO
 * - Show ATIVO que não apareceu nesta Revisão -> marca CANCELADO, e seus
 *   Favoritos também viram CANCELADO
 */
export async function aplicarRevisao(
  edicaoId: string,
  arquivoNome: string,
  showsExtraidos: ShowExtraido[]
): Promise<ResumoRevisao> {
  return db.$transaction(
    async (tx) => {
      const revisao = await tx.revisao.create({
        data: { edicaoId, arquivoNome },
      });

      const palcoCache = new Map<string, string>();
      const diaCache = new Map<string, string>();
      const showsVistos = new Set<string>();

      let criados = 0;
      let atualizados = 0;

      for (const item of showsExtraidos) {
        let palcoId = palcoCache.get(item.palco);
        if (!palcoId) {
          const palco = await tx.palco.upsert({
            where: { edicaoId_nome: { edicaoId, nome: item.palco } },
            create: { edicaoId, nome: item.palco },
            update: {},
          });
          palcoId = palco.id;
          palcoCache.set(item.palco, palcoId);
        }

        let diaId = diaCache.get(item.dia);
        if (!diaId) {
          const data = new Date(`${item.dia}T00:00:00.000Z`);
          const dia = await tx.dia.upsert({
            where: { edicaoId_data: { edicaoId, data } },
            create: { edicaoId, data },
            update: {},
          });
          diaId = dia.id;
          diaCache.set(item.dia, diaId);
        }

        const existente = await tx.show.findUnique({
          where: { artista_palcoId_diaId: { artista: item.artista, palcoId, diaId } },
        });

        if (!existente) {
          const show = await tx.show.create({
            data: {
              edicaoId,
              artista: item.artista,
              palcoId,
              diaId,
              horarioInicio: item.horarioInicio,
              horarioFim: item.horarioFim ?? null,
              status: "ATIVO",
              criadoNaRevisaoId: revisao.id,
              atualizadoNaRevisaoId: revisao.id,
            },
          });
          showsVistos.add(show.id);
          criados++;
          continue;
        }

        showsVistos.add(existente.id);

        const mudou =
          existente.horarioInicio !== item.horarioInicio ||
          (existente.horarioFim ?? null) !== (item.horarioFim ?? null) ||
          existente.status === "CANCELADO";

        if (mudou) {
          await tx.show.update({
            where: { id: existente.id },
            data: {
              horarioInicio: item.horarioInicio,
              horarioFim: item.horarioFim ?? null,
              status: "ATIVO",
              atualizadoNaRevisaoId: revisao.id,
            },
          });

          await tx.favorito.updateMany({
            where: { showId: existente.id, status: { in: ["CONFIRMADO", "ALTERADO"] } },
            data: { status: "ALTERADO" },
          });

          atualizados++;
        }
      }

      const showsAtivosAntes = await tx.show.findMany({
        where: { edicaoId, status: "ATIVO" },
        select: { id: true },
      });

      const idsParaCancelar = showsAtivosAntes.map((s) => s.id).filter((id) => !showsVistos.has(id));

      if (idsParaCancelar.length > 0) {
        await tx.show.updateMany({
          where: { id: { in: idsParaCancelar } },
          data: { status: "CANCELADO", atualizadoNaRevisaoId: revisao.id },
        });

        await tx.favorito.updateMany({
          where: { showId: { in: idsParaCancelar }, status: { in: ["CONFIRMADO", "ALTERADO"] } },
          data: { status: "CANCELADO" },
        });
      }

      return {
        revisaoId: revisao.id,
        showsCriados: criados,
        showsAtualizados: atualizados,
        showsCancelados: idsParaCancelar.length,
      };
    },
    { timeout: 60_000 }
  );
}
