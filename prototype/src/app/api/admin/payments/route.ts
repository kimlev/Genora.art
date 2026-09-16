import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import {
  validateProvider,
  type FeePayer,
  type InvoiceCurrency,
  type NewProvider,
} from "@/lib/payments/provider-input";
import {
  createPaymentProvider,
  listPaymentMethods,
  listPaymentProviders,
  updatePaymentProvider,
  updateProviderVisibility,
} from "@/lib/server/payments";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const [providers, methods] = await Promise.all([listPaymentProviders(), listPaymentMethods()]);
    return Response.json({ providers, methods });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    console.error("payments_load_failed", error);
    return jsonError("Не удалось загрузить платёжных провайдеров", 500);
  }
}

function readProvider(body: Record<string, unknown> | null): NewProvider {
  const countries = Array.isArray(body?.countryCodes) ? body.countryCodes : [];
  const methods = Array.isArray(body?.methodIds) ? body.methodIds : [];
  return {
    name: typeof body?.name === "string" ? body.name : "",
    checkoutUrl: typeof body?.checkoutUrl === "string" ? body.checkoutUrl.trim() : "",
    countryCodes: countries.filter((code): code is string => typeof code === "string").map((code) => code.toUpperCase()),
    methodIds: methods.filter((id): id is string => typeof id === "string"),
    invoiceCurrency: body?.invoiceCurrency === "national" ? "national" as InvoiceCurrency : "usd",
    feePayer: body?.feePayer === "merchant" ? "merchant" as FeePayer : "client",
    feePercent: typeof body?.feePercent === "number" ? body.feePercent : null,
    enabled: body?.enabled === true,
    clientVisible: body?.clientVisible === true,
    fxRateUrl: typeof body?.fxRateUrl === "string" ? body.fxRateUrl.trim() : "",
    fxRounding: typeof body?.fxRounding === "number" && Number.isInteger(body.fxRounding) ? body.fxRounding : null,
  };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const input = readProvider(body);
    const invalid = validateProvider(input);
    if (invalid) return jsonError(invalid);
    const provider = await createPaymentProvider(input);
    await auditAdmin(request, admin.id, "payments.provider.created", "payment_provider", provider.id, {
      countries: provider.countryCodes.length || "worldwide",
      methods: provider.methods.map((method) => method.id),
      invoiceCurrency: provider.invoiceCurrency,
      feePayer: provider.feePayer,
    });
    return Response.json({ provider });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    if (message === "PROVIDER_EXISTS") return jsonError("Провайдер с таким названием уже есть");
    if (message === "METHOD_MISSING") return jsonError("Один из методов оплаты не найден");
    if (message === "METHOD_REGION") return jsonError("Метод оплаты не работает в выбранном регионе");
    console.error("payments_provider_create_failed", error);
    return jsonError("Не удалось добавить провайдера", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof body?.id !== "string") return jsonError("Не указан провайдер");
    if (typeof body.name === "string") {
      const input = readProvider(body);
      const invalid = validateProvider(input);
      if (invalid) return jsonError(invalid);
      const provider = await updatePaymentProvider(body.id, input);
      await auditAdmin(request, admin.id, "payments.provider.updated", "payment_provider", body.id, {
        countries: provider.countryCodes.length || "worldwide",
        methods: provider.methods.map((method) => method.id),
        invoiceCurrency: provider.invoiceCurrency,
        feePayer: provider.feePayer,
      });
      return Response.json({ provider, providers: await listPaymentProviders() });
    }
    const patch = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      clientVisible: typeof body.clientVisible === "boolean" ? body.clientVisible : undefined,
    };
    if (patch.enabled === undefined && patch.clientVisible === undefined) return jsonError("Нет изменений");
    await updateProviderVisibility(body.id, patch);
    await auditAdmin(request, admin.id, "payments.provider.updated", "payment_provider", body.id, patch);
    return Response.json({ providers: await listPaymentProviders() });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    if (message === "PROVIDER_MISSING") return jsonError("Провайдер не найден");
    if (message === "METHOD_MISSING") return jsonError("Один из методов оплаты не найден");
    if (message === "METHOD_REGION") return jsonError("Метод оплаты не работает в выбранном регионе");
    console.error("payments_provider_update_failed", error);
    return jsonError("Не удалось обновить провайдера", 500);
  }
}
