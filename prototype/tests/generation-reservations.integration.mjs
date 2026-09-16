// Explicit opt-in: isolated schema, synthetic wallets, no provider calls or real-user mutations.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { reserveGenerationTokens, generationReservation, captureGenerationTokens, refundGenerationTokens, dispatchReservedGeneration } from "../src/lib/server/generation-reservations.ts";

const url = process.env.GENERATION_TEST_DATABASE_URL;
if (!url) throw new Error("GENERATION_TEST_DATABASE_URL required");
const schema = "hold_test_" + randomUUID().replaceAll("-", "");
const admin = new pg.Client({ connectionString: url });
await admin.connect();
let pool;
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 6 });
  globalThis.genoraPool = pool;
  await pool.query(`
    CREATE TABLE users(id uuid PRIMARY KEY, balance_tokens bigint, paid_balance_tokens bigint,
      status text DEFAULT 'active',email_verified_at timestamptz,updated_at timestamptz);
    CREATE TABLE usage_entries(id text PRIMARY KEY,user_id uuid,conversation_id text,chat_title text DEFAULT '',model text DEFAULT '',model_id text,
      provider text,agent text DEFAULT '',input_tokens bigint DEFAULT 0,output_tokens bigint DEFAULT 0,billed_input_tokens bigint DEFAULT 0,
      billed_output_tokens bigint DEFAULT 0,billed_tokens bigint DEFAULT 0,unpaid_tokens bigint DEFAULT 0,billing_multiplier numeric DEFAULT 1,
      cost_usd numeric DEFAULT 0,revenue_usd numeric DEFAULT 0,upstream_request_id text,usage_comment text,deleted boolean DEFAULT false,
      created_at timestamptz DEFAULT now());
    CREATE TABLE balance_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),
      kind text,token_delta bigint,note text,usage_entry_id text REFERENCES usage_entries(id));
  `);
  await pool.query(await readFile(new URL("../db/migrations/057_generation_reservations.sql", import.meta.url), "utf8"));
  const tx = async (fn) => {
    const client = await pool.connect();
    try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  };
  const user = randomUUID();
  await pool.query("INSERT INTO users(id,balance_tokens,paid_balance_tokens) VALUES($1,51500,40000)", [user]);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const attempts = await Promise.allSettled(ids.map((id) => tx((c) => reserveGenerationTokens(c, id, user, 20000))));
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 2);
  assert.equal(attempts.find((r) => r.status === "rejected").reason.message, "INSUFFICIENT_BALANCE");
  const wallet = async () => (await pool.query("SELECT balance_tokens,paid_balance_tokens FROM users WHERE id=$1", [user])).rows[0];
  assert.deepEqual(await wallet(), { balance_tokens: "11500", paid_balance_tokens: "11500" });
  const held = (await pool.query("SELECT job_id,paid_tokens FROM generation_reservations ORDER BY paid_tokens")).rows;
  // Capture is idempotent and uses the originally held paid/gift split, not the current wallet.
  await pool.query("INSERT INTO usage_entries(id,user_id) VALUES('usage-test',$1)", [user]);
  await tx((c) => captureGenerationTokens(c, held[0].job_id, user, "usage-test", "success"));
  await tx((c) => captureGenerationTokens(c, held[0].job_id, user, "usage-test", "success"));
  assert.equal((await wallet()).balance_tokens, "11500");
  assert.equal(await tx((c) => refundGenerationTokens(c, held[0].job_id, user)), false);
  // Parallel duplicate failures refund once.
  await Promise.all([1, 2, 3].map(() => tx((c) => refundGenerationTokens(c, held[1].job_id, user))));
  assert.deepEqual(await wallet(), { balance_tokens: "31500", paid_balance_tokens: "31500" });
  await assert.rejects(tx((c) => generationReservation(c, held[1].job_id, user)), /ALREADY_REFUNDED/);
  assert.equal((await pool.query("SELECT count(*) FROM balance_transactions WHERE token_delta>0")).rows[0].count, "1");
  // Failure while creating the job rolls back both debit and ledger.
  await assert.rejects(tx(async (c) => {
    await reserveGenerationTokens(c, randomUUID(), user, 10000);
    throw new Error("INSERT_JOB_FAILED");
  }), /INSERT_JOB_FAILED/);
  assert.equal((await wallet()).balance_tokens, "31500");
  // Exact balance is sufficient; invalid prices cannot create free jobs.
  const exact = randomUUID();
  await tx((c) => reserveGenerationTokens(c, exact, user, 31500));
  assert.equal((await wallet()).balance_tokens, "0");
  const dispatched = await Promise.all([1, 2, 3].map(() => dispatchReservedGeneration(exact)));
  assert.equal(dispatched.filter(Boolean).length, 1);
  assert.equal(await tx((c) => refundGenerationTokens(c, exact, user, true)), false);
  await tx((c) => refundGenerationTokens(c, exact, user));
  assert.equal(await dispatchReservedGeneration(exact), false);
  for (const value of [0, -1, NaN, Infinity, 1.5]) await assert.rejects(tx((c) => reserveGenerationTokens(c, randomUUID(), user, value)), /PRICE_UNAVAILABLE/);
  // Ledger and wallet remain reconciled.
  const sum = Number((await pool.query("SELECT sum(token_delta) FROM balance_transactions")).rows[0].sum);
  assert.equal(51500 + sum, Number((await wallet()).balance_tokens));
  // Exercise real job entry points and real error handlers, with an in-memory provider stub.
  await pool.query("CREATE TABLE image_conversations(id uuid PRIMARY KEY,title text DEFAULT 'test')");
  for (const name of ["050_video_jobs.sql", "051_generation_jobs.sql", "062_internal_usage_entries.sql", "063_failed_job_dismissal.sql"]) {
    await pool.query(await readFile(new URL("../db/migrations/" + name, import.meta.url), "utf8"));
  }
  const { insertGenerationJob, markGenerationJobFailed } = await import("../src/lib/server/generation-jobs.ts");
  const { executeImageJob } = await import("../src/lib/server/image-jobs.ts");
  const { executeMusicJob } = await import("../src/lib/server/music-jobs.ts");
  const { insertVideoJob, executeVideoJob, markVideoJobFailed } = await import("../src/lib/server/video-jobs.ts");
  const conversationId = randomUUID();
  await pool.query("INSERT INTO image_conversations(id) VALUES($1)", [conversationId]);
  const before = await wallet();
  const chat = await insertGenerationJob({ userId: user, kind: "chat", surface: "chat" });
  assert.deepEqual(await wallet(), before, "text chat is still billed after its response");
  await markGenerationJobFailed(chat.id, "synthetic-chat-rejection");
  assert.deepEqual(await wallet(), before);
  assert.deepEqual((await pool.query(
    "SELECT billed_tokens,cost_usd,revenue_usd,internal_only FROM usage_entries WHERE id=$1",
    [`chat-failed-${chat.id}`],
  )).rows[0], { billed_tokens: "0", cost_usd: "0", revenue_usd: "0", internal_only: true });
  const realFetch = globalThis.fetch;
  process.env.INTEGRATOR_BASE_URL = "https://provider.invalid";
  process.env.INTEGRATOR_API_KEY = "fake-integration-test-key";
  let calls = 0;
  let expectedVideoPrompt = "";
  globalThis.fetch = async (url, init) => {
    if (init?.method === "POST") {
      calls++;
      assert.equal(Number((await wallet()).balance_tokens), Number(before.balance_tokens) - 1000, "hold committed before provider request");
      if (String(url).includes("/v1/videos/generations")) {
        assert.equal(JSON.parse(String(init.body)).prompt, expectedVideoPrompt, "video provider receives the complete prompt");
      }
      return Response.json({ error: "synthetic-rejection" }, { status: 400 });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  };
  try {
    const base = { userId: user, conversationId, conversationTitle: "test", locale: "ru", multiplier: 2.5,
      provider: "test", model: "test", modelLabel: "test", prompt: "test", storedPrompt: "test",
      size: "1K", format: "1:1", style: "auto", count: 1, sourceImageCount: 0, bpm: 120 };
    for (const kind of ["image", "music"]) {
      const job = await insertGenerationJob({ userId: user, kind, surface: kind === "image" ? "images" : "audio", reservationTokens: 1000 });
      assert.equal(job.balanceTokens, Number(before.balance_tokens) - 1000);
      if (kind === "image") await executeImageJob({ ...base, jobId: job.id });
      else await executeMusicJob({ ...base, mode: "song", jobId: job.id });
      await markGenerationJobFailed(job.id, "duplicate-failure");
      assert.deepEqual(await wallet(), before);
      assert.equal((await pool.query("SELECT status FROM generation_jobs WHERE id=$1", [job.id])).rows[0].status, "failed");
      const failedUsage = (await pool.query(
        "SELECT billed_tokens,cost_usd,revenue_usd,internal_only FROM usage_entries WHERE id=$1",
        [`${kind}-failed-${job.id}`],
      )).rows[0];
      assert.deepEqual(failedUsage, { billed_tokens: "0", cost_usd: "0", revenue_usd: "0", internal_only: true });
    }
    const requestId = randomUUID();
    const longVideoPrompt = "A".repeat(8_000);
    expectedVideoPrompt = longVideoPrompt;
    const video = await insertVideoJob({ ...base, prompt: longVideoPrompt, modelId: "test", mode: "text-to-video", durationSec: 8,
      resolution: "720p", aspectRatio: "16:9", sound: "off", requestId, reservationTokens: 1000 });
    await executeVideoJob({ ...base, prompt: longVideoPrompt, jobId: video.id, requestId, mode: "text-to-video", duration: 8, resolution: "720p", aspectRatio: "16:9", sound: "off" });
    await markVideoJobFailed(video.id, "duplicate-failure");
    assert.deepEqual(await wallet(), before);
    assert.equal((await pool.query("SELECT status FROM video_jobs WHERE id=$1", [video.id])).rows[0].status, "failed");
    const failedUsage = (await pool.query(
      "SELECT billed_tokens,cost_usd,revenue_usd,internal_only FROM usage_entries WHERE id=$1",
      [`video-failed-${video.id}`],
    )).rows[0];
    assert.deepEqual(failedUsage, { billed_tokens: "0", cost_usd: "0", revenue_usd: "0", internal_only: true });
    assert.equal(calls, 3);
  } finally { globalThis.fetch = realFetch; }
  // Complete the real success path, not only the reservation helper.
  await pool.query(`
    ALTER TABLE users ADD COLUMN locale text;
    ALTER TABLE image_conversations ADD COLUMN user_id uuid, ADD COLUMN updated_at timestamptz DEFAULT now();
    ALTER TABLE usage_entries ADD COLUMN tool_cost_usd numeric,
      ADD COLUMN latency_ms int, ADD COLUMN integrator_chat_id text;
    CREATE TABLE media_assets(id text PRIMARY KEY,kind text,byte_length bigint,preview_bytes bytea,preview_mime text,preview_byte_length bigint);
  `);
  await pool.query(await readFile(new URL("../db/migrations/045_video_generations.sql", import.meta.url), "utf8"));
  await pool.query("UPDATE image_conversations SET user_id=$1 WHERE id=$2", [user, conversationId]);
  const assetId = randomUUID();
  await pool.query("INSERT INTO media_assets VALUES($1,'video',1,$2,'image/webp',1)", [assetId, Buffer.from([1])]);
  const successRequest = randomUUID();
  const successInput = { userId: user, conversationId, conversationTitle: "test", locale: "ru", multiplier: 2.5,
    provider: "test", model: "test", modelId: "test", modelLabel: "test", prompt: "test", style: "auto",
    mode: "text-to-video", duration: 8, durationSec: 8, resolution: "720p", aspectRatio: "16:9", sound: "off", requestId: successRequest };
  const startBalance = Number((await wallet()).balance_tokens);
  const successful = await insertVideoJob({ ...successInput, reservationTokens: 1000 });
  assert.equal(Number((await wallet()).balance_tokens), startBalance - 1000);
  let generations = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/v1/videos/generations")) {
      generations++;
      assert.equal(Number((await wallet()).balance_tokens), startBalance - 1000);
      return Response.json({ request_id: successRequest, data: [{ url: `/v1/videos/${assetId}`, duration_sec: 8 }],
        usage: { cost_usd: 0.04, duration_sec: 8 }, meta: { model_label: "test", latency_ms: 10, duration_sec: 8 } });
    }
    if (String(url).endsWith("/ack")) return Response.json({ ok: true });
    throw new Error("Unexpected test network request");
  };
  try {
    await executeVideoJob({ ...successInput, jobId: successful.id });
    const { getVideoJob, videoJobResult, reconcileVideoJob } = await import("../src/lib/server/video-jobs.ts");
    const ready = await getVideoJob(user, successful.id);
    assert.equal(ready.status, "ready");
    assert.equal(Number((await wallet()).balance_tokens), startBalance - 1000, "success must not debit again");
    await Promise.all([executeVideoJob({ ...successInput, jobId: successful.id }), reconcileVideoJob(successful.id, user), videoJobResult(user, ready)]);
    await markVideoJobFailed(successful.id, "late failure");
    assert.equal(generations, 1);
    assert.equal(Number((await wallet()).balance_tokens), startBalance - 1000, "repeated success/poll/failure must not mutate captured balance");
    const ledger = (await pool.query("SELECT count(*) AS count,sum(token_delta) AS total FROM balance_transactions WHERE usage_entry_id=$1", [`video-${successRequest}`])).rows[0];
    assert.deepEqual(ledger, { count: "1", total: "-1000" });
    const otherJob = randomUUID();
    await tx((client) => reserveGenerationTokens(client, otherJob, user, 2000));
    assert.equal((await videoJobResult(user, ready)).balanceTokens, startBalance - 3000, "video polling returns current wallet, not an old result balance");
    await tx((client) => refundGenerationTokens(client, otherJob, user));
  } finally { globalThis.fetch = realFetch; }
  console.log("PASS: successful video debits once before provider dispatch; completion, duplicate execution/polling and late failure never debit twice");
  console.log("PASS: PostgreSQL concurrency, insufficient balance, capture/refund idempotency, paid/gift split, rollback, exact balance, ledger reconciliation, exactly-once dispatch, no stale refund after dispatch");
  console.log("PASS: real image/music/video job functions reserve before provider dispatch and refund on failure; text remains unchanged; zero paid API calls");
} finally {
  await pool?.end();
  await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.end();
}
