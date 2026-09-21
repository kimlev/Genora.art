import { isSameOrigin, jsonError } from "@/lib/server/http";
import { auditAdmin, requireAdmin } from "@/lib/server/admin-session";
import { createYoutubeAuthorization, disconnectYoutube } from "@/lib/server/youtube-oauth";
import {
  approveYoutubePublication,
  createYoutubeProject,
  getYoutubeWorkspace,
  runYoutubeStage,
  saveYoutubeProject,
  saveYoutubeSettings,
} from "@/lib/server/youtube-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  if (message === "ADMIN_UNAUTHORIZED") return ["Требуется вход", 401] as const;
  if (message === "YOUTUBE_PROJECT_FIELDS_REQUIRED") return ["Укажите название и тему проекта", 400] as const;
  if (message === "YOUTUBE_PROJECT_NOT_FOUND") return ["YouTube-проект не найден", 404] as const;
  if (message === "YOUTUBE_AI_NOT_CONFIGURED") return ["Укажите AI provider и model в разделе «Подключение»", 409] as const;
  if (message === "YOUTUBE_OAUTH_NOT_CONFIGURED") return ["OAuth YouTube ещё не настроен на сервере", 409] as const;
  if (message === "YOUTUBE_NOT_CONNECTED" || message === "YOUTUBE_RECONNECT_REQUIRED") return ["Подключите канал YouTube заново", 409] as const;
  if (message === "YOUTUBE_PUBLISH_APPROVAL_REQUIRED") return ["Сначала подтвердите публикацию", 409] as const;
  if (message === "YOUTUBE_VIDEO_ASSET_REQUIRED") return ["Выберите готовое видео Genora", 409] as const;
  if (message === "YOUTUBE_VIDEO_ASSET_NOT_FOUND") return ["Видео Genora не найдено", 404] as const;
  if (message === "YOUTUBE_VIDEO_ASSET_INVALID") return ["Выбранный файл не является видео", 409] as const;
  if (message === "YOUTUBE_PROJECT_NOT_READY") return ["Сначала завершите предыдущие этапы", 409] as const;
  if (message.startsWith("YOUTUBE_STAGE_REQUIRED:")) return [`Сначала завершите этап ${message.split(":")[1]}`, 409] as const;
  if (message.startsWith("YOUTUBE_STAGE_OUT_OF_ORDER:")) return ["Этапы нужно выполнять последовательно", 409] as const;
  return ["Не удалось выполнить операцию YouTube", 500] as const;
}

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getYoutubeWorkspace());
  } catch (error) {
    const [message, status] = errorMessage(error);
    return jsonError(message, status);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonError("Некорректные настройки");
    await saveYoutubeSettings(admin.id, body);
    await auditAdmin(request, admin.id, "youtube_settings_update", "youtube_settings", "default", {
      automationEnabled: body.automationEnabled === true,
      aiProvider: typeof body.aiProvider === "string" ? body.aiProvider : null,
      aiModel: typeof body.aiModel === "string" ? body.aiModel : null,
    });
    return Response.json({ ok: true, ...(await getYoutubeWorkspace()) });
  } catch (error) {
    const [message, status] = errorMessage(error);
    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Недопустимый источник запроса", 403);
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null) as ({ action?: unknown; projectId?: unknown; stage?: unknown } & Record<string, unknown>) | null;
    const action = typeof body?.action === "string" ? body.action : "";
    if (action === "oauth-start") {
      return Response.json({ url: await createYoutubeAuthorization(admin.id) });
    }
    if (action === "create-project") {
      const project = await createYoutubeProject(admin.id, body ?? {});
      await auditAdmin(request, admin.id, "youtube_project_create", "youtube_project", project.id, { title: project.title });
    } else if (action === "save-project") {
      const projectId = String(body?.projectId ?? "");
      await saveYoutubeProject(projectId, body ?? {});
      await auditAdmin(request, admin.id, "youtube_project_update", "youtube_project", projectId);
    } else if (action === "run-stage") {
      const projectId = String(body?.projectId ?? "");
      await runYoutubeStage(projectId, body?.stage, admin.id);
      await auditAdmin(request, admin.id, "youtube_stage_run", "youtube_project", projectId, { stage: body?.stage });
    } else if (action === "approve-publish") {
      const projectId = String(body?.projectId ?? "");
      await approveYoutubePublication(projectId);
      await auditAdmin(request, admin.id, "youtube_publish_approve", "youtube_project", projectId);
    } else if (action === "disconnect") {
      await disconnectYoutube(admin.id);
      await auditAdmin(request, admin.id, "youtube_disconnect", "youtube_settings", "default");
    } else {
      return jsonError("Неизвестная операция");
    }
    return Response.json({ ok: true, ...(await getYoutubeWorkspace()) });
  } catch (error) {
    console.error("admin_youtube_failed", error instanceof Error ? error.message : "unknown");
    const [message, status] = errorMessage(error);
    return jsonError(message, status);
  }
}
