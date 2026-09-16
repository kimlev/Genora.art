/**
 * Интегратор иногда добавляет к названию модели русскую пометку через « · »
 * («Gemini 3.6 Flash · актуальная»). Название показывается на всех языках,
 * поэтому оставляем только саму модель.
 */
export function modelDisplayName(label: string): string {
  const [name] = label.split(" \u00b7 ");
  return name.trim() || label.trim();
}
