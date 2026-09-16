import type { Locale } from "@/lib/i18n/types";
import { videoReferenceMixUnsupportedCopy } from "@/lib/i18n/copy/video-studio-ui-copy";

const labels = {
  ru: "Ошибка",
  en: "Error",
  zh: "错误",
  hi: "त्रुटि",
  es: "Error",
  fr: "Erreur",
  ar: "خطأ",
  pt: "Erro",
  de: "Fehler",
  ja: "エラー",
  it: "Errore",
  ko: "오류",
  tr: "Hata",
  pl: "Błąd",
  nl: "Fout",
  sv: "Fel",
  cs: "Chyba",
  el: "Σφάλμα",
  ro: "Eroare",
} satisfies Record<Locale, string>;

const privacyPolicyLabels = {
  ru: "Ошибка: модель отклонила запрос из-за политики приватности. Нужно официальное подтверждение прав для персонажа.",
  en: "Error: the model rejected the request due to its privacy policy. Official confirmation of the rights to use the character is required.",
  zh: "错误：模型因隐私政策拒绝了请求。需要提供使用该角色的正式权利证明。",
  hi: "त्रुटि: गोपनीयता नीति के कारण मॉडल ने अनुरोध अस्वीकार कर दिया। इस पात्र के उपयोग के अधिकारों की आधिकारिक पुष्टि आवश्यक है।",
  es: "Error: el modelo rechazó la solicitud por su política de privacidad. Se necesita una confirmación oficial de los derechos de uso del personaje.",
  fr: "Erreur : le modèle a rejeté la demande en raison de sa politique de confidentialité. Une confirmation officielle des droits d’utilisation du personnage est requise.",
  ar: "خطأ: رفض النموذج الطلب بسبب سياسة الخصوصية. يلزم تأكيد رسمي لحقوق استخدام الشخصية.",
  pt: "Erro: o modelo rejeitou a solicitação devido à política de privacidade. É necessária uma confirmação oficial dos direitos de uso do personagem.",
  de: "Fehler: Das Modell hat die Anfrage aufgrund der Datenschutzrichtlinie abgelehnt. Eine offizielle Bestätigung der Rechte zur Nutzung der Person ist erforderlich.",
  ja: "エラー：プライバシーポリシーによりモデルがリクエストを拒否しました。人物を使用する権利の正式な確認が必要です。",
  it: "Errore: il modello ha rifiutato la richiesta a causa della politica sulla privacy. È necessaria una conferma ufficiale dei diritti di utilizzo del personaggio.",
  ko: "오류: 개인정보 보호정책으로 인해 모델이 요청을 거부했습니다. 해당 인물을 사용할 권리에 대한 공식 확인이 필요합니다.",
  tr: "Hata: model, gizlilik politikası nedeniyle isteği reddetti. Karakteri kullanma haklarının resmî olarak doğrulanması gerekir.",
  pl: "Błąd: model odrzucił żądanie ze względu na politykę prywatności. Wymagane jest oficjalne potwierdzenie praw do wykorzystania postaci.",
  nl: "Fout: het model heeft het verzoek afgewezen vanwege het privacybeleid. Een officiële bevestiging van de rechten om het personage te gebruiken is vereist.",
  sv: "Fel: modellen avvisade begäran på grund av integritetspolicyn. En officiell bekräftelse av rätten att använda personen krävs.",
  cs: "Chyba: model požadavek odmítl kvůli zásadám ochrany soukromí. Je vyžadováno oficiální potvrzení práv k použití postavy.",
  el: "Σφάλμα: το μοντέλο απέρριψε το αίτημα λόγω της πολιτικής απορρήτου. Απαιτείται επίσημη επιβεβαίωση των δικαιωμάτων χρήσης του χαρακτήρα.",
  ro: "Eroare: modelul a respins solicitarea din cauza politicii de confidențialitate. Este necesară confirmarea oficială a drepturilor de utilizare a personajului.",
} satisfies Record<Locale, string>;

export function generationErrorLabel(locale: Locale): string {
  return labels[locale] ?? labels.en;
}

export function generationFailureLabel(locale: Locale, errorCode?: string | null): string {
  if (errorCode === "privacy_policy") return privacyPolicyLabels[locale] ?? privacyPolicyLabels.en;
  if (errorCode === "video_reference_unsupported") return videoReferenceMixUnsupportedCopy(locale);
  return generationErrorLabel(locale);
}
