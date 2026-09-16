import { BlogPreviewContent } from "@/components/landing/blog-preview-content";
import { getBlogPosts } from "@/lib/blog/posts-query";

export async function BlogPreviewSection() {
  return <BlogPreviewContent posts={await getBlogPosts()} />;
}
