import type { Locale } from "@/lib/i18n/types";
import type { ImageAgentTag, StudioGalleryTab } from "@/lib/image-agent-gallery";

export type StudioGalleryCopy = {
  tab: Record<StudioGalleryTab, string>;
  tag: Record<ImageAgentTag, string>;
  close: string;
  emptyTag: string;
  videoSoon: string;
  useAgent: string;
};

const en: StudioGalleryCopy = {
  tab: { photo: "Photo", video: "Video" },
  tag: {
    all: "All",
    "photo-processing": "Photo processing",
    "face-retouch": "Face retouch",
    background: "Background",
    "photo-effects": "Photo effects",
    hair: "Hairstyle",
    clothes: "Clothes swap",
    locations: "Locations",
    "photo-poses": "Photo poses",
    design: "Design",
  },
  close: "Close",
  emptyTag: "Nothing in this tag yet.",
  videoSoon: "Video templates will appear here later.",
  useAgent: "Use",
};

const ru: StudioGalleryCopy = {
  tab: { photo: "Фото", video: "Видео" },
  tag: {
    all: "Все",
    "photo-processing": "Обработка фото",
    "face-retouch": "Ретушь лица",
    background: "Работа с фоном",
    "photo-effects": "Фотоэффекты",
    hair: "Прическа",
    clothes: "Замена одежды",
    locations: "Локации",
    "photo-poses": "Фото позы",
    design: "Дизайн",
  },
  close: "Закрыть",
  emptyTag: "В этом теге пока пусто.",
  videoSoon: "Шаблоны видео появятся здесь позже.",
  useAgent: "Использовать",
};

