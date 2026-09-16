import { promptBlockedCopy } from "@/lib/i18n/copy/prompt-blocked";
import { videoReferenceMixUnsupportedCopy } from "@/lib/i18n/copy/video-studio-ui-copy";
import type { Locale } from "@/lib/i18n/types";

const PRIVACY_POLICY_REJECTION = /request blocked due to prohibited content guidelines|inputimagesensitivecontentdetected|sensitivecontentdetected|privacyinformation|privacy (?:policy|check|verification)|(?:identity|person|character).*(?:rights|consent)/i;
const VIDEO_REFERENCE_UNSUPPORTED = /does not accept video input references|video.*(?:image|photo).*reference.*(?:not supported|unsupported)|(?:image|photo).*reference.*video.*(?:not supported|unsupported)/i;

export type PublicErrorCode = "privacy_policy" | "video_reference_unsupported";

export function publicErrorCode(raw: unknown): PublicErrorCode | null {
  const text = raw instanceof Error ? raw.message : String(raw ?? "");
  if (PRIVACY_POLICY_REJECTION.test(text)) return "privacy_policy";
  if (VIDEO_REFERENCE_UNSUPPORTED.test(text)) return "video_reference_unsupported";
  return null;
}

export function isPromptBlocked(text: string): boolean {
  return /\binput blocked\b|\bMODEL_INPUT_BLOCKED\b/i.test(text)
    || /copyright restrictions?|content policy|safety policy|moderation (?:failed|blocked)|prompt could not be processed/i.test(text)
    || Object.values(promptBlockedCopy).some((message) => text.includes(message));
}

// Presentation only: leave other errors and the server's raw failure untouched.
export function promptErrorMessage(text: string, locale: string): string {
  return isPromptBlocked(text)
    ? promptBlockedCopy[locale as keyof typeof promptBlockedCopy] ?? promptBlockedCopy.en
    : text;
}

export function publicErrorMessage(raw: unknown, locale = "ru"): string {
  const text = raw instanceof Error ? raw.message : String(raw ?? "");
  if (isPromptBlocked(text)) return promptErrorMessage(text, locale);
  if (VIDEO_REFERENCE_UNSUPPORTED.test(text)) return videoReferenceMixUnsupportedCopy(locale as Locale);
  // Job failures may contain provider names, internal routes and request ids.
  // None of those implementation details are safe or useful in the product UI.
  return promptBlockedCopy[locale as Locale] ?? promptBlockedCopy.en;
}
