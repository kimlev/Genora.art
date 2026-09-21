import "server-only";

import { query } from "@/lib/server/db";
import { integratorChat } from "@/lib/server/integrator";
import { loadMediaAsset } from "@/lib/server/media-assets";
import { uploadYoutubeVideo, youtubeApi, youtubeConnectionRequirements } from "@/lib/server/youtube-oauth";

export const YOUTUBE_STAGES = ["research", "plan", "script", "package", "production", "publish", "analytics"] as const;
export type YoutubeStage = typeof YOUTUBE_STAGES[number];

type SettingsRow = {
  channel_id: string | null;
  channel_title: string | null;
  channel_handle: string | null;
  token_expires_at: string | null;
  scopes: string[];
  ai_provider: string | null;
  ai_model: string | null;
  default_language: string;
  default_privacy: "private" | "unlisted" | "public";
  default_category_id: string;
  timezone: string;
  research_queries: string[];
  automation_enabled: boolean;
  research_interval_hours: number;
  analytics_interval_hours: number;
  next_research_at: string | null;
  next_analytics_at: string | null;
  connected: boolean;
};

type ProjectRow = {
  id: string;
  title: string;
  topic: string;
  target_audience: string;
  goal: string;
  language: string;
  status: string;
  current_stage: YoutubeStage | "done";
  video_asset_id: string | null;
  scheduled_at: string | null;
  publish_approved_at: string | null;
  published_video_id: string | null;
  published_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type RunRow = {
  id: string;
  project_id: string;
  stage: YoutubeStage;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

const SETTINGS_SELECT = `channel_id,channel_title,channel_handle,token_expires_at,scopes,
  ai_provider,ai_model,default_language,default_privacy,default_category_id,timezone,research_queries,
  automation_enabled,research_interval_hours,analytics_interval_hours,next_research_at,next_analytics_at,
  (access_token_encrypted IS NOT NULL) connected`;

const PROJECT_SELECT = `id,title,topic,target_audience,goal,language,status,current_stage,video_asset_id,
  scheduled_at,publish_approved_at,published_video_id,published_url,metadata,created_at,updated_at`;

function publicSettings(row: SettingsRow) {
  return {
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    channelHandle: row.channel_handle,
    connected: row.connected,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes ?? [],
    aiProvider: row.ai_provider ?? "",
    aiModel: row.ai_model ?? "",
    defaultLanguage: row.default_language,
    defaultPrivacy: row.default_privacy,
    defaultCategoryId: row.default_category_id,
    timezone: row.timezone,
    researchQueries: row.research_queries ?? [],
    automationEnabled: row.automation_enabled,
    researchIntervalHours: row.research_interval_hours,
    analyticsIntervalHours: row.analytics_interval_hours,
    nextResearchAt: row.next_research_at,
    nextAnalyticsAt: row.next_analytics_at,
  };
}

function publicProject(row: ProjectRow, runs: RunRow[]) {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    targetAudience: row.target_audience,
    goal: row.goal,
    language: row.language,
    status: row.status,
    currentStage: row.current_stage,
    videoAssetId: row.video_asset_id,
    scheduledAt: row.scheduled_at,
    publishApprovedAt: row.publish_approved_at,
    publishedVideoId: row.published_video_id,
    publishedUrl: row.published_url,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runs: runs.filter((run) => run.project_id === row.id).map((run) => ({
      id: run.id,
      stage: run.stage,
      status: run.status,
      input: run.input,
      output: run.output,
      error: run.error,
      startedAt: run.started_at,
      completedAt: run.completed_at,
    })),
  };
}

async function settingsRow() {
  const rows = await query<SettingsRow>(`SELECT ${SETTINGS_SELECT} FROM youtube_settings WHERE id='default'`);
  if (!rows[0]) throw new Error("YOUTUBE_SETTINGS_MISSING");
  return rows[0];
}

export async function getYoutubeWorkspace() {
  const [settings, projects, runs, assets] = await Promise.all([
    settingsRow(),
    query<ProjectRow>(`SELECT ${PROJECT_SELECT} FROM youtube_projects ORDER BY updated_at DESC LIMIT 100`),
    query<RunRow>(`SELECT id,project_id,stage,status,input,output,error,started_at,completed_at
      FROM youtube_stage_runs ORDER BY started_at DESC LIMIT 500`),
    query<{ id: string; mime: string; byte_length: number }>(
      "SELECT id,mime,byte_length FROM media_assets WHERE kind='video' ORDER BY id DESC LIMIT 100",
    ).catch(() => []),
  ]);
  return {
    settings: publicSettings(settings),
    requirements: youtubeConnectionRequirements(),
    projects: projects.map((project) => publicProject(project, runs)),
    videoAssets: assets.map((asset) => ({ id: asset.id, mime: asset.mime, bytes: Number(asset.byte_length) || 0 })),
    stages: YOUTUBE_STAGES,
  };
}

function text(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function int(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

export async function saveYoutubeSettings(adminId: string, input: Record<string, unknown>) {
  const privacy = input.defaultPrivacy === "public" || input.defaultPrivacy === "unlisted" ? input.defaultPrivacy : "private";
  const queries = Array.isArray(input.researchQueries)
    ? input.researchQueries.map((item) => text(item, 160)).filter(Boolean).slice(0, 25)
    : [];
  await query(
    `UPDATE youtube_settings SET ai_provider=$1,ai_model=$2,default_language=$3,default_privacy=$4,
      default_category_id=$5,timezone=$6,research_queries=$7,automation_enabled=$8,
      research_interval_hours=$9,analytics_interval_hours=$10,
      next_research_at=CASE WHEN $8 THEN COALESCE(next_research_at,now()) ELSE null END,
      next_analytics_at=CASE WHEN $8 THEN COALESCE(next_analytics_at,now()) ELSE null END,
      updated_by=$11,updated_at=now() WHERE id='default'`,
    [
      text(input.aiProvider, 100) || null,
      text(input.aiModel, 160) || null,
      text(input.defaultLanguage, 12) || "ru",
      privacy,
      text(input.defaultCategoryId, 8) || "28",
      text(input.timezone, 80) || "Europe/Minsk",
      queries,
      input.automationEnabled === true,
      int(input.researchIntervalHours, 168, 6, 720),
      int(input.analyticsIntervalHours, 24, 6, 720),
      adminId,
    ],
  );
}

export async function createYoutubeProject(adminId: string, input: Record<string, unknown>) {
  const title = text(input.title, 200);
  const topic = text(input.topic, 2_000);
  if (!title || !topic) throw new Error("YOUTUBE_PROJECT_FIELDS_REQUIRED");
  const settings = await settingsRow();
  const rows = await query<ProjectRow>(
    `INSERT INTO youtube_projects(title,topic,target_audience,goal,language,status,current_stage,created_by)
     VALUES($1,$2,$3,$4,$5,'active','research',$6) RETURNING ${PROJECT_SELECT}`,
    [
      title,
      topic,
      text(input.targetAudience, 2_000),
      text(input.goal, 2_000),
      text(input.language, 12) || settings.default_language,
      adminId,
    ],
  );
  return rows[0];
}

export async function saveYoutubeProject(projectId: string, input: Record<string, unknown>) {
  const privacy = input.privacyStatus === "public" || input.privacyStatus === "unlisted" ? input.privacyStatus : "private";
  const tags = Array.isArray(input.tags) ? input.tags.map((item) => text(item, 80)).filter(Boolean).slice(0, 100) : [];
  const metadata = {
    title: text(input.youtubeTitle, 100),
    description: text(input.description, 5_000),
    tags,
    thumbnailBrief: text(input.thumbnailBrief, 5_000),
    privacyStatus: privacy,
    categoryId: text(input.categoryId, 8) || "28",
  };
  const scheduledAt = text(input.scheduledAt, 80);
  const saved = await query<{ id: string }>(
    `UPDATE youtube_projects SET title=COALESCE(NULLIF($2,''),title),topic=COALESCE(NULLIF($3,''),topic),
      target_audience=$4,goal=$5,language=COALESCE(NULLIF($6,''),language),video_asset_id=NULLIF($7,''),
      publish_approved_at=CASE WHEN title IS DISTINCT FROM COALESCE(NULLIF($2,''),title)
        OR video_asset_id IS DISTINCT FROM NULLIF($7,'') OR scheduled_at IS DISTINCT FROM $8::timestamptz
        OR metadata IS DISTINCT FROM $9::jsonb THEN null ELSE publish_approved_at END,
      status=CASE WHEN publish_approved_at IS NOT NULL AND (title IS DISTINCT FROM COALESCE(NULLIF($2,''),title)
        OR video_asset_id IS DISTINCT FROM NULLIF($7,'') OR scheduled_at IS DISTINCT FROM $8::timestamptz
        OR metadata IS DISTINCT FROM $9::jsonb) THEN 'ready' ELSE status END,
      scheduled_at=$8,metadata=$9,updated_at=now() WHERE id=$1 RETURNING id`,
    [
      projectId,
      text(input.title, 200),
      text(input.topic, 2_000),
      text(input.targetAudience, 2_000),
      text(input.goal, 2_000),
      text(input.language, 12),
      text(input.videoAssetId, 300),
      scheduledAt && Number.isFinite(new Date(scheduledAt).getTime()) ? new Date(scheduledAt) : null,
      metadata,
    ],
  );
  if (!saved[0]) throw new Error("YOUTUBE_PROJECT_NOT_FOUND");
}

async function projectRow(projectId: string) {
  const rows = await query<ProjectRow>(`SELECT ${PROJECT_SELECT} FROM youtube_projects WHERE id=$1`, [projectId]);
  if (!rows[0]) throw new Error("YOUTUBE_PROJECT_NOT_FOUND");
  return rows[0];
}

async function latestOutputs(projectId: string) {
  const rows = await query<{ stage: YoutubeStage; output: Record<string, unknown> }>(
    `SELECT DISTINCT ON (stage) stage,output FROM youtube_stage_runs
     WHERE project_id=$1 AND status='completed' ORDER BY stage,started_at DESC`,
    [projectId],
  );
  return Object.fromEntries(rows.map((row) => [row.stage, row.output])) as Partial<Record<YoutubeStage, Record<string, unknown>>>;
}

async function publicYoutubeResearch(topic: string) {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return { configured: false, videos: [] };
  const params = new URLSearchParams({
    key,
    part: "snippet",
    type: "video",
    maxResults: "12",
    order: "viewCount",
    q: topic.slice(0, 200),
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const search = await response.json().catch(() => null) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string } }>;
    error?: { message?: string };
  } | null;
  if (!response.ok || !search) throw new Error(search?.error?.message || `YOUTUBE_SEARCH_${response.status}`);
  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  if (!ids.length) return { configured: true, videos: [] };
  const statsParams = new URLSearchParams({ key, part: "statistics,contentDetails", id: ids.join(",") });
  const statsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const stats = await statsResponse.json().catch(() => null) as { items?: Array<{ id: string; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }; contentDetails?: { duration?: string } }> } | null;
  const byId = new Map((stats?.items ?? []).map((item) => [item.id, item]));
  return {
    configured: true,
    videos: (search.items ?? []).map((item) => {
      const id = item.id?.videoId ?? "";
      const stat = byId.get(id);
      return {
        id,
        title: item.snippet?.title ?? "",
        channel: item.snippet?.channelTitle ?? "",
        publishedAt: item.snippet?.publishedAt ?? null,
        views: Number(stat?.statistics?.viewCount ?? 0),
        likes: Number(stat?.statistics?.likeCount ?? 0),
        comments: Number(stat?.statistics?.commentCount ?? 0),
        duration: stat?.contentDetails?.duration ?? null,
        url: id ? `https://www.youtube.com/watch?v=${id}` : null,
      };
    }),
  };
}

function parseJsonOutput(content: string): Record<string, unknown> {
  const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(clean) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { content };
  } catch {
    return { content };
  }
}

