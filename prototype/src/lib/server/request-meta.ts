import "server-only";

import { isIP } from "node:net";

export type RequestMeta = {
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
};

export function requestMeta(request: Request): RequestMeta {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = request.headers.get("x-real-ip")?.trim();
  const ipAddress = forwarded || direct || null;
  const country = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
  return {
    ipAddress: ipAddress && isIP(ipAddress) ? ipAddress : null,
    countryCode: country && /^[A-Z]{2}$/.test(country) ? country : null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
  };
}
