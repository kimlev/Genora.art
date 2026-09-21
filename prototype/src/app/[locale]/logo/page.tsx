import Image from "next/image";
import { SiteFooter } from "@/components/layout/site-footer";
import { logoPageCopy } from "@/lib/i18n/copy/logo-page";
import { requestLocale, requestPageMetadata } from "@/lib/i18n/request-locale";
import { publicSiteUrl } from "@/lib/site-env";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/logo");
}

export default async function LogoPage() {
  const locale = await requestLocale();
  const copy = logoPageCopy(locale);

  return (
    <>
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-brand">{copy.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text sm:text-6xl">{copy.title}</h1>
            <p className="mt-6 text-lg leading-relaxed text-steel">{copy.description}</p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <div className="flex min-h-40 items-center justify-center rounded-2xl bg-[#f5f7fb] p-8">
                <Image src="/brand/genora-logo-light.svg" width={340} height={80} priority alt={copy.lightLabel} className="h-auto w-full max-w-[340px]" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-text">{copy.lightLabel}</h2>
            </article>
            <article className="rounded-3xl border border-[#2d3138] bg-[#111111] p-6 shadow-sm sm:p-8">
              <div className="flex min-h-40 items-center justify-center rounded-2xl bg-[#1b1b1b] p-8">
                <Image src="/brand/genora-logo-dark.svg" width={340} height={80} alt={copy.darkLabel} className="h-auto w-full max-w-[340px]" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">{copy.darkLabel}</h2>
            </article>
          </div>

          <figure className="mt-5 rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex min-h-36 items-center justify-center rounded-2xl bg-mist p-8">
              <Image src="/favicon/genora-icon.png" width={160} height={160} alt={copy.markLabel} className="size-32 object-contain" />
            </div>
            <figcaption className="mt-5 text-lg font-semibold text-text">{copy.markLabel}</figcaption>
          </figure>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ImageObject",
                name: copy.title,
                description: copy.description,
                contentUrl: publicSiteUrl("/brand/genora-logo-light.svg"),
                representativeOfPage: true,
              }),
            }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
