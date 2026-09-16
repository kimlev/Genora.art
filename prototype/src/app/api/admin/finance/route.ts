import { requireAdmin } from "@/lib/server/admin-session";
import { jsonError } from "@/lib/server/http";
import { invoiceFilterOptions, listInvoices, type InvoiceStatusFilter } from "@/lib/server/invoices";

const STATUSES = new Set<InvoiceStatusFilter>(["pending", "paid", "error"]);

export const runtime = "nodejs";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function period(url: URL): { from: string; to: string } {
  const to = url.searchParams.get("to");
  const from = url.searchParams.get("from");
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  return {
    from: from && DAY.test(from) ? from : monthAgo,
    to: to && DAY.test(to) ? to : today,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const { from, to } = period(url);
    const filters = {
      from,
      to,
      currency: url.searchParams.get("currency")?.toUpperCase().slice(0, 3) || undefined,
      providerId: url.searchParams.get("provider") || undefined,
      methodId: url.searchParams.get("method") || undefined,
      status: STATUSES.has(url.searchParams.get("status") as InvoiceStatusFilter)
        ? url.searchParams.get("status") as InvoiceStatusFilter
        : undefined,
    };
    const [{ invoices, totals }, options] = await Promise.all([listInvoices(filters), invoiceFilterOptions()]);
    return Response.json({ period: { from, to }, filters, invoices, totals, options });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("finance_load_failed", error);
    return jsonError("Не удалось загрузить финансы", 500);
  }
}
