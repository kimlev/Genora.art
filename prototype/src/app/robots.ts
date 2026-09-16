import { IS_STAGING, publicSiteUrl } from "@/lib/site-env";
import type { MetadataRoute } from "next";

/** Разделы, которые не должны попадать в поиск ни на одном языке */
const PRIVATE_PATHS = [
  "/battle",
  "/chat",
  "/forgot-password",
  "/login",
  "/preview-login",
  "/profile",
  "/register",
  "/reset-password",
  "/verify-email",
];

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/blogoro/publish",
        ...PRIVATE_PATHS.flatMap((path) => [path, `${path}/`, `/*${path}`]),
      ],
    },
    sitemap: publicSiteUrl("/sitemap.xml"),
  };
}
