import type { Locale } from "@/lib/i18n";

export type SpendEnoughCopy = {
  title: string;
  note: string;
  textRequests: string;
  or: string;
  images: string;
  videos: string;
  songs: string;
};

const copies: Record<Locale, SpendEnoughCopy> = {
  ru: {
    title: "На что хватит",
    note: "Приблизительный расход токенов при пополнении выбранной суммы. Фактический расход будет зависеть от модели.",
    textRequests: "Текстовые запросы",
    or: "или",
    images: "Изображения",
    videos: "Видео (8 сек)",
    songs: "Песни",
  },
  en: {
    title: "What will this cover?",
    note: "Approximate token use after topping up the selected amount. Actual use depends on the model.",
    textRequests: "Text requests",
    or: "or",
    images: "Images",
    videos: "Videos (8 sec)",
    songs: "Songs",
  },
  zh: {
    title: "能做什么？",
    note: "按所选充值金额估算的代币消耗。实际消耗取决于模型。",
    textRequests: "文本请求",
    or: "或",
    images: "图像",
    videos: "视频（8 秒）",
    songs: "歌曲",
  },
  hi: {
    title: "इससे क्या होगा?",
    note: "चयनित राशि जमा करने पर टोकन का अनुमानित खर्च। वास्तविक खर्च मॉडल पर निर्भर करेगा।",
    textRequests: "टेक्स्ट अनुरोध",
    or: "या",
    images: "छवियाँ",
    videos: "वीडियो (8 सेकेंड)",
    songs: "गाने",
  },
  es: {
    title: "¿Para qué alcanza?",
    note: "Consumo aproximado de tokens al recargar el importe elegido. El consumo real dependerá del modelo.",
    textRequests: "Consultas de texto",
    or: "o",
    images: "Imágenes",
    videos: "Vídeo (8 s)",
    songs: "Canciones",
  },
  fr: {
    title: "À quoi cela suffit-il ?",
    note: "Consommation approximative de jetons pour le montant rechargé. La consommation réelle dépendra du modèle.",
    textRequests: "Requêtes texte",
    or: "ou",
    images: "Images",
    videos: "Vidéos (8 s)",
    songs: "Chansons",
  },
  ar: {
    title: "فيم يكفي هذا؟",
    note: "استهلاك تقريبي للرموز عند شحن المبلغ المحدد. الاستهلاك الفعلي يعتمد على النموذج.",
    textRequests: "طلبات نصية",
    or: "أو",
    images: "صور",
    videos: "فيديو (8 ثوانٍ)",
    songs: "أغانٍ",
  },
  pt: {
    title: "Para que isto chega?",
    note: "Consumo aproximado de tokens ao recarregar o valor escolhido. O consumo real dependerá do modelo.",
    textRequests: "Pedidos de texto",
    or: "ou",
    images: "Imagens",
    videos: "Vídeo (8 s)",
    songs: "Canções",
  },
  de: {
    title: "Wofür reicht das?",
    note: "Ungefährer Tokenverbrauch bei der gewählten Aufladung. Der tatsächliche Verbrauch hängt vom Modell ab.",
    textRequests: "Textanfragen",
    or: "oder",
    images: "Bilder",
    videos: "Videos (8 Sek.)",
    songs: "Lieder",
  },
  ja: {
    title: "何に使えますか？",
    note: "選択したチャージ額でのおおよそのトークン消費です。実際の消費はモデルによって変わります。",
    textRequests: "テキストリクエスト",
    or: "または",
    images: "画像",
    videos: "動画（8秒）",
    songs: "曲",
  },
  it: {
    title: "A cosa basta?",
    note: "Consumo approssimativo di token con l’importo ricaricato. Il consumo reale dipende dal modello.",
    textRequests: "Richieste di testo",
    or: "o",
    images: "Immagini",
    videos: "Video (8 sec)",
    songs: "Canzoni",
  },
  ko: {
    title: "무엇에 쓸 수 있나요?",
    note: "선택한 충전 금액 기준의 대략적인 토큰 사용량입니다. 실제 사용량은 모델에 따라 달라집니다.",
    textRequests: "텍스트 요청",
    or: "또는",
    images: "이미지",
    videos: "영상 (8초)",
    songs: "노래",
  },
  tr: {
    title: "Buna ne yeter?",
    note: "Seçilen yükleme tutarı için yaklaşık token tüketimi. Gerçek tüketim modele bağlıdır.",
    textRequests: "Metin istekleri",
    or: "veya",
    images: "Görseller",
    videos: "Video (8 sn)",
    songs: "Şarkılar",
  },
  pl: {
    title: "Na co to starczy?",
    note: "Przybliżone zużycie tokenów przy doładowaniu wybranej kwoty. Rzeczywiste zużycie zależy od modelu.",
    textRequests: "Zapytania tekstowe",
    or: "lub",
    images: "Obrazy",
    videos: "Wideo (8 s)",
    songs: "Piosenki",
  },
  nl: {
    title: "Waar is dit genoeg voor?",
    note: "Ongeveer tokenverbruik bij het opwaarderen van het gekozen bedrag. Het echte verbruik hangt af van het model.",
    textRequests: "Tekstverzoeken",
    or: "of",
    images: "Afbeeldingen",
    videos: "Video (8 sec)",
    songs: "Liedjes",
  },
  sv: {
    title: "Vad räcker detta till?",
    note: "Ungefärlig tokenförbrukning vid påfyllning av det valda beloppet. Verklig förbrukning beror på modellen.",
    textRequests: "Textförfrågningar",
    or: "eller",
    images: "Bilder",
    videos: "Video (8 sek)",
    songs: "Låtar",
  },
  cs: {
    title: "Na co to stačí?",
    note: "Přibližná spotřeba tokenů při dobití zvolené částky. Skutečná spotřeba závisí na modelu.",
    textRequests: "Textové požadavky",
    or: "nebo",
    images: "Obrázky",
    videos: "Video (8 s)",
    songs: "Písně",
  },
  el: {
    title: "Για τι αρκεί;",
    note: "Κατά προσέγγιση κατανάλωση token με την επιλεγμένη ανανέωση. Η πραγματική κατανάλωση εξαρτάται από το μοντέλο.",
    textRequests: "Αιτήματα κειμένου",
    or: "ή",
    images: "Εικόνες",
    videos: "Βίντεο (8 δευτ.)",
    songs: "Τραγούδια",
  },
  ro: {
    title: "La ce ajunge?",
    note: "Consum aproximativ de tokeni la alimentarea sumei alese. Consumul real depinde de model.",
    textRequests: "Cereri text",
    or: "sau",
    images: "Imagini",
    videos: "Video (8 sec)",
    songs: "Cântece",
  },
};

export function spendEnoughCopy(locale: Locale): SpendEnoughCopy {
  return copies[locale] ?? copies.en;
}
