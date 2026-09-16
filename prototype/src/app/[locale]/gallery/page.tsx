import { GalleryPageContent } from "@/components/gallery/gallery-page-content";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/gallery");
}

export default function GalleryPage() {
  return (
    <main className="flex h-[calc(100dvh-60px)] min-h-0 flex-col overflow-hidden">
      <GalleryPageContent />
    </main>
  );
}
