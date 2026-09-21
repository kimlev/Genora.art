const secret = process.env.SUPPORT_WORKER_SECRET;
const endpoint = process.env.YOUTUBE_WORKER_URL ?? "http://app:3310/api/internal/youtube/process";
if (!secret) throw new Error("SUPPORT_WORKER_SECRET is required");

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

while (true) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(20 * 60_000),
    });
    if (!response.ok) console.error("youtube_worker_request_failed", response.status);
  } catch (error) {
    console.error("youtube_worker_request_failed", error instanceof Error ? error.message : "unknown");
  }
  await wait(5 * 60_000);
}