function stageInstruction(stage: Exclude<YoutubeStage, "publish" | "analytics">) {
  const shared = "Верни только валидный JSON без markdown. Не придумывай метрики и источники. Пиши для YouTube-канала Genora.art об AI-инструментах и генеративном творчестве.";
  const instructions = {
    research: `${shared} Поля: summary, audienceProblems[], competitors[], outliers[], opportunities[], sources[]. Оценивай outlier относительно канала, если данных достаточно.`,
    plan: `${shared} Поля: promise, audience, format, workingTitle, outline[], shorts[], productionEstimate, successMetrics[]. Сформируй один реализуемый выпуск.`,
    script: `${shared} Поля: hooks[] (пять вариантов со score и formula), selectedHook, script, onScreen[], retentionBeats[], runtimeMinutes. Первые 15 секунд должны подтвердить обещание клика.`,
    package: `${shared} Поля: titleVariants[], title, description, tags[], searchQueries[], thumbnailBrief, thumbnailText, chapters[], privacyStatus, categoryId. Title и thumbnail не должны повторять друг друга.`,
    production: `${shared} Поля: checklist[], shotList[], editDecisionList[], shortsCuts[], uploadReadiness[]. Ничего не публикуй и не утверждай, что файл готов, если videoAssetId отсутствует.`,
  } satisfies Record<Exclude<YoutubeStage, "publish" | "analytics">, string>;
  return instructions[stage];
}

