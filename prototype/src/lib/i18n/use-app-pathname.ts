"use client";

import { splitLocalePath } from "@/lib/i18n/locale-path";
import { usePathname } from "next/navigation";

/**
 * Путь текущей страницы без языкового префикса.
 * Нужен для сравнения с маршрутами приложения: адрес может быть и `/chat`, и `/en/chat`.
 */
export function useAppPathname(): string {
  return splitLocalePath(usePathname()).path;
}
