import type { Locale } from "@/lib/i18n/types";

export type GalleryUiCopy = {
  viewPrompt: string;
  promptTitle: string;
  closePreview: string;
  play: string;
  close: string;
};

const copies: Record<Locale, GalleryUiCopy> = {
  ru: { viewPrompt: "Показать промт", promptTitle: "Промт", closePreview: "Закрыть", play: "Слушать", close: "Закрыть" },
  en: { viewPrompt: "Show prompt", promptTitle: "Prompt", closePreview: "Close", play: "Play", close: "Close" },
  zh: { viewPrompt: "查看提示词", promptTitle: "提示词", closePreview: "关闭", play: "播放", close: "关闭" },
  hi: { viewPrompt: "प्रॉम्प्ट दिखाएँ", promptTitle: "प्रॉम्प्ट", closePreview: "बंद करें", play: "चलाएँ", close: "बंद करें" },
  es: { viewPrompt: "Ver prompt", promptTitle: "Prompt", closePreview: "Cerrar", play: "Reproducir", close: "Cerrar" },
  fr: { viewPrompt: "Voir le prompt", promptTitle: "Prompt", closePreview: "Fermer", play: "Écouter", close: "Fermer" },
  ar: { viewPrompt: "عرض التوجيه", promptTitle: "التوجيه", closePreview: "إغلاق", play: "تشغيل", close: "إغلاق" },
  pt: { viewPrompt: "Ver prompt", promptTitle: "Prompt", closePreview: "Fechar", play: "Reproduzir", close: "Fechar" },
  de: { viewPrompt: "Prompt anzeigen", promptTitle: "Prompt", closePreview: "Schließen", play: "Abspielen", close: "Schließen" },
  ja: { viewPrompt: "プロンプトを見る", promptTitle: "プロンプト", closePreview: "閉じる", play: "再生", close: "閉じる" },
  it: { viewPrompt: "Mostra prompt", promptTitle: "Prompt", closePreview: "Chiudi", play: "Ascolta", close: "Chiudi" },
  ko: { viewPrompt: "프롬프트 보기", promptTitle: "프롬프트", closePreview: "닫기", play: "재생", close: "닫기" },
  tr: { viewPrompt: "İstemı göster", promptTitle: "İstem", closePreview: "Kapat", play: "Çal", close: "Kapat" },
  pl: { viewPrompt: "Pokaż prompt", promptTitle: "Prompt", closePreview: "Zamknij", play: "Odtwórz", close: "Zamknij" },
  nl: { viewPrompt: "Prompt tonen", promptTitle: "Prompt", closePreview: "Sluiten", play: "Afspelen", close: "Sluiten" },
  sv: { viewPrompt: "Visa prompt", promptTitle: "Prompt", closePreview: "Stäng", play: "Spela", close: "Stäng" },
  cs: { viewPrompt: "Zobrazit prompt", promptTitle: "Prompt", closePreview: "Zavřít", play: "Přehrát", close: "Zavřít" },
  el: { viewPrompt: "Εμφάνιση prompt", promptTitle: "Prompt", closePreview: "Κλείσιμο", play: "Αναπαραγωγή", close: "Κλείσιμο" },
  ro: { viewPrompt: "Arată promptul", promptTitle: "Prompt", closePreview: "Închide", play: "Redă", close: "Închide" },
};

export function galleryUiCopy(locale: Locale): GalleryUiCopy {
  return copies[locale] ?? copies.en;
}
