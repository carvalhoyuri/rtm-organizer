import "server-only";
import { z } from "zod";
import { lerPdf } from "./pdf";

export const ShowExtraidoSchema = z.object({
  artista: z.string().min(1),
  palco: z.string().min(1),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "esperado YYYY-MM-DD"),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, "esperado HH:mm"),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});
export type ShowExtraido = z.infer<typeof ShowExtraidoSchema>;

/** Erro esperado (PDF sem texto reconhecível no formato esperado) — a mensagem já é adequada pra mostrar ao admin. */
export class ExtracaoInvalidaError extends Error {}

// Formato esperado, linha a linha (repetido por seção):
//   Palco: <nome>
//   <dia, ex: 30/10 ou 30/10/2026>
//   <HH:mm>[-<HH:mm>] <nome do artista>
const PALCO_RE = /^(?:palco|stage)\s*[:\-]\s*(.+)$/i;
const DATA_RE = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
const HORA_RE = /(\d{1,2}):(\d{2})/g;
const CONECTORES_RE = /^(?:\s|-|–|—|:|às|as|to)+|(?:\s|-|–|—|:|às|as|to)+$/gi;

function normalizaHorario(h: string): string {
  const [hh, mm] = h.split(":");
  return `${hh.padStart(2, "0")}:${mm}`;
}

function paraIso(dia: number, mes: number, anoTexto: string | undefined, anoReferencia: number): string {
  const ano = anoTexto ? (anoTexto.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto)) : anoReferencia;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export type ResultadoExtracaoTexto = {
  shows: ShowExtraido[];
  linhasIgnoradas: string[];
};

/**
 * Extração determinística, sem chamar nenhuma API — depende de o PDF ter
 * texto selecionável já no formato esperado (ver comentário acima). Não lida
 * com PDF escaneado nem layouts fora desse padrão; a garantia de que o PDF
 * subido segue o formato estruturado é responsabilidade do admin.
 *
 * Linha com horário mas sem Palco/Dia já definidos antes dela é ignorada e
 * reportada em vez de adivinhada — silenciosamente inventar contexto seria
 * pior que deixar de fora.
 */
export async function extrairProgramacaoPorTexto(pdfBuffer: Buffer, anoReferencia: number): Promise<ResultadoExtracaoTexto> {
  const { texto } = await lerPdf(pdfBuffer);

  const linhas: string[] = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let palcoAtual: string | null = null;
  let diaAtual: string | null = null;
  const shows: ShowExtraido[] = [];
  const linhasIgnoradas: string[] = [];

  for (const linha of linhas) {
    const palcoMatch = linha.match(PALCO_RE);
    if (palcoMatch) {
      palcoAtual = palcoMatch[1].trim();
      continue;
    }

    const horarios = [...linha.matchAll(HORA_RE)];

    if (horarios.length === 0) {
      const dataMatch = linha.match(DATA_RE);
      if (dataMatch) {
        diaAtual = paraIso(Number(dataMatch[1]), Number(dataMatch[2]), dataMatch[3], anoReferencia);
      }
      continue;
    }

    if (!palcoAtual || !diaAtual) {
      linhasIgnoradas.push(linha);
      continue;
    }

    const horarioInicio = normalizaHorario(horarios[0][0]);
    const horarioFim = horarios[1] ? normalizaHorario(horarios[1][0]) : undefined;

    let artista = linha;
    for (const h of horarios) {
      artista = artista.replace(h[0], " ");
    }
    artista = artista.replace(CONECTORES_RE, "").trim();

    const parsed = artista
      ? ShowExtraidoSchema.safeParse({ artista, palco: palcoAtual, dia: diaAtual, horarioInicio, horarioFim })
      : null;

    if (parsed?.success) {
      shows.push(parsed.data);
    } else {
      linhasIgnoradas.push(linha);
    }
  }

  if (shows.length === 0) {
    throw new ExtracaoInvalidaError(
      'Não reconheci nenhum show nesse PDF. O parser espera linhas "Palco: <nome>", depois uma linha ' +
        'de data (ex: 30/10), depois linhas "HH:mm - HH:mm Artista". Confere se o PDF segue esse formato.'
    );
  }

  return { shows, linhasIgnoradas };
}
