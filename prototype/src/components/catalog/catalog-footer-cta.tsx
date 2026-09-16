"use client";

import { openAgentBuilder } from "@/components/agents/agent-builder-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/locale-link";
import { catalogPagesCopy } from "@/lib/i18n/copy/catalog-pages";
import { CREATE_FOTO_VIDEO_PATH } from "@/lib/routes";

type CatalogFooterCtaProps = {
  section: "models" | "agents" | "images";
};

export function CatalogFooterCta({ section }: CatalogFooterCtaProps) {
  const { locale } = useLocale();
  const copy = catalogPagesCopy(locale);
  const { user } = useAuth();
  const label = section === "models" ? copy.createChat : section === "agents" ? copy.createAgent : copy.createImage;
  const href = user ? (section === "images" ? CREATE_FOTO_VIDEO_PATH : "/chat") : "/register";

  return (
    <div className="flex justify-center px-5 py-12 sm:px-8">
      {section === "agents" && user ? (
        <Button
          type="button"
          size="lg"
          className="h-12 rounded-xl bg-[#FF6F00] px-7 font-semibold text-white hover:bg-[#3b8ef0]"
          onClick={() => openAgentBuilder()}
        >
          {label}
        </Button>
      ) : (
        <Button
          nativeButton={false}
          size="lg"
          className="h-12 rounded-xl bg-[#FF6F00] px-7 font-semibold text-white hover:bg-[#3b8ef0]"
          render={<Link href={href} />}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
