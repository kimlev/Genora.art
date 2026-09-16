import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { noIndexMetadata, SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return { title: `${t.workspace.menuChats} — ${SITE_NAME}`, ...noIndexMetadata };
}

export default function ChatLayout({ children }: LayoutProps<"/[locale]/chat">) {
  return (
    <div className="flex h-[calc(100dvh-60px)] flex-col overflow-hidden bg-bg">
      {children}
    </div>
  );
}
