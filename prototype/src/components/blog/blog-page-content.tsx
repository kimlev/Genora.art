"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { getLocaleOption, isLocale, localeOptions } from "@/lib/i18n";
import { withLocalePath } from "@/lib/i18n/locale-path";
import type { BlogPost } from "@/lib/blog/posts";
import { CalendarDays } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/ui/locale-link";
import { SelectMenu } from "@/components/ui/select-menu";
import { useMemo, useState } from "react";

const ALL = "all";

export function BlogPageContent({ posts }: { posts: BlogPost[] }) {
  const { locale, dictionary: t } = useLocale();
  const [languageChoice, setLanguageChoice] = useState<string | null>(null);
  const [topicChoice, setTopicChoice] = useState<string>(ALL);

  /** Языки, на которых действительно есть статьи, в порядке языкового переключателя сайта */
  const availableLanguages = useMemo(() => {
    const present = new Set(posts.filter((post) => isLocale(post.language)).map((post) => post.language));
    return localeOptions.filter((option) => present.has(option.code)).map((option) => option.code);
  }, [posts]);

  const language = resolveChoice(
    languageChoice,
    availableLanguages,
    availableLanguages.includes(locale) ? locale : ALL,
  );

  const languagePosts = useMemo(
    () => (language === ALL ? posts : posts.filter((post) => post.language === language)),
    [language, posts],
  );

  /** Сортировка по коду символов, а не по локали: результат должен совпадать на сервере и в браузере */
  const topics = useMemo(
    () => [...new Set(languagePosts.map((post) => post.topic).filter(Boolean))].sort(),
    [languagePosts],
  );
  const topic = resolveChoice(topicChoice, topics, ALL);

  // Фильтр по тегам не выводим: на каждом языке у статей свои теги, и список разрастается до сотен значений
  const visible = useMemo(
    () => (topic === ALL ? languagePosts : languagePosts.filter((post) => post.topic === topic)),
    [languagePosts, topic],
  );

  const dateFormat = new Intl.DateTimeFormat(getLocaleOption(locale).intl, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6F00]">{t.blogPreview.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text sm:text-5xl">{t.blogPreview.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{t.blogPreview.allPosts}</p>
      </header>

      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:max-w-2xl sm:grid-cols-2">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-steel">{t.blogPreview.filterLanguage}</span>
          <SelectMenu
            ariaLabel={t.blogPreview.filterLanguage}
            value={language}
            options={[
              { value: ALL, label: t.blogPreview.allLanguages },
              ...availableLanguages.map((code) => {
                const option = getLocaleOption(code);
                return { value: code, label: `${option.flag} ${option.label}` };
              }),
            ]}
            onChange={(next) => {
              setLanguageChoice(next);
              setTopicChoice(ALL);
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-steel">{t.blogPreview.filterTopic}</span>
          <SelectMenu
            ariaLabel={t.blogPreview.filterTopic}
            value={topic}
            options={[{ value: ALL, label: t.blogPreview.allTopics }, ...topics.map((item) => ({ value: item, label: item }))]}
            onChange={setTopicChoice}
          />
        </div>
      </div>

      {visible.length ? (
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((post, index) => {
            const postLocale = isLocale(post.language) ? post.language : null;
            const postLanguage = postLocale ? getLocaleOption(postLocale) : null;
            return (
              <article
                key={post.slug}
                lang={postLanguage?.code ?? post.language}
                className="group h-full overflow-hidden rounded-[22px] border border-border bg-surface"
              >
                <Link href={withLocalePath(`/blog/${post.slug}`, locale)} className="flex h-full flex-col">
                  <Image src={post.image} alt="" width={720} height={420} priority={index === 0} className="aspect-[12/7] w-full object-cover" />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-2 text-xs text-steel">
                      <CalendarDays className="size-3.5" />
                      <time dateTime={post.publishedAt}>{dateFormat.format(new Date(`${post.publishedAt}T12:00:00Z`))}</time>
                      {postLanguage ? (
                        <span
                          title={`${t.blogPreview.articleLanguage}: ${postLanguage.label}`}
                          className="ms-auto rounded-full bg-mist px-2 py-0.5 text-[11px] leading-5 text-steel"
                        >
                          {postLanguage.flag} {postLanguage.short}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#FF6F00]">{post.topic} · {post.readingMinutes} {t.blogPreview.minutes}</p>
                    <h2 className="mt-2 line-clamp-2 min-h-14 text-xl font-semibold leading-snug text-text transition-colors group-hover:text-[#FF6F00]">{post.title}</h2>
                    <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-steel">{post.excerpt}</p>
                    <div className="mt-4 h-14 overflow-hidden">
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((item) => <span key={item} className="max-w-full truncate rounded-full bg-mist px-2 py-0.5 text-[11px] leading-5 text-steel">{item}</span>)}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-steel">
          {t.blogPreview.emptyState}
        </p>
      )}
    </div>
  );
}

/** Держит выбор пользователя, пока он существует среди доступных значений */
function resolveChoice<T extends string>(choice: string | null, available: readonly T[], fallback: T | typeof ALL): T | typeof ALL {
  if (choice === ALL) return ALL;
  if (choice && (available as readonly string[]).includes(choice)) return choice as T;
  return fallback;
}
