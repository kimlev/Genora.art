export const DEFAULT_PUBLIC_EMAIL = "support@genora.art";

export function applyPublicContactEmail(text: string, email: string): string {
  if (!email || email === DEFAULT_PUBLIC_EMAIL) return text;
  return text.replaceAll(DEFAULT_PUBLIC_EMAIL, email);
}
