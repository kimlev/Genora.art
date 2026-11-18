import { ImageStudio } from "@/components/images/image-studio";
import { requestPageMetadata } from "@/lib/i18n/request-locale";
import { CREATE_FOTO_VIDEO_PATH } from "@/lib/routes";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata({ params }: PageProps<"/[locale]/create-foto-video">): Promise<Metadata> {
  return requestPageMetadata(CREATE_FOTO_VIDEO_PATH, (await params).locale);
}

export default function CreateFotoVideoPage() {
  return (
    <Suspense>
      <ImageStudio />
    </Suspense>
  );
}
