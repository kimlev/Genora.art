import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { ChatAttachmentPayload } from "@/lib/chat-attachments";
import type { IntegratorChatResult, IntegratorMessageContent } from "./integrator";
import { integratorAckRequest, integratorChat } from "./integrator";

export const VIDEO_PROMPT_AUDIO_PROVIDER = "alibaba";
export const VIDEO_PROMPT_AUDIO_MODEL = "qwen3.5-omni-plus";

export const VIDEO_PROMPT_CUT_DETECTION_INSTRUCTION = `PHYSICAL CUT DETECTION PASS

Your only task is to identify physical editing cuts.

Do NOT describe the video yet.

Compare every pair of temporally adjacent frames/states.

For each transition ask:

"Can frame B be reached from frame A by physically continuous camera motion, subject motion, lens change, focus change, exposure change, or VFX progression within the available time?"

If YES: same physical shot.
If NO: mark a physical cut.

A transition MUST be considered a cut candidate when there is an instantaneous discontinuity in any of these:
- focal target
- framing scale
- camera position
- camera height
- camera angle
- perspective geometry
- subject scale
- subject position
- background geometry
- body orientation
- wardrobe/accessories
- depth relationship
- lens perspective

Important: a smooth semantic relationship does NOT mean continuity.

Examples of likely cuts:
FACE CLOSE-UP → CHEST DETAIL
CHEST DETAIL → COAT FABRIC
COAT FABRIC → CUFF MACRO

unless intermediate frames visibly connect them.

Do not infer a tilt, pan, push-in, pull-back or reframe unless intermediate frames visibly demonstrate that motion.

For every suspected cut inspect frames immediately before and after it.

Output only:

CUT 1 — timestamp
Reason: ...

CUT 2 — timestamp
Reason: ...

TOTAL PHYSICAL SHOTS: N`;

export function videoPromptVisualAnalysisInstruction(cuts: string) {
  return `VISUAL ANALYSIS PASS

The physical cut boundaries below are LOCKED CONSTRAINTS. Do not merge, remove, move, or reinterpret them. Analyze every physical shot between those boundaries independently.

For every shot provide:
- exact start and end timestamp
- focal target and framing scale
- camera position, height, angle, movement, speed and lens perspective
- subject position, scale, body orientation, pose, motion, wardrobe and accessories
- background geometry and depth relationships
- lighting, exposure, focus and visible VFX progression
- the exact visual transition into the next shot

Use adjacent frames to distinguish continuous motion from a cut. Do not invent motion that is not visibly supported. Do not analyze or invent audio. Do not write the final generation prompt.

Output only a VISUAL SHOT TIMELINE.

LOCKED PHYSICAL CUTS:
${cuts}`;
}

export const VIDEO_PROMPT_AUDIO_ANALYSIS_INSTRUCTION = `AUDIO ANALYSIS PASS

Analyze only the native soundtrack of the attached complete video. Do not analyze the image.

Build a chronological audio timeline using timestamps accurate to 0.1 second, or the finest accuracy that can be verified from the source. For every audible interval identify:
- speech: exact verbatim words, language, and speaker when identifiable
- chants, crowd calls, slogans, vocalizations and reactions
- music: start/end, genre or style, instrumentation, rhythm, intensity and important changes
- sound effects and physical action sounds
- ambient and environmental sound
- silence, fades, overlaps and transitions between sound layers

Do not invent unclear words or sounds. Mark uncertain fragments explicitly as [unclear]. Preserve the exact language of spoken phrases. Do not describe visuals except when needed to identify the audible source.

Output only:
AUDIO TIMELINE
HH:MM:SS.s–HH:MM:SS.s — ...`;

export function videoPromptComposerInstruction(input: { cuts: string; visual: string; audio: string }) {
  return `FINAL COMPOSER PASS

Using the locked physical cuts, visual shot timeline and audio timeline below, follow the system agent instruction and write the final generation-ready video prompt.

Requirements:
- preserve every locked physical shot boundary and exact timecode
- combine visual action, camera behavior and synchronized audio into one coherent chronological specification
- preserve exact spoken phrases and visible text
- do not merge rapid inserts or replace physical cuts with imagined camera movement
- obey the output structure and limits required by the system agent instruction
- output only the final prompt; never mention these analysis passes, contact sheets, locked constraints or internal models

LOCKED PHYSICAL CUTS:
${input.cuts}

VISUAL SHOT TIMELINE:
${input.visual}

AUDIO TIMELINE:
${input.audio}`;
}

type WorkflowInput = {
  provider: string;
  model: string;
  systemMessages: Array<{ role: "system"; content: IntegratorMessageContent }>;
  contactSheets: ChatAttachmentPayload[];
  originalVideos: ChatAttachmentPayload[];
  contactSheetInstruction: string;
  reasoning?: string;
  chatId: string;
  memoryDepth: "shallow" | "standard" | "deep";
  source: string;
  timezone?: string;
  maxOutputTokens: number;
  timeoutMs?: number;
  requestId?: string;
};

