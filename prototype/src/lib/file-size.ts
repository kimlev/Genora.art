export function formatFileBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1_000_000) {
    const mb = bytes / 1_000_000;
    const value = mb >= 10 ? mb.toFixed(0) : mb.toFixed(1).replace(".", ",");
    return `${value} МБ`;
  }
  if (bytes >= 1_000) return `${Math.max(1, Math.round(bytes / 1_000))} КБ`;
  return `${bytes} Б`;
}

export async function remoteFileSizeLabel(url: string): Promise<string> {
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (head?.ok) {
    const length = Number(head.headers.get("content-length"));
    if (Number.isFinite(length) && length > 0) return formatFileBytes(length);
  }
  const response = await fetch(url);
  if (!response.ok) return "";
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > 0) return formatFileBytes(length);
  const blob = await response.blob();
  return formatFileBytes(blob.size);
}
