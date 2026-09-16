"use client";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { getLocaleOption } from "@/lib/i18n";
import { selectHomepagePosts, type BlogPost } from "@/lib/blog/posts";
import { ArrowRight, CalendarDays } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/ui/locale-link";

export function BlogPreviewContent({ posts }: { posts: BlogPost[] }) {
  const t = useT();
  const { locale } = useLocale();
  const visible = selectHomepagePosts(posts, locale);
  const dateFormat = new Intl.DateTimeFormat(getLocaleOption(locale).intl, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section id="blog" className="scroll-mt-[60px] bg-bg pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">{t.blogPreview.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">{t.blogPreview.title}</h2>
          </div>
          <Button nativeButton={false} variant="outline" render={<Link href="/blog" />}>{t.blogPreview.allPosts} <ArrowRight className="size-4" /></Button>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {visible.map((post) => (
            <article key={post.slug} className="group overflow-hidden rounded-[22px] border border-border bg-surface">
              <Link href={`/blog/${post.slug}`} className="block">
                <Image src={post.image} alt="" width={720} height={420} className="aspect-[12/7] w-full object-cover" />
                <div className="p-5">
                  <p className="flex items-center gap-1.5 text-xs text-steel">
                    <CalendarDays className="size-3.5" />
                    <time dateTime={post.publishedAt}>{dateFormat.format(new Date(`${post.publishedAt}T12:00:00Z`))}</time>
                  </p>
                  <p className="mt-2 text-xs font-medium text-[#FF6F00]">{post.topic} · {post.readingMinutes} {t.blogPreview.minutes}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-snug text-text transition-colors group-hover:text-[#FF6F00]">{post.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-steel">{post.excerpt}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
