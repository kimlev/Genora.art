import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.BLOGORO_REVALIDATE_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidateTag("blogoro-posts", "max");
  revalidatePath("/blog", "layout");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ revalidated: true });
}
