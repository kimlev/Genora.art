import type { Locale } from "@/lib/i18n/types";

export type VideoPricingCopy = {
  mode: string;
  note: string;
  resolution: string;
  sound: string;
  pricePerSec: string;
  soundOn: string;
  soundOff: string;
  loading: string;
  tags: Record<string, string>;
};

const tags = (t2v: string, i2v: string, ref: string, v2v: string, sound: string): VideoPricingCopy["tags"] => ({
  t2v, i2v, ref, v2v, sound,
});

const copy: Record<Locale, VideoPricingCopy> = {
  ru: { mode: "Видео", note: "Цена за секунду в токенах.", resolution: "Разрешение", sound: "Звук", pricePerSec: "Цена за сек", soundOn: "Со звуком", soundOff: "Без звука", loading: "Каталог видео загружается…", tags: tags("Текст", "Фото", "Референс", "Видео", "Звук") },
  en: { mode: "Video", note: "Price per second in tokens.", resolution: "Resolution", sound: "Sound", pricePerSec: "Price / sec", soundOn: "With sound", soundOff: "No sound", loading: "Loading the video catalog…", tags: tags("Text", "Photo", "Reference", "Video", "Sound") },
  zh: { mode: "视频", note: "每秒价格以代币计。", resolution: "分辨率", sound: "声音", pricePerSec: "每秒价格", soundOn: "有声", soundOff: "无声", loading: "正在加载视频目录…", tags: tags("文本", "照片", "参考", "视频", "声音") },
  hi: { mode: "वीडियो", note: "प्रति सेकंड कीमत टोकन में।", resolution: "रिज़ॉल्यूशन", sound: "आवाज़", pricePerSec: "कीमत / सेकंड", soundOn: "आवाज़ के साथ", soundOff: "बिना आवाज़", loading: "वीडियो कैटलॉग लोड हो रहा है…", tags: tags("टेक्स्ट", "फ़ोटो", "रेफरेंस", "वीडियो", "आवाज़") },
  es: { mode: "Vídeo", note: "Precio por segundo en tokens.", resolution: "Resolución", sound: "Sonido", pricePerSec: "Precio / s", soundOn: "Con sonido", soundOff: "Sin sonido", loading: "Cargando el catálogo de vídeo…", tags: tags("Texto", "Foto", "Referencia", "Vídeo", "Sonido") },
  fr: { mode: "Vidéo", note: "Prix par seconde en jetons.", resolution: "Résolution", sound: "Son", pricePerSec: "Prix / s", soundOn: "Avec son", soundOff: "Sans son", loading: "Chargement du catalogue vidéo…", tags: tags("Texte", "Photo", "Référence", "Vidéo", "Son") },
  ar: { mode: "فيديو", note: "السعر لكل ثانية بالرموز.", resolution: "الدقة", sound: "صوت", pricePerSec: "السعر / ث", soundOn: "مع صوت", soundOff: "بدون صوت", loading: "جارٍ تحميل كتالوج الفيديو…", tags: tags("نص", "صورة", "مرجع", "فيديو", "صوت") },
  pt: { mode: "Vídeo", note: "Preço por segundo em tokens.", resolution: "Resolução", sound: "Som", pricePerSec: "Preço / s", soundOn: "Com som", soundOff: "Sem som", loading: "A carregar o catálogo de vídeo…", tags: tags("Texto", "Foto", "Referência", "Vídeo", "Som") },
  de: { mode: "Video", note: "Preis pro Sekunde in Tokens.", resolution: "Auflösung", sound: "Ton", pricePerSec: "Preis / Sek.", soundOn: "Mit Ton", soundOff: "Ohne Ton", loading: "Videokatalog wird geladen…", tags: tags("Text", "Foto", "Referenz", "Video", "Ton") },
  ja: { mode: "動画", note: "1秒あたりのトークン価格。", resolution: "解像度", sound: "音声", pricePerSec: "秒単価", soundOn: "音声あり", soundOff: "音声なし", loading: "動画カタログを読み込み中…", tags: tags("テキスト", "写真", "参照", "動画", "音声") },
  it: { mode: "Video", note: "Prezzo al secondo in token.", resolution: "Risoluzione", sound: "Audio", pricePerSec: "Prezzo / s", soundOn: "Con audio", soundOff: "Senza audio", loading: "Caricamento del catalogo video…", tags: tags("Testo", "Foto", "Riferimento", "Video", "Audio") },
  ko: { mode: "영상", note: "초당 토큰 가격.", resolution: "해상도", sound: "소리", pricePerSec: "초당 가격", soundOn: "소리 있음", soundOff: "소리 없음", loading: "영상 목록을 불러오는 중…", tags: tags("텍스트", "사진", "레퍼런스", "영상", "소리") },
  tr: { mode: "Video", note: "Saniye başına token fiyatı.", resolution: "Çözünürlük", sound: "Ses", pricePerSec: "Fiyat / sn", soundOn: "Sesli", soundOff: "Sessiz", loading: "Video kataloğu yükleniyor…", tags: tags("Metin", "Foto", "Referans", "Video", "Ses") },
  pl: { mode: "Wideo", note: "Cena za sekundę w tokenach.", resolution: "Rozdzielczość", sound: "Dźwięk", pricePerSec: "Cena / s", soundOn: "Z dźwiękiem", soundOff: "Bez dźwięku", loading: "Ładowanie katalogu wideo…", tags: tags("Tekst", "Zdjęcie", "Referencja", "Wideo", "Dźwięk") },
  nl: { mode: "Video", note: "Prijs per seconde in tokens.", resolution: "Resolutie", sound: "Geluid", pricePerSec: "Prijs / s", soundOn: "Met geluid", soundOff: "Zonder geluid", loading: "Videocatalogus wordt geladen…", tags: tags("Tekst", "Foto", "Referentie", "Video", "Geluid") },
  sv: { mode: "Video", note: "Pris per sekund i tokens.", resolution: "Upplösning", sound: "Ljud", pricePerSec: "Pris / s", soundOn: "Med ljud", soundOff: "Utan ljud", loading: "Laddar videokatalogen…", tags: tags("Text", "Foto", "Referens", "Video", "Ljud") },
  cs: { mode: "Video", note: "Cena za sekundu v tokenech.", resolution: "Rozlišení", sound: "Zvuk", pricePerSec: "Cena / s", soundOn: "Se zvukem", soundOff: "Bez zvuku", loading: "Načítání katalogu videa…", tags: tags("Text", "Foto", "Reference", "Video", "Zvuk") },
  el: { mode: "Βίντεο", note: "Τιμή ανά δευτερόλεπτο σε token.", resolution: "Ανάλυση", sound: "Ήχος", pricePerSec: "Τιμή / δευτ.", soundOn: "Με ήχο", soundOff: "Χωρίς ήχο", loading: "Φόρτωση καταλόγου βίντεο…", tags: tags("Κείμενο", "Φωτο", "Αναφορά", "Βίντεο", "Ήχος") },
  ro: { mode: "Video", note: "Preț pe secundă în tokeni.", resolution: "Rezoluție", sound: "Sunet", pricePerSec: "Preț / s", soundOn: "Cu sunet", soundOff: "Fără sunet", loading: "Se încarcă catalogul video…", tags: tags("Text", "Foto", "Referință", "Video", "Sunet") },
};

export function videoPricingCopy(locale: Locale): VideoPricingCopy {
  return copy[locale] ?? copy.en;
}

export function videoTagLabel(locale: Locale, tag: string) {
  return videoPricingCopy(locale).tags[tag] ?? tag;
}
