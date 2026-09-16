/** Оплаченный счёт — токены зелёные. Неоплаченный или с ошибкой — красные. */
export function invoiceTokensOk(status: string): boolean {
  return status === "paid";
}
