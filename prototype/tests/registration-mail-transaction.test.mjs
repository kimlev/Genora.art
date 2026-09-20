import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("registration sends verification before committing the user and token", async () => {
  const source = await readFile(new URL("../src/app/api/auth/register/route.ts", import.meta.url), "utf8");
  const transactionStart = source.indexOf("await withTransaction(async (client) => {");
  const transactionEnd = source.indexOf("\n    });", transactionStart);
  const mailCall = source.indexOf("await sendEmailVerification(", transactionStart);
  assert.ok(transactionStart >= 0 && transactionEnd > transactionStart);
  assert.ok(mailCall > transactionStart && mailCall < transactionEnd);
  assert.match(source.slice(transactionStart, transactionEnd), /INSERT INTO email_verification_tokens/);
});
