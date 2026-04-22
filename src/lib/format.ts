/**
 * Formats a number as currency with the given symbol.
 * Defaults to BR locale formatting.
 */
export function formatCurrency(
  value: number,
  symbol: string = "R$",
  options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${symbol} ${safe.toLocaleString("pt-BR", options)}`;
}