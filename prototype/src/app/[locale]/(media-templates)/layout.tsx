import { StudioGalleryPage } from "@/components/catalog/studio-gallery-page";
import { SiteFooter } from "@/components/layout/site-footer";
import { Suspense, type ReactNode } from "react";

export default function MediaTemplatesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex-1">
        <Suspense>
          <StudioGalleryPage defaultTab="photo" />
        </Suspense>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