async function runAiStage(project: ProjectRow, stage: Exclude<YoutubeStage, "publish" | "analytics">, outputs: Partial<Record<YoutubeStage, Record<string, unknown>>>) {
  const settings = await settingsRow();
  if (!settings.ai_provider || !settings.ai_model) throw new Error("YOUTUBE_AI_NOT_CONFIGURED");
  const research = stage === "research" ? await publicYoutubeResearch(project.topic) : null;
  const context = JSON.stringify({
    project: {
      title: project.title,
      topic: project.topic,
      targetAudience: project.target_audience,
      goal: project.goal,
      language: project.language,
      videoAssetId: project.video_asset_id,
      metadata: project.metadata,
    },
    previousStages: outputs,
    publicYoutubeData: research,
  }).slice(0, 90_000);
  const result = await integratorChat({
    provider: settings.ai_provider,
    model: settings.ai_model,
    messages: [
      { role: "system", content: stageInstruction(stage) },
      { role: "user", content: context },
    ],
    reasoning: "medium",
    chatId: `youtube-${project.id}-${stage}`,
    memoryDepth: "standard",
    source: `Genora.art · YouTube · ${stage}`,
    webSearch: stage === "research",
    timezone: settings.timezone,
    maxOutputTokens: stage === "script" ? 12_000 : 6_000,
  });
  const content = result.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("YOUTUBE_AI_EMPTY");
  return { ...parseJsonOutput(content), _usage: result.usage, ...(research ? { publicYoutubeData: research } : {}) };
}

