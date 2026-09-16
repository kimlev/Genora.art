import type { ServedLocale } from "../served-locales";

// Title, prompt, save, validation/help, save failure.
const copy = {
  ru: ["Название", "Промт", "Сохранить", "От 4 до 30 символов. Пустое поле — начало промта.", "Не удалось сохранить название. Попробуйте ещё раз."],
  en: ["Title", "Prompt", "Save", "4–30 characters. Leave empty to show the start of the prompt.", "Could not save the title. Please try again."],
  hi: ["शीर्षक", "प्रॉम्प्ट", "सहेजें", "4–30 अक्षर। प्रॉम्प्ट की शुरुआत दिखाने के लिए खाली छोड़ें।", "शीर्षक सहेजा नहीं जा सका। फिर से कोशिश करें।"],
  es: ["Título", "Prompt", "Guardar", "4–30 caracteres. Déjalo vacío para mostrar el inicio del prompt.", "No se pudo guardar el título. Inténtalo de nuevo."],
  fr: ["Titre", "Prompt", "Enregistrer", "4 à 30 caractères. Laissez vide pour afficher le début du prompt.", "Impossible d’enregistrer le titre. Réessayez."],
  ar: ["العنوان", "الطلب", "حفظ", "من 4 إلى 30 حرفًا. اتركه فارغًا لعرض بداية الطلب.", "تعذّر حفظ العنوان. حاول مرة أخرى."],
  pt: ["Título", "Prompt", "Salvar", "4–30 caracteres. Deixe vazio para mostrar o início do prompt.", "Não foi possível salvar o título. Tente novamente."],
  de: ["Titel", "Prompt", "Speichern", "4–30 Zeichen. Leer lassen, um den Anfang des Prompts anzuzeigen.", "Der Titel konnte nicht gespeichert werden. Bitte erneut versuchen."],
  it: ["Titolo", "Prompt", "Salva", "4–30 caratteri. Lascia vuoto per mostrare l’inizio del prompt.", "Impossibile salvare il titolo. Riprova."],
  tr: ["Başlık", "İstem", "Kaydet", "4–30 karakter. İstemin başlangıcını göstermek için boş bırakın.", "Başlık kaydedilemedi. Tekrar deneyin."],
  pl: ["Tytuł", "Prompt", "Zapisz", "4–30 znaków. Pozostaw puste, aby wyświetlić początek promptu.", "Nie udało się zapisać tytułu. Spróbuj ponownie."],
  sv: ["Titel", "Prompt", "Spara", "4–30 tecken. Lämna tomt för att visa början av prompten.", "Titeln kunde inte sparas. Försök igen."],
  cs: ["Název", "Prompt", "Uložit", "4–30 znaků. Nechte prázdné pro zobrazení začátku promptu.", "Název se nepodařilo uložit. Zkuste to znovu."],
} satisfies Record<ServedLocale, readonly [string, string, string, string, string]>;

export function mediaTitleCopy(locale: string) {
  const [title, prompt, save, hint, failed] = copy[locale as ServedLocale] ?? copy.en;
  return { title, prompt, save, hint, failed };
}
