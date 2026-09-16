import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { estimateAttachmentInputTokens, resolveReportedChatUsage } from "../src/lib/chat-attachments.ts";
import {
  isVideoPromptAgent,
  VIDEO_PROMPT_DEFAULT_MODEL,
  VIDEO_PROMPT_CONTACT_SHEET_FPS,
  VIDEO_PROMPT_CONTACT_SHEET_FRAMES,
  VIDEO_PROMPT_MAX_CONTACT_SHEET_IMAGES,
  VIDEO_PROMPT_HIDDEN_INSTRUCTION,
  VIDEO_PROMPT_MODEL_INSTRUCTION,
  VIDEO_PROMPT_MODELS,
  VIDEO_PROMPT_PROVIDER,
  VIDEO_PROMPT_PROVIDERS,
  VIDEO_PROMPT_SECOND_MODEL,
  videoPromptAlternateModel,
  videoPromptDefaultModel,
  videoPromptDisplayContent,
  videoPromptContactSheetInstruction,
  videoPromptContactSheetPageSizes,
  videoPromptFpsFromAnalysis,
  videoPromptHint,
  videoPromptModelAllowed,
  videoPromptDepthForModel,
  videoPromptProviderForModel,
  videoPromptRequestContent,
  videoPromptUsesContactSheets,
} from "../src/lib/video-prompt-agent.ts";
import { agents, getAgentById } from "../src/lib/mock/agents.ts";
import { isSystemAgentTag, systemAgentKind, systemAgentTag } from "../src/lib/system-agent-kind.ts";
import {
  aggregateVideoPromptWorkflowResults,
  VIDEO_PROMPT_AUDIO_ANALYSIS_INSTRUCTION,
  VIDEO_PROMPT_AUDIO_MODEL,
  VIDEO_PROMPT_AUDIO_PROVIDER,
  VIDEO_PROMPT_CUT_DETECTION_INSTRUCTION,
  videoPromptComposerInstruction,
  videoPromptVisualAnalysisInstruction,
} from "../src/lib/server/video-prompt-sol-workflow.ts";