async function runPublishStage(project: ProjectRow, outputs: Partial<Record<YoutubeStage, Record<string, unknown>>>) {
  if (!project.publish_approved_at) throw new Error("YOUTUBE_PUBLISH_APPROVAL_REQUIRED");
  if (!project.video_asset_id) throw new Error("YOUTUBE_VIDEO_ASSET_REQUIRED");
  const asset = await loadMediaAsset(project.video_asset_id);
  if (!asset) throw new Error("YOUTUBE_VIDEO_ASSET_NOT_FOUND");
  if (!asset.mime.startsWith("video/")) throw new Error("YOUTUBE_VIDEO_ASSET_INVALID");
  const settings = await settingsRow();
  const packaged = outputs.package ?? {};
  const metadata = { ...packaged, ...project.metadata };
  const title = text(metadata.title, 100) || project.title;
  const description = text(metadata.description, 5_000);
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map((item) => text(item, 80)).filter(Boolean) : [];
  const privacy = metadata.privacyStatus === "public" || metadata.privacyStatus === "unlisted"
    ? metadata.privacyStatus
    : settings.default_privacy;
  const result = await uploadYoutubeVideo({
    bytes: asset.bytes,
    mime: asset.mime,
    title,
    description,
    tags,
    categoryId: text(metadata.categoryId, 8) || settings.default_category_id,
    privacyStatus: privacy,
    scheduledAt: project.scheduled_at,
  });
  await query(
    `UPDATE youtube_projects SET published_video_id=$2,published_url=$3,status=$4,updated_at=now() WHERE id=$1`,
    [project.id, result.videoId, result.url, result.scheduled ? "scheduled" : "published"],
  );
  return result;
}

async function runAnalyticsStage(project: ProjectRow) {
  if (!project.published_video_id) throw new Error("YOUTUBE_VIDEO_NOT_PUBLISHED");
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate: start,
    endDate: end,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,comments,shares",
    filters: `video==${project.published_video_id}`,
    dimensions: "video",
  });
  const report = await youtubeApi<{ columnHeaders?: Array<{ name: string }>; rows?: unknown[][] }>(`/youtube/analytics/v2/reports?${params}`);
  const headers = (report.columnHeaders ?? []).map((item) => item.name);
  return {
    dateRange: { start, end },
    metrics: (report.rows ?? []).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]]))),
  };
}

function assertStage(value: unknown): YoutubeStage {
  if (typeof value !== "string" || !YOUTUBE_STAGES.includes(value as YoutubeStage)) throw new Error("YOUTUBE_STAGE_INVALID");
  return value as YoutubeStage;
}