const copies: Partial<Record<Locale, StudioGalleryCopy>> = {
  en,
  ru,
  hi: {
    tab: { photo: "फ़ोटो", video: "वीडियो" },
    tag: { all: "सभी", "photo-processing": "फोटो प्रोसेसिंग", "face-retouch": "चेहरा रिटच", background: "बैकग्राउंड", "photo-effects": "फोटो इफेक्ट", hair: "हेयरस्टाइल", clothes: "कपड़े बदलें", locations: "लोकेशन", "photo-poses": "फोटो पोज़", design: "डिज़ाइन" },
    close: "बंद करें", emptyTag: "इस टैग में अभी कुछ नहीं है।", videoSoon: "वीडियो टेम्पलेट बाद में आएंगे।", useAgent: "इस्तेमाल करें",
  },
  es: {
    tab: { photo: "Foto", video: "Vídeo" },
    tag: { all: "Todos", "photo-processing": "Procesado de foto", "face-retouch": "Retoque facial", background: "Fondo", "photo-effects": "Efectos de foto", hair: "Peinado", clothes: "Cambio de ropa", locations: "Ubicaciones", "photo-poses": "Poses de foto", design: "Diseño" },
    close: "Cerrar", emptyTag: "Aún no hay nada en esta etiqueta.", videoSoon: "Las plantillas de vídeo aparecerán más tarde.", useAgent: "Usar",
  },
  fr: {
    tab: { photo: "Photo", video: "Vidéo" },
    tag: { all: "Tous", "photo-processing": "Traitement photo", "face-retouch": "Retouche visage", background: "Arrière-plan", "photo-effects": "Effets photo", hair: "Coiffure", clothes: "Changer les vêtements", locations: "Lieux", "photo-poses": "Poses photo", design: "Design" },
    close: "Fermer", emptyTag: "Rien dans ce tag pour le moment.", videoSoon: "Les modèles vidéo arriveront plus tard.", useAgent: "Utiliser",
  },
  ar: {
    tab: { photo: "صورة", video: "فيديو" },
    tag: { all: "الكل", "photo-processing": "معالجة الصورة", "face-retouch": "رتوش الوجه", background: "الخلفية", "photo-effects": "تأثيرات الصورة", hair: "تسريحة", clothes: "تبديل الملابس", locations: "المواقع", "photo-poses": "وضعيات الصور", design: "تصميم" },
    close: "إغلاق", emptyTag: "لا يوجد شيء في هذه العلامة بعد.", videoSoon: "ستظهر قوالب الفيديو لاحقًا.", useAgent: "استخدام",
  },
  pt: {
    tab: { photo: "Foto", video: "Vídeo" },
    tag: { all: "Todos", "photo-processing": "Processamento de foto", "face-retouch": "Retoque facial", background: "Fundo", "photo-effects": "Efeitos de foto", hair: "Penteado", clothes: "Trocar roupa", locations: "Locais", "photo-poses": "Poses de foto", design: "Design" },
    close: "Fechar", emptyTag: "Ainda não há nada nesta etiqueta.", videoSoon: "Os modelos de vídeo aparecem depois.", useAgent: "Usar",
  },
  de: {
    tab: { photo: "Foto", video: "Video" },
    tag: { all: "Alle", "photo-processing": "Fotobearbeitung", "face-retouch": "Gesichtsretusche", background: "Hintergrund", "photo-effects": "Fotoeffekte", hair: "Frisur", clothes: "Kleidung tauschen", locations: "Orte", "photo-poses": "Fotoposen", design: "Design" },
    close: "Schließen", emptyTag: "In diesem Tag ist noch nichts.", videoSoon: "Videovorlagen folgen später.", useAgent: "Nutzen",
  },
  it: {
    tab: { photo: "Foto", video: "Video" },
    tag: { all: "Tutti", "photo-processing": "Elaborazione foto", "face-retouch": "Ritocco viso", background: "Sfondo", "photo-effects": "Effetti foto", hair: "Acconciatura", clothes: "Cambio vestiti", locations: "Luoghi", "photo-poses": "Pose fotografiche", design: "Design" },
    close: "Chiudi", emptyTag: "Niente in questo tag per ora.", videoSoon: "I modelli video arriveranno dopo.", useAgent: "Usa",
  },
  tr: {
    tab: { photo: "Fotoğraf", video: "Video" },
    tag: { all: "Tümü", "photo-processing": "Fotoğraf işleme", "face-retouch": "Yüz rötuşu", background: "Arka plan", "photo-effects": "Fotoğraf efektleri", hair: "Saç stili", clothes: "Kıyafet değiştir", locations: "Konumlar", "photo-poses": "Fotoğraf pozları", design: "Tasarım" },
    close: "Kapat", emptyTag: "Bu etikette henüz bir şey yok.", videoSoon: "Video şablonları sonra gelecek.", useAgent: "Kullan",
  },
  pl: {
    tab: { photo: "Zdjęcie", video: "Wideo" },
    tag: { all: "Wszystkie", "photo-processing": "Obróbka zdjęcia", "face-retouch": "Retusz twarzy", background: "Tło", "photo-effects": "Efekty zdjęcia", hair: "Fryzura", clothes: "Zmiana ubrania", locations: "Lokacje", "photo-poses": "Pozy zdjęciowe", design: "Design" },
    close: "Zamknij", emptyTag: "W tym tagu na razie pusto.", videoSoon: "Szablony wideo pojawią się później.", useAgent: "Użyj",
  },
  sv: {
    tab: { photo: "Foto", video: "Video" },
    tag: { all: "Alla", "photo-processing": "Fotobearbetning", "face-retouch": "Ansiktsretusch", background: "Bakgrund", "photo-effects": "Fotoeffekter", hair: "Frisyr", clothes: "Byt kläder", locations: "Platser", "photo-poses": "Fotoposer", design: "Design" },
    close: "Stäng", emptyTag: "Inget i den här taggen än.", videoSoon: "Videomallar kommer senare.", useAgent: "Använd",
  },
  cs: {
    tab: { photo: "Foto", video: "Video" },
    tag: { all: "Vše", "photo-processing": "Úprava fotky", "face-retouch": "Retuš obličeje", background: "Pozadí", "photo-effects": "Fotoefekty", hair: "Účes", clothes: "Změna oblečení", locations: "Lokace", "photo-poses": "Foto pózy", design: "Design" },
    close: "Zavřít", emptyTag: "V tomto štítku zatím nic není.", videoSoon: "Video šablony se objeví později.", useAgent: "Použít",
  },
};

export function studioGalleryCopy(locale: string): StudioGalleryCopy {
  return copies[locale as Locale] ?? en;
}
