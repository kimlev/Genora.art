import { AboutPageContent } from "@/components/about/about-page-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/about");
}

export default function AboutPage() {
  return (
    <>
      <main className="flex-1">
        <AboutPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
