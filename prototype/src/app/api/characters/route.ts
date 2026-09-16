import { after } from "next/server";
import { characterUiCopy } from "@/lib/i18n/copy/characters";
import { requestLocale } from "@/lib/i18n/request-locale";
import { publicGenerationJob } from "@/lib/server/generation-jobs";
import { executeImageJob } from "@/lib/server/image-jobs";
import { isSameOrigin, jsonError, jsonTopUpError } from "@/lib/server/http";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { createCharacterGeneration, listUserCharacters } from "@/lib/server/characters";
import { topUpBalanceFromError } from "@/lib/server/paid-balance";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";

export const runtime = "nodejs";
export const maxDuration = 720;

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await listUserCharacters(user.id));
  } catch (error) {
    return new Response(null, { status: (error as Error).message === "UNAUTHORIZED" ? 401 : 502 });
  }
}

export async function POST(request: Request) {
  let locale = await requestLocale();
  if (!isSameOrigin(request)) return jsonError(characterUiCopy(locale).genericError, 403);
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof body?.locale === "string") locale = await requestLocale(body.locale);
    const copy = characterUiCopy(locale);
    const allowed = await consumeRateLimit({ scope: "character-generation", identifier: user.id, limit: 5, windowSeconds: 60 * 60 });
    if (!allowed) return jsonError(copy.genericError, 429);
    const kind = body?.kind === "ai" ? "ai" : "personal";
    if (kind === "personal" && body?.consent !== true) return jsonError(copy.consentError, 400);
    const created = await createCharacterGeneration({
      userId: user.id,
      locale,
      kind,
      description: typeof body?.description === "string" ? body.description : "",
      name: typeof body?.name === "string" ? body.name : "",
      images: Array.isArray(body?.images) ? body.images.filter((item): item is string => typeof item === "string") : [],
      consentConfirmed: body?.consent === true,
    });
    after(() => executeImageJob(created.executeInput));
    return Response.json({ character: created.character, job: publicGenerationJob(created.job), balanceTokens: created.job.balanceTokens }, { status: 202 });
  } catch (error) {
    const message = (error as Error).message;
    const copy = characterUiCopy(locale);
    if (message === "UNAUTHORIZED") return jsonError(copy.genericError, 401);
    if (message === "CHARACTER_NAME_INVALID") return jsonError(copy.nameError, 400);
    if (message === "CHARACTER_PHOTOS_REQUIRED") return jsonError(copy.photosError, 400);
    if (message === "CHARACTER_DESCRIPTION_REQUIRED") return jsonError(copy.descriptionError, 400);
    if (message === "CONSENT_REQUIRED") return jsonError(copy.consentError, 400);
    if (message === "CHARACTER_LIMIT_REACHED") return jsonError(copy.limitError, 409);
    if (message === "CHARACTER_MODEL_UNAVAILABLE") return jsonError(copy.genericError, 409);
    const topUp = topUpBalanceFromError(error);
    if (topUp !== undefined) return jsonTopUpError(apiAppCopy(locale).topUpToSeeAnswer, topUp);
    console.error("character_generation_failed", message);
    return jsonError(copy.genericError, 502);
  }
}