export async function runYoutubeStage(projectId: string, stageValue: unknown, adminId: string | null) {
  const stage = assertStage(stageValue);
  const project = await projectRow(projectId);
  if (project.current_stage !== stage && !(project.current_stage === "done" && stage === "analytics")) {
    throw new Error(`YOUTUBE_STAGE_OUT_OF_ORDER:${project.current_stage}`);
  }
  const outputs = await latestOutputs(projectId);
  const stageIndex = YOUTUBE_STAGES.indexOf(stage);
  for (const required of YOUTUBE_STAGES.slice(0, stageIndex)) {
    if (!outputs[required]) throw new Error(`YOUTUBE_STAGE_REQUIRED:${required}`);
  }
  const created = await query<{ id: string }>(
    `INSERT INTO youtube_stage_runs(project_id,stage,status,input,created_by)
     VALUES($1,$2,'running',$3,$4) RETURNING id`,
    [projectId, stage, { projectId, stage }, adminId],
  );
  const runId = created[0].id;
  try {
    let output: Record<string, unknown>;
    if (stage === "publish") output = await runPublishStage(project, outputs);
    else if (stage === "analytics") output = await runAnalyticsStage(project);
    else output = await runAiStage(project, stage, outputs);
    const next = YOUTUBE_STAGES[stageIndex + 1] ?? "done";
    const status = stage === "publish"
      ? (project.scheduled_at && new Date(project.scheduled_at).getTime() > Date.now() ? "scheduled" : "published")
      : next === "publish" ? "ready" : stage === "analytics" ? "published" : "active";
    await query(
      `UPDATE youtube_stage_runs SET status='completed',output=$2,completed_at=now() WHERE id=$1`,
      [runId, output],
    );
    await query(
      `UPDATE youtube_projects SET current_stage=$2,status=$3,updated_at=now() WHERE id=$1`,
      [projectId, next, status],
    );
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await query(
      `UPDATE youtube_stage_runs SET status='failed',error=$2,completed_at=now() WHERE id=$1`,
      [runId, message.slice(0, 2_000)],
    );
    await query("UPDATE youtube_projects SET status='failed',updated_at=now() WHERE id=$1", [projectId]);
    throw error;
  }
}

export async function approveYoutubePublication(projectId: string) {
  const project = await projectRow(projectId);
  if (YOUTUBE_STAGES.indexOf(project.current_stage as YoutubeStage) < YOUTUBE_STAGES.indexOf("publish")) {
    throw new Error("YOUTUBE_PROJECT_NOT_READY");
  }
  const scheduled = project.scheduled_at && new Date(project.scheduled_at).getTime() > Date.now() + 60_000;
  await query(
    `UPDATE youtube_projects SET publish_approved_at=now(),status=$2,updated_at=now() WHERE id=$1`,
    [projectId, scheduled ? "scheduled" : "ready"],
  );
}

export async function runDueYoutubeAutomations() {
  const settings = await settingsRow();
  const result = { published: 0, researched: 0, analytics: 0, errors: [] as string[] };
  const duePublish = await query<{ id: string }>(
    `SELECT id FROM youtube_projects WHERE current_stage='publish' AND status='scheduled'
      AND publish_approved_at IS NOT NULL AND scheduled_at<=now() ORDER BY scheduled_at LIMIT 1`,
  );
  if (duePublish[0]) {
    try { await runYoutubeStage(duePublish[0].id, "publish", null); result.published += 1; }
    catch (error) { result.errors.push(error instanceof Error ? error.message : "publish_failed"); }
  }
  if (!settings.automation_enabled) return result;
  if (!settings.next_research_at || new Date(settings.next_research_at).getTime() <= Date.now()) {
    await query(
      `UPDATE youtube_settings SET next_research_at=now()+($1::text||' hours')::interval,updated_at=now() WHERE id='default'`,
      [settings.research_interval_hours],
    );
    try {
      const topic = (settings.research_queries ?? []).join("; ") || "Актуальные AI-инструменты и генеративное творчество";
      const rows = await query<ProjectRow>(
        `INSERT INTO youtube_projects(title,topic,goal,language,status,current_stage)
         VALUES($1,$2,$3,$4,'active','research') RETURNING ${PROJECT_SELECT}`,
        [`Автоплан ${new Date().toISOString().slice(0, 10)}`, topic, "Найти актуальную тему и подготовить план выпуска", settings.default_language],
      );
      const created = rows[0];
      await runYoutubeStage(created.id, "research", null);
      await runYoutubeStage(created.id, "plan", null);
      result.researched += 1;
    } catch (error) { result.errors.push(error instanceof Error ? error.message : "research_failed"); }
  }
  if (!settings.next_analytics_at || new Date(settings.next_analytics_at).getTime() <= Date.now()) {
    await query(
      `UPDATE youtube_settings SET next_analytics_at=now()+($1::text||' hours')::interval,updated_at=now() WHERE id='default'`,
      [settings.analytics_interval_hours],
    );
    const published = await query<{ id: string }>(
      "SELECT id FROM youtube_projects WHERE published_video_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1",
    );
    if (published[0]) {
      try { await runYoutubeStage(published[0].id, "analytics", null); result.analytics += 1; }
      catch (error) { result.errors.push(error instanceof Error ? error.message : "analytics_failed"); }
    }
  }
  return result;
}
