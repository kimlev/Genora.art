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
    return {
      rules: [
        {
          // Blogoro's site analyzer identifies itself with this User-Agent.
          // Its exception is for public pages only; dev still sends noindex.
          userAgent: "ai-blog-analyzer",
          allow: "/",
          disallow: ["/admin", "/api/", "/blogoro/", ...PRIVATE_PATHS.flatMap((path) => [path, `${path}/`, `/*${path}`])],
        },
        { userAgent: "*", disallow: "/", allow: "/sitemap.xml" },
      ],
      sitemap: publicSiteUrl("/sitemap.xml"),
    };
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
