import "server-only";

import { getPublishedPost, listPublishedPosts } from "@/lib/blog/published";
import { type BlogPost } from "@/lib/blog/posts";

export async function getBlogPosts(): Promise<BlogPost[]> {
  const published = await listPublishedPosts();
  const live: BlogPost[] = [...published];

  const endpoint = process.env.BLOGORO_API_URL?.trim();
  if (endpoint) {
    try {
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/v1/publications/genora`, {
        next: { revalidate: 300, tags: ["blogoro-posts"] },
      });
      if (response.ok) {
        const payload = (await response.json()) as { items?: BlogPost[] };
        const bySlug = new Map(live.map((post) => [post.slug, post]));
        for (const post of payload.items ?? []) bySlug.set(post.slug, post);
        live.splice(0, live.length, ...bySlug.values());
      }
    } catch {
      /* если Blogoro недоступен, оставляем уже принятые статьи */
    }
  }

  const posts = live;
  return [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getPublishedPost(slug)) ?? (await getBlogPosts()).find((post) => post.slug === slug);
}
