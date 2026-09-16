import { localeOptions } from "@/lib/i18n";
import { isRequestLocale } from "@/lib/locale-from-request";
import { notFound } from "next/navigation";

/**
 * Язык — часть адреса, поэтому все страницы сайта живут внутри этого сегмента.
 * Так переходы внутри приложения не требуют редиректов, а неизвестный язык даёт 404.
 */
export async function generateStaticParams() {
  return localeOptions.map((option) => ({ locale: option.code }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isRequestLocale(locale)) notFound();
  return children;
}
