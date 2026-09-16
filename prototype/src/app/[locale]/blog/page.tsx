import { BlogPageContent } from "@/components/blog/blog-page-content";
import { SiteFooter } from "@/components/layout/site-footer";
import { getBlogPosts } from "@/lib/blog/posts-query";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return requestPageMetadata("/blog");
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <><main className="flex-1"><BlogPageContent posts={posts} /></main><SiteFooter /></>;
}
