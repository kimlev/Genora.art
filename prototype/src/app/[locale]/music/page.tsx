import { MusicPageContent } from "@/components/music/music-page-content";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/music">): Promise<Metadata> {
  return requestPageMetadata("/music", (await params).locale);
}

export default function MusicPage() {
  return <MusicPageContent />;
}
