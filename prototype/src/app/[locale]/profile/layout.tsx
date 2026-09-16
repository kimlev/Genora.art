import { ProfileGuard } from "@/components/profile/profile-guard";
import { getDictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/i18n/request-locale";
import { noIndexMetadata, SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await requestLocale());
  return { title: `${t.profile.profileTitle} — ${SITE_NAME}`, ...noIndexMetadata };
}

export default function ProfileLayout({ children }: LayoutProps<"/[locale]/profile">) {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <ProfileGuard>{children}</ProfileGuard>
      </div>
    </main>
  );
}
