const REFUND_PATTERN = /(?:возврат|вернут(?:ь|е)|refund|chargeback|оспорить\s+плат[её]ж)/iu;
const ACCOUNT_DELETION_PATTERN = /(?:удал(?:ить|ение)\s+(?:мой\s+)?аккаунт|закрыть\s+(?:мой\s+)?аккаунт|delete\s+(?:my\s+)?account|remove\s+(?:my\s+)?account)/iu;

export type SupportEscalationReason = "refund" | "account_deletion" | "cooperation" | null;

export function supportEscalationReason(topic: string, message: string): SupportEscalationReason {
  if (ACCOUNT_DELETION_PATTERN.test(message)) return "account_deletion";
  if (topic === "billing-refund" && REFUND_PATTERN.test(message)) return "refund";
  if (topic === "cooperation") return "cooperation";
  return null;
}
