import { isSameOrigin, jsonError } from "@/lib/server/http";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { listAdminSystemAgents, saveSystemAgent } from "@/lib/server/system-agents";
import { isSystemAgentTag, type SystemAgentKind } from "@/lib/system-agent-kind";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ items: await listAdminSystemAgents() });
  } catch (error) {
    const unauthorized = (error as Error).message === "ADMIN_UNAUTHORIZED";
    return jsonError(unauthorized ? "Требуется вход" : "Не удалось загрузить агентов", unauthorized ? 401 : 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as {
      id?: unknown;
      name?: unknown;
      description?: unknown;
      kind?: unknown;
      tag?: unknown;
      icon?: unknown;
      coverUrl?: unknown;
      providerId?: unknown;
      modelId?: unknown;
      videoMode?: unknown;
      videoUrl?: unknown;
      videoPreviewUrl?: unknown;
      promptPlaceholder?: unknown;
      referenceInputs?: unknown;
      videoSettings?: unknown;
      systemPrompt?: unknown;
      create?: unknown;
    } | null;
    const kind = body?.kind === "images" || body?.kind === "video" || body?.kind === "text" ? body.kind as SystemAgentKind : null;
    if (!kind) return jsonError("Укажите тип агента");
    const tag = typeof body?.tag === "string" ? body.tag : null;
    if (!isSystemAgentTag(kind, tag)) return jsonError("Укажите корректный тег");
    const saved = await saveSystemAgent({
      id: typeof body?.id === "string" ? body.id : undefined,
      name: String(body?.name ?? ""),
      description: String(body?.description ?? ""),
      kind,
      tag,
      icon: typeof body?.icon === "string" ? body.icon : null,
      coverUrl: typeof body?.coverUrl === "string" ? body.coverUrl : null,
      providerId: typeof body?.providerId === "string" ? body.providerId : null,
      modelId: typeof body?.modelId === "string" ? body.modelId : null,
      videoMode: body?.videoMode === "t2v" || body?.videoMode === "animate" || body?.videoMode === "i2v" || body?.videoMode === "v2v" ? body.videoMode : null,
      videoUrl: typeof body?.videoUrl === "string" ? body.videoUrl : null,
      videoPreviewUrl: typeof body?.videoPreviewUrl === "string" ? body.videoPreviewUrl : null,
      promptPlaceholder: typeof body?.promptPlaceholder === "string" ? body.promptPlaceholder : null,
      referenceInputs: Array.isArray(body?.referenceInputs) ? body.referenceInputs as never[] : [],
      videoSettings: body?.videoSettings && typeof body.videoSettings === "object" ? body.videoSettings as Record<string, unknown> : {},
      systemPrompt: String(body?.systemPrompt ?? ""),
      create: body?.create !== false,
    });
    await auditAdmin(request, admin.id, "system_agent_create", "system_agent", saved.id, { name: saved.name, kind: saved.kind });
    return Response.json({ item: saved }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "ADMIN_UNAUTHORIZED") return jsonError("Требуется вход", 401);
    if ((error as Error).message === "NAME_REQUIRED") return jsonError("Укажите название");
    if ((error as Error).message === "TAG_INVALID") return jsonError("Укажите корректный тег");
    if ((error as Error).message === "VIDEO_MODE_REQUIRED") return jsonError("Укажите режим видео-агента");
    if ((error as Error).message === "VIDEO_MODEL_INVALID") return jsonError("Выбранная модель не поддерживает режим агента");
    if ((error as Error).message === "VIDEO_PREVIEW_REQUIRED") return jsonError("Загрузите видео-превью агента");
    return jsonError("Не удалось создать агента", 500);
  }
}