function requestIdForPass(workflowId: string, pass: number) {
  const bytes = Buffer.from(createHash("sha256").update(`${workflowId}:video-promt:${pass}`).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function fileParts(attachments: ChatAttachmentPayload[]): Exclude<IntegratorMessageContent, string> {
  return attachments.map((item) => ({
    type: "file" as const,
    file: { filename: item.name, mime: item.mime, data_base64: item.dataBase64 },
  }));
}

function userMessage(
  text: string,
  attachments: ChatAttachmentPayload[] = [],
): { role: "user"; content: IntegratorMessageContent } {
  const files = fileParts(attachments);
  return {
    role: "user" as const,
    content: files.length ? [{ type: "text" as const, text }, ...files] : text,
  };
}

function requiredContent(result: IntegratorChatResult, pass: string) {
  const value = result.choices[0]?.message.content?.trim() ?? "";
  if (!value) throw new Error(`VIDEO_PROMPT_${pass}_EMPTY`);
  return value;
}

async function acknowledgeIntermediate(requestId: string) {
  try {
    await integratorAckRequest(requestId);
  } catch (error) {
    console.error("video_prompt_intermediate_ack_failed", requestId, error instanceof Error ? error.message : "unknown");
  }
}

export function aggregateVideoPromptWorkflowResults(results: IntegratorChatResult[]): IntegratorChatResult {
  const final = results.at(-1);
  if (!final) throw new Error("VIDEO_PROMPT_WORKFLOW_EMPTY");
  const sum = (pick: (result: IntegratorChatResult) => number | null | undefined) => results.reduce((total, result) => {
    const value = Number(pick(result));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
  return {
    ...final,
    usage: {
      ...final.usage,
      prompt_tokens: sum((item) => item.usage.prompt_tokens),
      cached_prompt_tokens: sum((item) => item.usage.cached_prompt_tokens),
      completion_tokens: sum((item) => item.usage.completion_tokens),
      thinking_tokens: sum((item) => item.usage.thinking_tokens),
      total_tokens: sum((item) => item.usage.total_tokens),
      cost_usd: sum((item) => item.usage.cost_usd),
      average_request_cost_usd: null,
      tool_cost_usd: sum((item) => item.usage.tool_cost_usd),
      web_search_calls: sum((item) => item.usage.web_search_calls),
    },
    meta: {
      ...final.meta,
      latency_ms: sum((item) => item.meta.latency_ms),
    },
  };
}

/** Four internal model calls become one final result and one Genora.art usage entry. */
export async function runSolVideoPromptWorkflow(input: WorkflowInput): Promise<IntegratorChatResult> {
  const workflowId = input.requestId ?? randomUUID();
  const passRequestIds = [1, 2, 3].map((pass) => requestIdForPass(workflowId, pass));
  const finalRequestId = input.requestId ?? requestIdForPass(workflowId, 4);
  const common = {
    chatId: input.chatId.slice(0, 120),
    memoryDepth: input.memoryDepth,
    timezone: input.timezone,
    maxOutputTokens: input.maxOutputTokens,
    timeoutMs: input.timeoutMs,
    webSearch: false,
  } as const;

  const cutDetection = await integratorChat({
    ...common,
    provider: input.provider,
    model: input.model,
    messages: [userMessage(`${input.contactSheetInstruction}\n\n${VIDEO_PROMPT_CUT_DETECTION_INSTRUCTION}`, input.contactSheets)],
    reasoning: input.reasoning,
    source: `${input.source} · VideoPromt cuts`.slice(0, 120),
    requestId: passRequestIds[0],
  });
  const cuts = requiredContent(cutDetection, "CUT_DETECTION");
  await acknowledgeIntermediate(passRequestIds[0]);

  const visualAnalysis = await integratorChat({
    ...common,
    provider: input.provider,
    model: input.model,
    messages: [userMessage(`${input.contactSheetInstruction}\n\n${videoPromptVisualAnalysisInstruction(cuts)}`, input.contactSheets)],
    reasoning: input.reasoning,
    source: `${input.source} · VideoPromt visuals`.slice(0, 120),
    requestId: passRequestIds[1],
  });
  const visual = requiredContent(visualAnalysis, "VISUAL_ANALYSIS");
  await acknowledgeIntermediate(passRequestIds[1]);

  const audioAnalysis = await integratorChat({
    ...common,
    provider: VIDEO_PROMPT_AUDIO_PROVIDER,
    model: VIDEO_PROMPT_AUDIO_MODEL,
    messages: [userMessage(VIDEO_PROMPT_AUDIO_ANALYSIS_INSTRUCTION, input.originalVideos)],
    source: `${input.source} · VideoPromt audio`.slice(0, 120),
    requestId: passRequestIds[2],
  });
  const audio = requiredContent(audioAnalysis, "AUDIO_ANALYSIS");
  await acknowledgeIntermediate(passRequestIds[2]);

  const composer = await integratorChat({
    ...common,
    provider: input.provider,
    model: input.model,
    messages: [
      ...input.systemMessages,
      userMessage(videoPromptComposerInstruction({
        cuts,
        visual,
        audio,
      })),
    ],
    reasoning: input.reasoning,
    source: input.source.slice(0, 120),
    requestId: finalRequestId,
  });
  requiredContent(composer, "COMPOSER");

  return aggregateVideoPromptWorkflowResults([cutDetection, visualAnalysis, audioAnalysis, composer]);
}
