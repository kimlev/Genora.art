"use client";

import { DEFAULT_PUBLIC_EMAIL } from "@/lib/public-contact";
import { useEffect, useState } from "react";

export function usePublicContactEmail(): string {
  const [email, setEmail] = useState(DEFAULT_PUBLIC_EMAIL);

  useEffect(() => {
    let active = true;
    void fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { contactEmail?: unknown } | null) => {
        const next = typeof data?.contactEmail === "string" ? data.contactEmail.trim() : "";
        if (active && next.includes("@")) setEmail(next);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return email;
}
