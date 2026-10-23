import { PDFDocument, StandardFonts } from "pdf-lib";

// Lines in the exact format src/lib/extraction-texto.ts expects: "Palco: <name>"
// (the parser's regex also accepts the "Stage:" keyword), then a date line,
// then "HH:mm - HH:mm Artist" lines.
const SCHEDULE_LINES = ["Stage: Main Stage", "30/10", "20:00 - 21:00 Band Alpha", "21:30 - 22:30 Band Beta"];

export const EXPECTED_SHOWS = [
  { artist: "Band Alpha", startTime: "20:00", endTime: "21:00" },
  { artist: "Band Beta", startTime: "21:30", endTime: "22:30" },
];

/** Generates a PDF with selectable text in the format the deterministic parser understands. */
export async function generateScheduleFixturePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let y = 260;
  for (const line of SCHEDULE_LINES) {
    page.drawText(line, { x: 40, y, size: 14, font });
    y -= 30;
  }

  return Buffer.from(await doc.save());
}
