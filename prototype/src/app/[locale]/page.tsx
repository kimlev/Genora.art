import { LandingPage } from "@/components/landing/landing-page";
import { SiteFooter } from "@/components/layout/site-footer";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  return requestPageMetadata("/", (await params).locale);
}

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <LandingPage />
      </main>
      <SiteFooter />
    </>
  );
}
