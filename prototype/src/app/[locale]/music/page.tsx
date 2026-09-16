import { MusicPageContent } from "@/components/music/music-page-content";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/music");
}

export default function MusicPage() {
  return <MusicPageContent />;
}
