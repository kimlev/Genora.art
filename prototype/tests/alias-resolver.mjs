import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = new URL("../src/", import.meta.url);
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Папку возвращать нельзя: Node не умеет импортировать каталог, поэтому проверяем именно файл */
function isFile(url) {
  try {
    return statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

function firstExisting(base) {
  for (const extension of EXTENSIONS) {
    const candidate = new URL(base.href + extension);
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Даёт `node --test` понимать импорты приложения: алиас `@/` и пути без расширения.
 * Нужно потому, что тесты запускают исходники напрямую, без сборщика Next.
 */
export function resolve(specifier, context, next) {
  if (specifier === "server-only") {
    return next(new URL("./server-only-stub.mjs", import.meta.url).href, context);
  }
  if (specifier.startsWith("@/")) {
    const resolved = firstExisting(new URL(specifier.slice(2), SOURCE_ROOT));
    if (resolved) return next(resolved.href, context);
  }

  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
    const resolved = firstExisting(new URL(specifier, context.parentURL));
    if (resolved) return next(resolved.href, context);
  }

  return next(specifier, context);
}
