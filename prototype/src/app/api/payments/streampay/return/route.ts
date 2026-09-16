import { withLocalePath } from "@/lib/i18n/locale-path";
import { defaultRequestLocale, isRequestLocale, type Locale } from "@/lib/locale-from-request";
import { streampayReturnInvoice, streampayReturnPayment } from "@/lib/payments/streampay";
import { LOCALE_COOKIE } from "@/lib/seo";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { markInvoiceCancelled, markInvoiceFailed } from "@/lib/server/invoices";
import { query } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";

export const runtime = "nodejs";

function appBase(request: Request): string {
  return (process.env.APP_BASE_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
}

function localeFrom(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : "";
  return isRequestLocale(value) ? value : defaultRequestLocale;
}

function balanceRedirect(request: Request, params: URLSearchParams): Response {
  const payment = streampayReturnPayment({ payment: params.get("payment"), status: params.get("status") }) ?? "success";
  const invoice = streampayReturnInvoice({ invoice: params.get("invoice"), external_id: params.get("external_id") });
  const dest = new URL(withLocalePath("/profile/balance", localeFrom(request)), `${appBase(request)}/`);
  dest.searchParams.set("payment", payment);
  if (invoice) dest.searchParams.set("invoice", invoice);
  return Response.redirect(dest, 303);
}

async function paramsFrom(request: Request): Promise<URLSearchParams> {
  const params = new URL(request.url).searchParams;
  if (request.method !== "POST") return params;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await request.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string" && value && !params.has(key)) params.set(key, value);
    }
  }
  return params;
}

/** StreamPay возвращает браузер сюда (GET или POST) — уводим на страницу баланса с языком. */
export async function GET(request: Request) {
  return balanceRedirect(request, new URL(request.url).searchParams);
}

/** Пользователь вернулся с fail_url / cancel_url StreamPay — фиксируем статус своего счёта. */
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json") && isSameOrigin(request)) {
    try {
      const user = await requireUser();
      const body = await request.json().catch(() => null) as { invoice?: unknown; outcome?: unknown } | null;
      const invoice = typeof body?.invoice === "string" ? body.invoice.trim() : "";
      const outcome = body?.outcome === "cancelled" ? "cancelled" : body?.outcome === "failed" ? "failed" : null;
      if (!invoice || !outcome) return jsonError("Не указан счёт", 400);
      const rows = await query<{ number: string }>(
        "SELECT number FROM payment_invoices WHERE number=$1 AND user_id=$2 AND status='issued'",
        [invoice, user.id],
      );
      if (!rows.length) return Response.json({ ok: true });
      if (outcome === "cancelled") await markInvoiceCancelled(invoice, "cancel");
      else await markInvoiceFailed(invoice, "fail");
      return Response.json({ ok: true });
    } catch (error) {
      if ((error as Error).message === "UNAUTHORIZED") return jsonError("Требуется вход", 401);
      console.error("streampay_return_failed", error);
      return jsonError("Не удалось обновить счёт", 500);
    }
  }
  return balanceRedirect(request, await paramsFrom(request));
}
