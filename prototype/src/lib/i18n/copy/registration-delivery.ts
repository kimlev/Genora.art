import type { Locale } from "@/lib/i18n/types";

export type RegistrationDeliveryCopy = {
  checkSpam: string;
  supportLink: string;
};

const copies: Record<Locale, RegistrationDeliveryCopy> = {
  en: { checkSpam: "Please check your spam folder.", supportLink: "Didn't receive the email? Contact support." },
  ru: { checkSpam: "Проверьте папку «Спам».", supportLink: "Не пришло письмо? Обратитесь в поддержку." },
  zh: { checkSpam: "请检查垃圾邮件文件夹。", supportLink: "没有收到邮件？联系支持团队。" },
  hi: { checkSpam: "कृपया अपना स्पैम फ़ोल्डर देखें।", supportLink: "ईमेल नहीं मिला? सहायता टीम से संपर्क करें।" },
  es: { checkSpam: "Revisa la carpeta de spam.", supportLink: "¿No recibiste el correo? Contacta con soporte." },
  fr: { checkSpam: "Vérifiez votre dossier de spam.", supportLink: "Vous n’avez pas reçu l’e-mail ? Contactez le support." },
  ar: { checkSpam: "يرجى التحقق من مجلد الرسائل غير المرغوب فيها.", supportLink: "لم تصلك الرسالة؟ تواصل مع الدعم." },
  pt: { checkSpam: "Verifique a pasta de spam.", supportLink: "Não recebeu o e-mail? Fale com o suporte." },
  de: { checkSpam: "Prüfen Sie bitte Ihren Spam-Ordner.", supportLink: "Keine E-Mail erhalten? Wenden Sie sich an den Support." },
  ja: { checkSpam: "迷惑メールフォルダをご確認ください。", supportLink: "メールが届きませんか？サポートにお問い合わせください。" },
  it: { checkSpam: "Controlla la cartella spam.", supportLink: "Non hai ricevuto l’e-mail? Contatta l’assistenza." },
  ko: { checkSpam: "스팸 폴더를 확인해 주세요.", supportLink: "이메일을 받지 못하셨나요? 고객지원에 문의하세요." },
  tr: { checkSpam: "Lütfen spam klasörünüzü kontrol edin.", supportLink: "E-posta gelmedi mi? Destek ekibiyle iletişime geçin." },
  pl: { checkSpam: "Sprawdź folder spamu.", supportLink: "Nie otrzymałeś wiadomości? Skontaktuj się z pomocą techniczną." },
  nl: { checkSpam: "Controleer uw spammap.", supportLink: "Geen e-mail ontvangen? Neem contact op met support." },
  sv: { checkSpam: "Kontrollera skräppostmappen.", supportLink: "Har du inte fått mejlet? Kontakta supporten." },
  cs: { checkSpam: "Zkontrolujte složku spamu.", supportLink: "E-mail nedorazil? Kontaktujte podporu." },
  el: { checkSpam: "Ελέγξτε τον φάκελο ανεπιθύμητης αλληλογραφίας.", supportLink: "Δεν λάβατε το email; Επικοινωνήστε με την υποστήριξη." },
  ro: { checkSpam: "Verificați folderul Spam.", supportLink: "Nu ați primit e-mailul? Contactați echipa de asistență." },
};

export function getRegistrationDeliveryCopy(locale: Locale): RegistrationDeliveryCopy {
  return copies[locale] ?? copies.en;
}
