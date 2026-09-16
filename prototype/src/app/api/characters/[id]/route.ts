import { characterUiCopy } from "@/lib/i18n/copy/characters";
import { requestLocale } from "@/lib/i18n/request-locale";
import { archiveUserCharacter } from "@/lib/server/characters";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const copy = characterUiCopy(await requestLocale(new URL(request.url).searchParams.get("locale")));
  if (!isSameOrigin(request)) return jsonError(copy.genericError, 403);
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!id || !await archiveUserCharacter(user.id, id)) return jsonError(copy.genericError, 404);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(copy.genericError, (error as Error).message === "UNAUTHORIZED" ? 401 : 500);
  }
}
