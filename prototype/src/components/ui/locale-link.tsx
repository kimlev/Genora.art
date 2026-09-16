"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { localizeHref } from "@/lib/i18n/locale-path";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink>;

/** Ссылка внутри приложения: языковой префикс подставляется автоматически */
export function Link({ href, ...props }: LinkProps) {
  const { locale } = useLocale();
  return <NextLink href={typeof href === "string" ? localizeHref(href, locale) : href} {...props} />;
}
