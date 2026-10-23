/** Só aceita um path relativo interno como redirect target — evita open redirect via ?next=. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}
