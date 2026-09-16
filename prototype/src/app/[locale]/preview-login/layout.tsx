import { noIndexMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Preview — Genora.art",
  ...noIndexMetadata,
};

export default function PreviewLoginLayout({ children }: { children: ReactNode }) {
  return children;
}
