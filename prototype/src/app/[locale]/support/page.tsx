import { SiteFooter } from "@/components/layout/site-footer";
import { SupportPageContent } from "@/components/support/support-page-content";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/support");
}

export default function SupportPage() {
  return (
    <>
      <main className="flex-1">
        <SupportPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
