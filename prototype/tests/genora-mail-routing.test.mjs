import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadMail(accepted = ["test@example.invalid"]) {
  const connections = [];
  const messages = [];
  const source = readFileSync(new URL("../src/lib/server/mail.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mocks = {
    "server-only": {},
    "@/lib/server/db": { query: async (sql) => [{ email: sql.includes("is_auth") ? "no-reply@genora.art" : "support@genora.art", app_password_encrypted: "encrypted-test-value" }] },
    "@/lib/server/totp": { decryptSecret: () => "test-mail-password" },
    "@/lib/server/support-mailboxes": { getAuthMailboxEmail: async () => "no-reply@genora.art", getPrimarySupportEmail: async () => "support@genora.art" },
    "@/lib/mail-auth-copy": { getAuthMailCopy: () => ({ verification: { subject: "Confirm", text: () => "Confirm", footer: "Genora.art" } }) },
    "@/lib/mail-copy": { getMailCopy: () => ({ supportSignOff: "Genora.art support" }) },
    "@/lib/mail-layout": { renderActionEmailHtml: () => "<p>Confirm</p>" },
    "@/lib/public-contact": { applyPublicContactEmail: value => value },
    nodemailer: { createTransport: config => { connections.push(config); return { verify: async () => true, sendMail: async msg => { messages.push(msg); return { accepted }; } }; } },
    "node:path": { join: (...parts) => parts.join("/") },
  };
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(name => {
    assert.ok(name in mocks, "Unexpected dependency: " + name);
    return mocks[name];
  }, compiledModule, compiledModule.exports);
  return { mail: compiledModule.exports, connections, messages };
}

test("registration uses the configured auth mailbox password and support reply address", async () => {
  const { mail, connections, messages } = loadMail();
  await mail.sendEmailVerification("test@example.invalid", "https://dev.genora.art/ru/verify-email#test", "ru");
  assert.equal(connections[0].auth.user, "no-reply@genora.art");
  assert.equal(connections[0].auth.pass, "test-mail-password");
  assert.equal(connections[0].secure, true);
  assert.equal(messages[0].from.address, "no-reply@genora.art");
  assert.equal(messages[0].replyTo, "support@genora.art");
});

test("support replies authenticate with support mailbox and escape message HTML", async () => {
  const { mail, connections, messages } = loadMail();
  await mail.sendSupportReply("test@example.invalid", "Support", "<script>bad</script>", "ru");
  assert.equal(connections[0].auth.user, "support@genora.art");
  assert.equal(messages[0].from.address, "support@genora.art");
  assert.ok(messages[0].html.includes("&lt;script&gt;"));
  assert.ok(!messages[0].html.includes("<script>"));
});

test("registration rejects an SMTP response that did not accept the recipient", async () => {
  const { mail } = loadMail([]);
  await assert.rejects(
    mail.sendEmailVerification("test@example.invalid", "https://dev.genora.art/ru/verify-email#test", "ru"),
    { message: "SMTP_RECIPIENT_NOT_ACCEPTED" },
  );
});