test("VideoPromt offers four recommended models and keeps the hidden instruction", () => {
  assert.equal(isVideoPromptAgent("video-promt"), true);
  assert.equal(isVideoPromptAgent("photo-to-prompt"), false);
  assert.deepEqual([...VIDEO_PROMPT_MODELS], [
    "gemini-3.8-flash",
    "gpt-5.6-sol",
    "gemini-3.7-flash",
    "qwen3.8-max",
  ]);
  assert.equal(VIDEO_PROMPT_DEFAULT_MODEL, "gemini-3.8-flash");
  assert.equal(VIDEO_PROMPT_PROVIDER, "Google");
  assert.equal(VIDEO_PROMPT_SECOND_MODEL, "gpt-5.6-sol");
  assert.deepEqual([...VIDEO_PROMPT_PROVIDERS], ["OpenAI", "Google", "Alibaba"]);
  assert.equal(videoPromptModelAllowed("gemini-3.8-flash"), true);
  assert.equal(videoPromptModelAllowed("gemini-3.7-flash"), true);
  assert.equal(videoPromptModelAllowed("gpt-5.4"), false);
  assert.equal(videoPromptDefaultModel(["gemini-3.8-flash", "gpt-5.6-sol"]), VIDEO_PROMPT_DEFAULT_MODEL);
  assert.equal(videoPromptDefaultModel(["gpt-5.6-sol"]), "gpt-5.6-sol");
  assert.equal(videoPromptProviderForModel("qwen3.8-max"), "Alibaba");
  assert.equal(videoPromptProviderForModel("gemini-3.7-flash"), "Google");
  assert.equal(videoPromptDepthForModel("gpt-5.6-sol"), "deep");
  assert.equal(videoPromptDepthForModel("gemini-3.8-flash"), "deep");
  assert.equal(videoPromptHint("en"), "describe the clip as a prompt for video generation");
  assert.equal(videoPromptDisplayContent(""), VIDEO_PROMPT_HIDDEN_INSTRUCTION);
  assert.equal(videoPromptDisplayContent("  короче  ", "ru"), `${VIDEO_PROMPT_HIDDEN_INSTRUCTION}\n\nкороче`);
  assert.equal(videoPromptDisplayContent(VIDEO_PROMPT_HIDDEN_INSTRUCTION, "ru"), VIDEO_PROMPT_HIDDEN_INSTRUCTION);
  assert.equal(videoPromptDisplayContent("", "en"), videoPromptHint("en"));
  assert.equal(videoPromptDisplayContent("shorter", "en"), `${videoPromptHint("en")}\n\nshorter`);
  assert.equal(videoPromptRequestContent(""), VIDEO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(videoPromptRequestContent(VIDEO_PROMPT_HIDDEN_INSTRUCTION), VIDEO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(videoPromptRequestContent("  короче  "), VIDEO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(videoPromptRequestContent(`${VIDEO_PROMPT_HIDDEN_INSTRUCTION}\n\nкороче`), VIDEO_PROMPT_MODEL_INSTRUCTION);
  assert.match(VIDEO_PROMPT_MODEL_INSTRUCTION, /Accuracy is more important than brevity/);
  assert.match(VIDEO_PROMPT_MODEL_INSTRUCTION, /ACTION TIMELINE/);
  assert.match(VIDEO_PROMPT_MODEL_INSTRUCTION, /FINAL VIDEO GENERATION PROMPT/);
  assert.equal(getAgentById("video-promt")?.systemPrompt, VIDEO_PROMPT_MODEL_INSTRUCTION);
  assert.equal(videoPromptAlternateModel(VIDEO_PROMPT_DEFAULT_MODEL), VIDEO_PROMPT_SECOND_MODEL);
  assert.equal(videoPromptAlternateModel(VIDEO_PROMPT_SECOND_MODEL, [...VIDEO_PROMPT_MODELS]), VIDEO_PROMPT_DEFAULT_MODEL);
});

test("Sol receives contact sheets instead of the original video while Gemini and Qwen keep the video", async () => {
  assert.equal(VIDEO_PROMPT_CONTACT_SHEET_FPS, 24);
  assert.equal(VIDEO_PROMPT_CONTACT_SHEET_FRAMES, 24);
  assert.equal(VIDEO_PROMPT_MAX_CONTACT_SHEET_IMAGES, 8);
  assert.deepEqual(videoPromptContactSheetPageSizes(15), [2, 2, 2, 2, 2, 2, 2, 1]);
  assert.deepEqual(videoPromptContactSheetPageSizes(9), [2, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(videoPromptContactSheetPageSizes(8), [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(videoPromptContactSheetPageSizes(0), []);
  assert.equal(videoPromptUsesContactSheets("gpt-5.6-sol"), true);
  assert.equal(videoPromptUsesContactSheets("gemini-3.8-flash"), false);
  assert.equal(videoPromptUsesContactSheets("qwen3.8-max"), false);
  const instruction = videoPromptContactSheetInstruction([15], 8);
  assert.match(instruction, /24 consecutive frames sampled at 24 FPS/);
  assert.match(instruction, /6-column by 4-row grid/);
  assert.match(instruction, /video itself is not sent to the model/);
  assert.match(instruction, /Attached image files: 8 \(maximum 8\)/);
  assert.match(instruction, /Video 1: 15 contact sheets/);

  const service = await readFile(new URL("../src/lib/server/chat-service.ts", import.meta.url), "utf8");
  const contactSheets = await readFile(new URL("../src/lib/server/video-prompt-contact-sheets.ts", import.meta.url), "utf8");
  assert.match(service, /videoPromptUsesContactSheets\(input\.modelId\)/);
  assert.match(service, /replaceVideosWithContactSheets/);
  assert.match(contactSheets, /return packedSheets/);
  assert.match(contactSheets, /tile=\$\{TILE_COLUMNS\}x\$\{TILE_ROWS\}:nb_frames=\$\{VIDEO_PROMPT_CONTACT_SHEET_FRAMES\}/);
  assert.match(contactSheets, /packContactSheets\(sheetGroups\.flat\(\)\)/);
  assert.match(contactSheets, /VIDEO_PROMPT_MAX_CONTACT_SHEET_IMAGES/);
  assert.match(contactSheets, /xstack=inputs=\$\{sheets\.length\}/);
  assert.doesNotMatch(contactSheets, /import\("sharp"\)/);
  assert.doesNotMatch(contactSheets, /360/);
});

test("Sol VideoPromt performs four private passes and exposes one aggregated result", async () => {
  assert.equal(VIDEO_PROMPT_AUDIO_PROVIDER, "alibaba");
  assert.equal(VIDEO_PROMPT_AUDIO_MODEL, "qwen3.5-omni-plus");
  assert.match(VIDEO_PROMPT_CUT_DETECTION_INSTRUCTION, /Can frame B be reached from frame A/);
  assert.match(VIDEO_PROMPT_CUT_DETECTION_INSTRUCTION, /TOTAL PHYSICAL SHOTS/);
  assert.match(videoPromptVisualAnalysisInstruction("CUT 1 — 00:01.0"), /LOCKED CONSTRAINTS/);
  assert.match(VIDEO_PROMPT_AUDIO_ANALYSIS_INSTRUCTION, /speech: exact verbatim words/);
  assert.match(VIDEO_PROMPT_AUDIO_ANALYSIS_INSTRUCTION, /music: start\/end/);
  assert.match(videoPromptComposerInstruction({ cuts: "cuts", visual: "visual", audio: "audio" }), /output only the final prompt/);

  const makeResult = (index, model, cost) => ({
    id: `result-${index}`,
    provider: index === 3 ? "alibaba" : "openai",
    model,
    choices: [{ message: { role: "assistant", content: `pass ${index}` } }],
    usage: {
      prompt_tokens: index * 100,
      cached_prompt_tokens: index * 10,
      completion_tokens: index * 20,
      thinking_tokens: index * 5,
      total_tokens: index * 120,
      cost_usd: cost,
      tool_cost_usd: index / 100,
      web_search_calls: 0,
      input_per_1m_usd: 1,
      cached_input_per_1m_usd: null,
      output_per_1m_usd: 2,
    },
    meta: { model_label: model, latency_ms: index * 1_000 },
  });
  const final = aggregateVideoPromptWorkflowResults([
    makeResult(1, "gpt-5.6-sol", 0.1),
    makeResult(2, "gpt-5.6-sol", 0.2),
    makeResult(3, "qwen3.5-omni-plus", 0.3),
    makeResult(4, "gpt-5.6-sol", 0.4),
  ]);
  assert.equal(final.id, "result-4");
  assert.equal(final.model, "gpt-5.6-sol");
  assert.equal(final.choices[0].message.content, "pass 4");
  assert.equal(final.usage.prompt_tokens, 1_000);
  assert.equal(final.usage.completion_tokens, 200);
  assert.equal(final.usage.cost_usd, 1);
  assert.equal(final.meta.latency_ms, 10_000);

  const workflow = await readFile(new URL("../src/lib/server/video-prompt-sol-workflow.ts", import.meta.url), "utf8");
  assert.equal((workflow.match(/await integratorChat\(\{/g) ?? []).length, 4);
  assert.doesNotMatch(workflow, /agentId:/);
  assert.doesNotMatch(workflow, /videoFps:/);
});

test("partner-internal chat models never enter the public Genora.art catalog", async () => {
  const sync = await readFile(new URL("../src/lib/server/catalog-sync.ts", import.meta.url), "utf8");
  const integrator = await readFile(new URL("../src/lib/server/integrator.ts", import.meta.url), "utf8");
  assert.match(integrator, /usage_policy\?:/);
  assert.match(sync, /usage_policy\?\.resale_allowed !== false/);
  assert.match(sync, /INTERNAL_ONLY_CHAT_MODEL_IDS = new Set\(\["qwen3\.5-omni-plus"\]\)/);
  assert.match(sync, /internalModelIds\.has\(model\.id\)/);
  assert.match(sync, /for \(const model of publicModels\)/);
});

test("VideoPromt derives FPS from IntegratorAI for Gemini and Wan/Qwen", async () => {
  const geminiPolicy = {
    accepts_video_fps: true,
    video_fps: { min_exclusive: 0, max_inclusive: 24, default: 24 },
  };
  const qwenPolicy = {
    accepts_video_fps: true,
    video_fps: { min_inclusive: 0.1, max_inclusive: 10, default: 10 },
  };
  assert.equal(videoPromptFpsFromAnalysis(geminiPolicy), 24);
  assert.equal(videoPromptFpsFromAnalysis(qwenPolicy), 10);
  assert.equal(videoPromptFpsFromAnalysis(null), undefined);

  const service = await readFile(new URL("../src/lib/server/chat-service.ts", import.meta.url), "utf8");
  const integrator = await readFile(new URL("../src/lib/server/integrator.ts", import.meta.url), "utf8");
  const catalogSync = await readFile(new URL("../src/lib/server/catalog-sync.ts", import.meta.url), "utf8");
  assert.match(service, /videoFps:\s*prepared\.videoFps/);
  assert.match(service, /videoPromptFpsFromAnalysis/);
  assert.match(catalogSync, /videoInputAnalysis:\s*model\.video_input_analysis/);
  assert.match(integrator, /video_fps:\s*input\.videoFps/);
  assert.doesNotMatch(service, /isVideoPromptAgent\(input\.agentId\)\s*\?\s*24/);
  assert.doesNotMatch(service, /forceSubprocessor|force_subprocessor/);
});

test("video attachment estimates input tokens when the provider reports none", () => {
  const tokens = estimateAttachmentInputTokens([
    { name: "clip.mp4", mime: "video/mp4", kind: "video", dataBase64: "A".repeat(800_000) },
  ]);
  assert.ok(tokens >= 300);
  const fromIntegrator = resolveReportedChatUsage({
    promptTokens: 5_381,
    completionTokens: 876,
    estimatedInputTokens: tokens,
  });
  assert.equal(fromIntegrator.inputTokens, 5_381);
  assert.equal(fromIntegrator.outputTokens, 876);
  const fromEstimate = resolveReportedChatUsage({
    promptTokens: 0,
    completionTokens: 0,
    estimatedInputTokens: tokens,
    answerLength: 400,
  });
  assert.equal(fromEstimate.inputTokens, tokens);
  assert.ok(fromEstimate.outputTokens >= 32);
});

test("every catalog agent has a unique id and a valid admin classification", () => {
  const ids = agents.map((agent) => agent.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const agent of agents) {
    const kind = systemAgentKind(agent);
    const tag = systemAgentTag(agent);
    assert.equal(isSystemAgentTag(kind, tag), true, `${agent.id}: ${kind}/${tag}`);
  }
});

test("VideoPromt remains a chat analysis agent in the admin catalog", () => {
  const agent = getAgentById("video-promt");
  assert.ok(agent);
  assert.equal(systemAgentKind(agent), "text");
  assert.equal(systemAgentTag(agent), "analysis");
});
