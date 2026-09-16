import type { Locale } from "@/lib/i18n/types";

type DeleteConfirmationCopy = {
  title: string;
  cancel: string;
  confirm: string;
};

const copies = {
  ru: { title: "Удалить?", cancel: "Отмена", confirm: "Подтвердить" },
  en: { title: "Delete?", cancel: "Cancel", confirm: "Confirm" },
  zh: { title: "删除？", cancel: "取消", confirm: "确认" },
  hi: { title: "हटाएँ?", cancel: "रद्द करें", confirm: "पुष्टि करें" },
  es: { title: "¿Eliminar?", cancel: "Cancelar", confirm: "Confirmar" },
  fr: { title: "Supprimer ?", cancel: "Annuler", confirm: "Confirmer" },
  ar: { title: "حذف؟", cancel: "إلغاء", confirm: "تأكيد" },
  pt: { title: "Excluir?", cancel: "Cancelar", confirm: "Confirmar" },
  de: { title: "Löschen?", cancel: "Abbrechen", confirm: "Bestätigen" },
  ja: { title: "削除しますか？", cancel: "キャンセル", confirm: "確認" },
  it: { title: "Eliminare?", cancel: "Annulla", confirm: "Conferma" },
  ko: { title: "삭제할까요?", cancel: "취소", confirm: "확인" },
  tr: { title: "Silinsin mi?", cancel: "İptal", confirm: "Onayla" },
  pl: { title: "Usunąć?", cancel: "Anuluj", confirm: "Potwierdź" },
  nl: { title: "Verwijderen?", cancel: "Annuleren", confirm: "Bevestigen" },
  sv: { title: "Ta bort?", cancel: "Avbryt", confirm: "Bekräfta" },
  cs: { title: "Smazat?", cancel: "Zrušit", confirm: "Potvrdit" },
  el: { title: "Διαγραφή;", cancel: "Ακύρωση", confirm: "Επιβεβαίωση" },
  ro: { title: "Ștergeți?", cancel: "Anulare", confirm: "Confirmare" },
} satisfies Record<Locale, DeleteConfirmationCopy>;

export function deleteConfirmationCopy(locale: Locale): DeleteConfirmationCopy {
  return copies[locale] ?? copies.en;
}
