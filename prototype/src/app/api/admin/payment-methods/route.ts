import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { createPaymentMethod, listPaymentMethods, updatePaymentMethod, validateMethodLogo } from "@/lib/server/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { name?: unknown; logoDataUrl?: unknown; countryCodes?: unknown } | null;
    if (typeof body?.name !== "string" || body.name.trim().length < 2) return jsonError("Укажите название метода");
    const logo = typeof body.logoDataUrl === "string" && body.logoDataUrl ? body.logoDataUrl : null;
    if (!logo) return jsonError("Загрузите логотип метода");
    const invalidLogo = validateMethodLogo(logo);
    if (invalidLogo) return jsonError(invalidLogo);
    const countries = (Array.isArray(body.countryCodes) ? body.countryCodes : [])
      .filter((code): code is string => typeof code === "string").map((code) => code.toUpperCase());
    const method = await createPaymentMethod(body.name, logo, countries);
    await auditAdmin(request, admin.id, "payments.method.created", "payment_method", method.id,
      { name: method.name, countries: method.countryCodes.length ? method.countryCodes : "worldwide" });
    return Response.json({ method, methods: await listPaymentMethods() });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    if (message === "METHOD_EXISTS") return jsonError("Метод с таким названием уже есть");
    if (message === "METHOD_NAME") return jsonError("Название метода от 2 до 40 символов");
    if (message === "METHOD_COUNTRY") return jsonError("В списке стран метода есть неизвестный код");
    console.error("payment_method_create_failed", error);
    return jsonError("Не удалось добавить метод оплаты", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as { id?: unknown; name?: unknown; logoDataUrl?: unknown; countryCodes?: unknown } | null;
    if (typeof body?.id !== "string") return jsonError("Не указан метод");
    if (typeof body.name !== "string" || body.name.trim().length < 2) return jsonError("Укажите название метода");
    const logo = typeof body.logoDataUrl === "string" && body.logoDataUrl ? body.logoDataUrl : null;
    if (logo) {
      const invalidLogo = validateMethodLogo(logo);
      if (invalidLogo) return jsonError(invalidLogo);
    }
    const countries = (Array.isArray(body.countryCodes) ? body.countryCodes : [])
      .filter((code): code is string => typeof code === "string").map((code) => code.toUpperCase());
    const method = await updatePaymentMethod(body.id, body.name, logo, countries);
    await auditAdmin(request, admin.id, "payments.method.updated", "payment_method", method.id,
      { name: method.name, countries: method.countryCodes.length ? method.countryCodes : "worldwide" });
    return Response.json({ method, methods: await listPaymentMethods() });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход администратора", 401);
    if (message === "METHOD_MISSING") return jsonError("Метод оплаты не найден");
    if (message === "METHOD_NAME") return jsonError("Название метода от 2 до 40 символов");
    if (message === "METHOD_COUNTRY") return jsonError("В списке стран метода есть неизвестный код");
    console.error("payment_method_update_failed", error);
    return jsonError("Не удалось обновить метод оплаты", 500);
  }
}
