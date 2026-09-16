import { LegalNav } from "@/components/legal/legal-nav";
import { SiteFooter } from "@/components/layout/site-footer";

export default function LegalLayout({ children }: LayoutProps<"/[locale]/legal">) {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
          <div className="grid gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <aside className="min-w-0 lg:sticky lg:top-[76px] lg:self-start">
              <LegalNav />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
