const ADMIN_HOSTNAMES = new Set(["admin.genora.art", "dev.admin.genora.art"]);

export function requestHostname(...candidates: Array<string | null | undefined>): string {
  const value = candidates.find((candidate) => candidate?.trim()) ?? "";
  return value
    .split(",")[0]
    .trim()
    .replace(/:\d+$/, "")
    .toLowerCase();
}

export function isAdminHostname(hostname: string): boolean {
  return ADMIN_HOSTNAMES.has(requestHostname(hostname));
}
