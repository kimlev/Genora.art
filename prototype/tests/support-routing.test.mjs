import assert from "node:assert/strict";
import test from "node:test";

import { supportEscalationReason } from "../src/lib/support-routing.ts";

test("routes refunds and account deletion to an employee", () => {
  assert.equal(supportEscalationReason("billing-refund", "Хочу оформить возврат средств"), "refund");
  assert.equal(supportEscalationReason("other", "Прошу удалить мой аккаунт"), "account_deletion");
});

test("routes cooperation to an employee but leaves ordinary support with AI", () => {
  assert.equal(supportEscalationReason("cooperation", "Хотим обсудить интеграцию"), "cooperation");
  assert.equal(supportEscalationReason("billing-refund", "Не отображается платёж"), null);
  assert.equal(supportEscalationReason("other", "Не открывается история чатов"), null);
});
