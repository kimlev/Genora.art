/** Browser-safe invoice label; the complete ID remains available for copying. */
export function shortProviderInvoiceId(id: string): string {
  const trimmed = id.trim();
  return trimmed.split("-")[0] || trimmed.slice(0, 8);
}
