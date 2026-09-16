import type { Locale } from "../types";

export const promptBlockedCopy = {
  ru: "Модель отклонила запрос. Попробуйте ещё раз.",
  en: "The model rejected the request. Please try again.",
  zh: "模型拒绝了请求。请重试。",
  hi: "मॉडल ने अनुरोध अस्वीकार कर दिया। कृपया फिर से प्रयास करें।",
  es: "El modelo rechazó la solicitud. Inténtalo de nuevo.",
  fr: "Le modèle a rejeté la demande. Veuillez réessayer.",
  ar: "رفض النموذج الطلب. يُرجى المحاولة مرة أخرى.",
  pt: "O modelo rejeitou a solicitação. Tente novamente.",
  de: "Das Modell hat die Anfrage abgelehnt. Bitte versuche es erneut.",
  ja: "モデルがリクエストを拒否しました。もう一度お試しください。",
  it: "Il modello ha rifiutato la richiesta. Riprova.",
  ko: "모델이 요청을 거부했습니다. 다시 시도해 주세요.",
  tr: "Model isteği reddetti. Lütfen tekrar deneyin.",
  pl: "Model odrzucił żądanie. Spróbuj ponownie.",
  nl: "Het model heeft het verzoek afgewezen. Probeer het opnieuw.",
  sv: "Modellen avvisade begäran. Försök igen.",
  cs: "Model požadavek odmítl. Zkuste to znovu.",
  el: "Το μοντέλο απέρριψε το αίτημα. Δοκιμάστε ξανά.",
  ro: "Modelul a respins solicitarea. Încearcă din nou.",
} satisfies Record<Locale, string>;
