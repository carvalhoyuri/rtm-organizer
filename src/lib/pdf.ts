import "server-only";
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfLido = {
  numPaginas: number;
  /** Uma linha por posição vertical detectada na página (heurística: agrupa itens de texto com Y parecido). */
  texto: string;
};

/**
 * Lê um PDF com texto selecionável usando pdfjs-dist (não faz OCR — PDF
 * escaneado/imagem não tem texto pra extrair aqui; use a extração via IA
 * pra esses casos, ver src/lib/extraction.ts).
 */
export async function lerPdf(buffer: Buffer): Promise<PdfLido> {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    verbosity: VerbosityLevel.ERRORS,
  }).promise;

  const linhas: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    let linhaAtual = "";
    let ultimoY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (ultimoY !== null && Math.abs(y - ultimoY) > 2) {
        if (linhaAtual.trim()) linhas.push(linhaAtual.trim());
        linhaAtual = "";
      }
      linhaAtual += item.str + " ";
      ultimoY = y;
    }
    if (linhaAtual.trim()) linhas.push(linhaAtual.trim());
  }

  return { numPaginas: doc.numPages, texto: linhas.join("\n") };
}
