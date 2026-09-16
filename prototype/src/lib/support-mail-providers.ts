export const SUPPORT_MAIL_PROVIDERS = [
  {
    id: "privateemail",
    label: "Private Email",
    host: "mail.privateemail.com",
    port: 993,
    secure: true,
  },
] as const;

export type SupportMailProviderId = (typeof SUPPORT_MAIL_PROVIDERS)[number]["id"];

export function supportMailProvider(id: string) {
  return SUPPORT_MAIL_PROVIDERS.find((item) => item.id === id) ?? null;
}
