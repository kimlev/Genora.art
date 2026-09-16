import { parseStreampayCallback, streampayAccountingCurrency, streampayInvoiceOutcome, streampayQueryToSign, STREAMPAY_SUCCESS, verifyStreampayPayload } from "@/lib/payments/streampay";
import { applyPaidInvoice, attachProviderInvoice, markInvoiceCancelled, markInvoiceFailed } from "@/lib/server/invoices";
import { jsonError } from "@/lib/server/http";
import { streampayProviderId } from "@/lib/server/streampay";

export const runtime = "nodejs";

function publicKey(): string | null {
  return process.env.STREAMPAY_PUBLIC_KEY?.trim() || null;
}

function signatureOf(request: Request): string {
  return request.headers.get("signature") ?? request.headers.get("Signature") ?? "";
}

async function handleCallback(payload: Record<string, unknown>, signedText: string, request: Request): Promise<Response> {
  const key = publicKey();
  if (!key || !verifyStreampayPayload(signedText, signatureOf(request), key)) {
    return jsonError("Invalid signature", 403);
  }
  const callback = parseStreampayCallback(payload);
  if (!callback) return jsonError("Invalid callback", 400);
  if (callback.invoiceId) await attachProviderInvoice(callback.externalId, callback.invoiceId);

  if (callback.status === STREAMPAY_SUCCESS) {
    // `amount` при национальном счёте выражен в RUB; долларовый эквивалент
    // поступления StreamPay всегда сообщает в `merchant_total` (USDT).
    const credited = callback.merchantTotal ?? 0;
    const currency = streampayAccountingCurrency(callback.systemCurrency ?? callback.currency);
    const result = await applyPaidInvoice({
      invoiceNumber: callback.externalId,
      providerId: streampayProviderId(),
      providerRef: callback.invoiceId || callback.externalId,
      creditedAmount: credited,
      creditedCurrency: currency,
    });
    if (result === "missing") return jsonError("Invoice not found", 404);
    return new Response(null, { status: 200 });
  }

  const outcome = streampayInvoiceOutcome(callback.status);
  if (outcome === "cancelled") {
    await markInvoiceCancelled(callback.externalId, callback.errorMessage ?? callback.status);
  } else if (outcome === "failed") {
    await markInvoiceFailed(callback.externalId, callback.errorMessage ?? callback.status);
  }
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { return jsonError("Invalid JSON", 400); }
  return handleCallback(payload, raw, request);
}

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return handleCallback(params, streampayQueryToSign(params), request);
}
