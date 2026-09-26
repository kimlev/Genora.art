"use client";
import { promptErrorMessage, type PublicErrorCode } from "@/lib/public-error";
import { MediaPromptDialog } from "@/components/images/media-prompt-dialog";
import { mediaTitleCopy } from "@/lib/i18n/copy/media-title";
import { apiAppCopy } from "@/lib/i18n/copy/api-app";

import { AgentsTemplatesGallery } from "@/components/images/agents-templates-gallery";
import { ProviderLogo } from "@/components/chat/provider-logo";
import { ProviderMenuSelect } from "@/components/chat/provider-menu-select";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmActionDialog } from "@/components/layout/confirm-action-dialog";
import { CharacterPickerDialog, characterPickerLabel } from "@/components/characters/character-selector";
import { useImageHistory, type ImageConversation, type ImageGeneration } from "@/components/providers/image-history-provider";
import { GenerationJobError, isPageDisconnect, waitForGenerationJob, type PublicGenerationJob } from "@/lib/generation-job-client";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { useCustomAgents } from "@/lib/custom-agents";
import { compareCornerLabels } from "@/lib/agent-preview";
import { imageAgentComposerCopy } from "@/lib/i18n/copy/image-agent-composer-copy";
import { imageAgentGuideNotice, imageAgentHidesGuideUpload, imageAgentMultiGuide, imageAgentRatedGuide, imageAgentSlotHint } from "@/lib/image-agent-guides";
import { imageAgentGuideAssets, imageAgentPreferredStyle, imageAgentRequiresPhoto, imageAgentUsesOldGuide, type StudioGalleryTab } from "@/lib/image-agent-gallery";
import { imageAgentPreset } from "@/lib/image-agent-presets";
import { filterModelsForMinReferences, imageAgentMinReferences, modelSupportsMinReferences } from "@/lib/image-agent-models";
import { defaultImageAgentVariant, imageAgentVariantNotes, imageAgentVariants, imageStudioQueryKey, liveImageStudioQuery } from "@/lib/image-agent-variants";
import { agentDescription, agentName, listVisibleAgents } from "@/lib/mock/agents";
import { getCatalogAgentOverride } from "@/lib/catalog-agent-overrides";
import { useCatalogAgentOverrides } from "@/lib/use-catalog-agent-overrides";
import { videoAgentCopy, videoAgentDefaults, videoAgentNeedsUserPrompt, videoAgentRequiresMotionControlInputs, type VideoAgentGuide, type VideoAgentSettings } from "@/lib/video-agent-catalog";
import { imageQualityLabel } from "@/lib/image-quality";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { Button } from "@/components/ui/button";
import { imageExamplesForModels } from "@/lib/catalog/image-examples";
import { isImageStudioPath } from "@/lib/routes";
import {
  filterVideoModels,
  videoOpenChoices,
  isMotionControlModel,
  motionControlClipBounds,
  motionControlClipIssue,
  motionControlDurationFromClip,
  nearestVideoDuration,
  studioIntegratorMode,
  V2V_FILE_ACCEPT,
  VIDEO_IMAGE_FILE_MAX_BYTES,
  videoV2vAcceptsPhotos,
  videoCharacterRightsRequired,
  videoModelSupportsCharacter,
  videoLimitMb,
  videoModeSlotMax,
  videoSlotCount,
  videoPerFileMaxBytes,
  videoSoundModes,
  splitVideoPrompt,
  videoTokensForClip,
  videoTotalMaxBytes,
  videoUserPromptMaxChars,
  type StudioVideoMode,
  type VideoCatalogModel,
  type VideoSound,
} from "@/lib/catalog/video-studio";
import { sortStudioSizes } from "@/lib/catalog/studio-size";
import { readVideoFileDuration } from "@/lib/media/read-video-duration";
import { videoCharacterRightsCopy, videoPromptOverflowCopy, videoProviderResetCopy, videoReferenceMixUnsupportedCopy, videoStudioUiCopy } from "@/lib/i18n/copy/video-studio-ui-copy";
import { generationErrorLabel, generationFailureLabel } from "@/lib/i18n/copy/generation-error-label";
import { deleteConfirmationCopy } from "@/lib/i18n/copy/delete-confirmation";
import { videoStylePromptExtraChars, videoStyles as videoStyleCopies } from "@/lib/i18n/copy/video-styles";
import { compatibleImageSizeForFormat, photoReferenceCap, photoRequiredCount, photoRequiredSlotsFilled, photoSlotCount, photoSlotLabel } from "@/lib/catalog/image-studio";
import { sortModelsByStrength } from "@/lib/catalog/model-rank";
import { mediaModelDescription } from "@/lib/i18n/copy/media-model-use";
import { modelUseDescription } from "@/lib/i18n/copy/model-use";
import type { Locale } from "@/lib/i18n";
import { studioBattleCopy, type StudioBattleCopy } from "@/lib/i18n/copy/studio-battle";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { DownloadSizeAction } from "@/components/ui/download-size-action";
import { PromptCopyButton } from "@/components/ui/prompt-copy-button";
import { formatTokensAsCredits } from "@/lib/credits";
import { workspaceUiCopy, type WorkspaceUiCopy } from "@/lib/i18n/workspace-ui-copy";
import { saveModelFeedback, useModelFeedback } from "@/lib/model-feedback";
import { MIN_VOICE_BYTES, VOICE_RECORDER_TIMESLICE_MS, cleanAudioMime, fileDataUrl as voiceFileDataUrl, flushAndStopRecorder, recorderMime, voiceFilename } from "@/lib/voice-recorder";
import { cn } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select-menu";
import { readGalleryFavorites, subscribeGalleryFavorites, toggleGalleryFavorite } from "@/lib/gallery-favorites";
import { Bell, Box, Camera, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown, CircleX, Clapperboard, Cpu, Eye, Heart, ImagePlus, LayoutTemplate, LoaderCircle, Mic, Minimize2, Network, Palette, PenLine, Play, Plus, RotateCcw, Share2, Smile, Sparkles, Square, ThumbsUp, Trash2, UserRound, Volume2, X } from "lucide-react";
import Image from "next/image";
import { Link } from "@/components/ui/locale-link";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type Dispatch, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import type { CharacterListPayload, CharacterSummary } from "@/lib/characters";
import { characterUiCopy } from "@/lib/i18n/copy/characters";

type ImageCapability = { supported: boolean; provider_max_file_bytes: number | null; provider_max_request_bytes: number | null; integrator_max_file_bytes: number | null };
type ImageModel = { provider: string; provider_label: string; id: string; label: string; description: string; reasoning: { label: string; defaultValue: string; options: Array<{ value: string; label: string }> } | null; sizes: string[]; formats: string[]; formats_by_size: Record<string, string[]> | null; styles: string[]; max_reference_images?: number; input_image: ImageCapability; token_prices: Record<string, number> };
type ImageStyle = { id: string; label: string; description: string; swatch: string };
type Catalog = { providers: Array<{ id: string; label: string }>; models: ImageModel[]; styles: ImageStyle[]; available: boolean };
type ImageAgent = { id: string; name: string; description: string; icon: string; mode: "T2I" | "EDIT" | "T2I_OR_EDIT"; inputMin: number; inputMax: number; consentRequired: boolean };

function photoModeForAgent(agent: ImageAgent | undefined): "t2i" | "i2i" | null {
  if (!agent) return null;
  if (agent.mode === "T2I") return "t2i";
  if (agent.mode === "EDIT" || agent.inputMin >= 1) return "i2i";
  return null;
}
type SourceImage = { name: string; dataUrl: string; bytes: number };
type Choice = { value: string; label: string; description?: ReactNode; visual?: ReactNode; disabled?: boolean };
type PendingImageJob = { id: string; prompt: string; modelLabel: string; count: number; status: "creating" | "failed"; billedTokens: number; createdAt: string; errorCode?: PublicErrorCode | null; kind?: "photo" | "video" };
type VideoCatalog = { available: boolean; providers: Array<{ id: string; label: string }>; models: VideoCatalogModel[] };
type VideoRef = { name: string; dataUrl: string; bytes: number; kind: "image" | "video"; durationSec?: number };
type StudioVideoAgent = {
  id: string;
  name: string;
  description: string;
  tag: string;
  providerId: string;
  modelId: string;
  videoMode: StudioVideoMode;
  videoUrl: string | null;
  videoPreviewUrl: string | null;
  coverUrl: string | null;
  promptPlaceholder: string;
  videoSettings: Partial<VideoAgentSettings>;
  guide?: VideoAgentGuide;
  minUserReferences?: number;
  maxUserReferences?: number;
};

const emptyCatalog: Catalog = { providers: [], models: [], styles: [], available: false };
const MAX_REFERENCE_EDGE = 2048;
const TARGET_REFERENCE_BYTES = 1_200_000;
const PROMPT_MAX = 20_000;

/** Было 128×96 (`h-32 w-24`), меньше в 1.3 раза — нижний край совпадает со стрелкой раскрытия. */
const VARIANT_THUMB_CLASS = "relative h-[98px] w-[74px] shrink-0 overflow-hidden rounded-xl border";

function tokensForQuality(model: ImageModel | undefined, size: string, quality: string) {
  if (!model) return null;
  const prices = model.token_prices;
  const exact = prices[`${size}:${quality}`];
  if (typeof exact === "number") return exact;
  if (typeof prices[size] === "number") return prices[size];
  return null;
}

function qualityHint(model: ImageModel | undefined, size: string, quality: string, copy: WorkspaceUiCopy, locale: string) {
  const hint = copy.qualityDescs[quality] ?? copy.qualityFallback;
  if (!model?.reasoning) return hint;
  const current = tokensForQuality(model, size, quality);
  const unique = new Set(model.reasoning.options.map((option) => tokensForQuality(model, size, option.value)).filter((value): value is number => typeof value === "number"));
  if (unique.size > 1 && current != null) return `${hint} · ${formatTokensAsCredits(current, locale, "price")}`;
  return hint;
}

function bytesFromDataUrl(value: string) { return Math.floor((value.split(",")[1]?.length ?? 0) * 3 / 4); }
function fileDataUrl(file: File | Blob, copy: StudioBattleCopy) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(copy.readFileFailed)); reader.onerror = () => reject(new Error(copy.readFileFailed)); reader.readAsDataURL(file); }); }
function loadImage(src: string, copy: StudioBattleCopy) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new window.Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(copy.imageCorrupted)); image.src = src; }); }

async function compressDataUrl(dataUrl: string, maxBytes: number, copy: StudioBattleCopy): Promise<string> {
  const image = await loadImage(dataUrl, copy);
  const scale = Math.min(1, MAX_REFERENCE_EDGE / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const limit = Math.min(maxBytes, TARGET_REFERENCE_BYTES);
  for (const quality of [0.86, 0.76, 0.64]) {
    const next = canvas.toDataURL("image/jpeg", quality);
    if (bytesFromDataUrl(next) <= limit) return next;
  }
  return canvas.toDataURL("image/jpeg", 0.52);
}

async function normaliseImage(file: File, maxBytes: number, copy: StudioBattleCopy): Promise<SourceImage> {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(file.type)) throw new Error(copy.unsupportedFormat);
  let dataUrl: string;
  if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    dataUrl = await fileDataUrl(file, copy);
  } else {
    let sourceUrl: string;
    let revoke = false;
    if (file.type === "image/svg+xml") {
      const documentNode = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
      documentNode.querySelectorAll("script,foreignObject").forEach((node) => node.remove());
      documentNode.querySelectorAll("*").forEach((node) => [...node.attributes].forEach((attribute) => { if (/^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name); }));
      sourceUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(documentNode)], { type: "image/svg+xml" }));
      revoke = true;
    } else sourceUrl = await fileDataUrl(file, copy);
    try {
      const image = await loadImage(sourceUrl, copy);
      const scale = Math.min(1, MAX_REFERENCE_EDGE / Math.max(image.naturalWidth, image.naturalHeight, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL("image/png");
    } finally { if (revoke) URL.revokeObjectURL(sourceUrl); }
  }
  if (bytesFromDataUrl(dataUrl) > Math.min(maxBytes, TARGET_REFERENCE_BYTES)) dataUrl = await compressDataUrl(dataUrl, maxBytes, copy);
  return { name: file.name.replace(/\.[^.]+$/, "") + (dataUrl.startsWith("data:image/jpeg") ? ".jpg" : ".png"), dataUrl, bytes: bytesFromDataUrl(dataUrl) };
}

async function readGenerationResponse(response: Response, copy: StudioBattleCopy) {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as {
      generation?: ImageGeneration;
      conversation?: { id: string; title: string; updatedAt: string };
      balanceTokens?: number;
      error?: string;
      job?: { id: string; status: "creating" | "ready" | "failed"; prompt?: string; modelLabel?: string; error?: string | null; errorCode?: PublicErrorCode | null };
    };
    // Parallel POST responses can arrive out of order; refresh the authoritative wallet.
    if (typeof data.balanceTokens === "number") window.dispatchEvent(new Event("genora-balance-changed"));
    return data;
  } catch {
    if (response.status === 413 || /413|Request Entity Too Large/i.test(text)) {
      throw new Error(copy.imageTooLarge);
    }
    throw new Error(copy.generationFailed);
  }
}

function imageResultFromJob(job: PublicGenerationJob) {
  return {
    generation: job.result?.generation as ImageGeneration | undefined,
    conversation: job.result?.conversation as Omit<ImageConversation, "generations"> | undefined,
    balanceTokens: Number.isFinite(job.result?.balanceTokens) ? Number(job.result?.balanceTokens) : undefined,
  };
}

async function waitForVideoJob(jobId: string, copy: StudioBattleCopy) {
  const deadline = Date.now() + 50 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
    let response: Response;
    try {
      response = await fetch(`/api/video/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    } catch {
      continue;
    }
    const data = await readGenerationResponse(response, copy);
    if (data.generation || data.job?.status === "failed") window.dispatchEvent(new Event("genora-balance-changed"));
    if (data.generation && data.conversation) return data;
    if (data.job?.status === "failed") throw new GenerationJobError(data.error || data.job.error || copy.generationFailed, data.job.errorCode);
  }
  throw new VideoPollingTimeout();
}

class VideoPollingTimeout extends Error {}

async function readReadyVideoJob(jobId: string, copy: StudioBattleCopy) {
  const response = await fetch(`/api/video/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
  return readGenerationResponse(response, copy);
}

export function ImageStudio() {
  const t = useT();
  const { locale } = useLocale();
  const pathname = useAppPathname();
  const searchParams = useSearchParams();
  const copy = workspaceUiCopy(locale);
  const videoUi = videoStudioUiCopy(locale);
  const UI = {
    photo: videoUi.photo,
    video: videoUi.video,
    t2i: t.workspace.menuPhotoCreate,
    i2i: copy.addPhoto,
    provider: t.studio.provider,
    model: t.studio.model,
    templates: t.workspace.menuPhotoTemplates,
    templatesSoon: t.workspace.videoTemplatesLead,
    templatesClose: copy.close,
    agentsTemplates: videoUi.agentsTemplates,
    agents: videoUi.agents,
    creating: t.workspace.newGeneration,
    createFailed: t.studio.unavailable,
    promptTitle: t.hero.promptPlaceholder,
    expandPrompt: copy.previewAria,
    expandPromptFull: copy.previewAria,
    noAgent: copy.noAgent,
    mic: videoUi.mic,
    micStop: videoUi.micStop,
    size: videoUi.size,
    format: videoUi.format,
    quality: t.studio.quality,
    styles: videoUi.styles,
    generate: videoUi.generate,
    noFunds: videoUi.noFunds,
    videoStub: videoUi.soon,
    videoStubLead: videoUi.templatesVideoSoon,
    t2v: videoUi.t2v,
    animate: videoUi.animate,
    i2v: videoUi.i2v,
    v2v: videoUi.v2v,
    duration: videoUi.duration,
    seconds: videoUi.seconds,
    sound: videoUi.sound,
    soundYes: videoUi.soundYes,
    soundNo: videoUi.soundNo,
    creatingVideo: videoUi.creatingVideo,
    badgeVideo: videoUi.badgeVideo,
    templatesVideo: videoUi.templatesVideo,
    templatesVideoSoon: videoUi.templatesVideoSoon,
    addVideoNeeded: videoUi.addVideoNeeded,
    uploadRef: copy.addAttachment,
    videoCatalogFailed: videoUi.videoCatalogFailed,
    fileTooBig: videoUi.fileTooBig,
    filesTotalBig: videoUi.filesTotalBig,
    pickModel: videoUi.pickModel,
    library: t.workspace.menuGallery,
    libraryLead: t.workspace.galleryEmpty,
    filterType: t.rating.filterType,
    filterProvider: t.rating.filterProvider,
    filterModel: t.studio.model,
    filterSound: videoUi.sound,
    filterAll: t.rating.filterTypeAll,
    typePhoto: t.rating.filterTypePhoto,
    typeVideo: t.rating.filterTypeVideo,
    soundOn: videoUi.soundYes,
    soundOff: videoUi.soundNo,
    badgePhoto: t.rating.filterTypePhoto,
    emptyLibrary: t.workspace.imageHistoryEmpty,
    emptyFavorites: t.workspace.imageHistoryEmpty,
    filterFavorites: t.rating.filterTypeFavorites,
    filterFavoritesOff: t.workspace.menuGallery,
    loginLibrary: t.workspace.gallerySignIn,
    addPhotoNeeded: copy.addPhoto,
    variants: copy.variantsShort,
    uploadPhoto: copy.uploadPhoto,
    uploadPhotoLead: copy.addPhoto,
    exampleGood: copy.uploadPhoto,
    exampleBad: copy.uploadPhoto,
    uploadHere: copy.addFile,
    guideClose: copy.close,
    guideBell: copy.addImageAria,
    placeholderTemplate: copy.placeholderAgent,
    placeholderCustom: copy.placeholderDefault,
    placeholderPhotoAgent: copy.addPhoto,
  };
  const text = studioBattleCopy(locale);
  const deleteCopy = deleteConfirmationCopy(locale);
  const { user, ready: authReady, setBalanceTokens } = useAuth();
  const { customAgents } = useCustomAgents();
  const catalogAgentVersion = useCatalogAgentOverrides();
  const { conversations, activeConversationId, loading: historyLoading, loadFailed: historyLoadFailed, addGeneration, deleteGeneration, renameMedia } = useImageHistory();
  const [pendingDelete, setPendingDelete] = useState<ImageGeneration | null>(null);
  const [pendingJobDelete, setPendingJobDelete] = useState<PendingImageJob | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [videoCatalog, setVideoCatalog] = useState<VideoCatalog>({ available: false, providers: [], models: [] });
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [selectedPhotoCharacterId, setSelectedPhotoCharacterId] = useState("");
  const [selectedPhotoCharacterSlot, setSelectedPhotoCharacterSlot] = useState(0);
  const [videoLoading, setVideoLoading] = useState(true);
  const [agents, setAgents] = useState<ImageAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<PendingImageJob[]>([]);
  const [promptOpen, setPromptOpen] = useState<{ prompt: string; title: string; assetId: string; kind: "photo" | "video"; editable?: boolean } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [size, setSize] = useState("");
  const [format, setFormat] = useState("");
  const [style, setStyle] = useState("auto");
  const [quality, setQuality] = useState("");
  const [agentId, setAgentId] = useState("");
  const [videoAgentId, setVideoAgentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [count, setCount] = useState<1 | 2 | 4>(1);
  const [sourceImages, setSourceImages] = useState<Array<SourceImage | null>>([]);
  const [consent, setConsent] = useState(false);
  const [mediaKind, setMediaKind] = useState<"photo" | "video">("photo");
  const [studioKindReady, setStudioKindReady] = useState(false);
  const [videoSeed, setVideoSeed] = useState<SourceImage | null>(null);
  const [photoMode, setPhotoMode] = useState<"t2i" | "i2i">("t2i");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState<StudioGalleryTab>("photo");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [libraryProvider, setLibraryProvider] = useState("all");
  const [libraryModel, setLibraryModel] = useState("all");
  const [soundFilter, setSoundFilter] = useState("all");
  const [revealedFilters, setRevealedFilters] = useState({ size: false, format: false, quality: false, style: false });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [libraryLimit, setLibraryLimit] = useState(4);
  const librarySentinelRef = useRef<HTMLDivElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentSlot, setAttachmentSlot] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ kind: "photo" | "video"; url: string; alt: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const guideFileRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const promptResizedRef = useRef(false);
  const appliedQueryRef = useRef<string | null>(null);
  const agentIdRef = useRef(agentId);
  const variantIdRef = useRef(variantId);
  const modelIdRef = useRef(modelId);
  agentIdRef.current = agentId;
  variantIdRef.current = variantId;
  modelIdRef.current = modelId;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef(0);
  const textRef = useRef(text);
  const mountedRef = useRef(true);
  const pollingPhotoJobsRef = useRef(new Set<string>());
  const pollingVideoJobsRef = useRef(new Set<string>());

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const restore = async () => {
      const [videoResponse, jobsResponse] = await Promise.all([
        fetch("/api/video/jobs", { cache: "no-store" }).catch(() => null),
        fetch("/api/generation-jobs", { cache: "no-store" }).catch(() => null),
      ]);
      const videoPayload = videoResponse?.ok ? await videoResponse.json() as { jobs?: Array<{ id: string; prompt: string; modelLabel: string; status: "creating" | "ready" | "failed"; createdAt: string; errorCode?: PublicErrorCode | null }>; settledJobIds?: string[] } : { jobs: [] };
      const jobsPayload = jobsResponse?.ok ? await jobsResponse.json() as { jobs?: PublicGenerationJob[] } : { jobs: [] };
      const readyVideoJobs = (videoPayload.jobs ?? []).filter((job) => job.status === "ready");
      const videoJobs = (videoPayload.jobs ?? [])
        .filter((job) => job.status === "creating" || job.status === "failed")
        .map((job) => ({ ...job, status: job.status === "failed" ? "failed" as const : "creating" as const }));
      const photoJobs = (jobsPayload.jobs ?? []).filter((job) => job.kind === "image" && (job.status === "creating" || job.status === "failed"));
      if (!active) return;
      const settledIds = new Set(videoPayload.settledJobIds ?? []);
      setPendingJobs((current) => current.filter((job) => !settledIds.has(job.id)));
      window.dispatchEvent(new Event("genora-history-refresh"));
      for (const job of readyVideoJobs) {
        void readReadyVideoJob(job.id, text).then((ready) => {
          if (!active || !ready.generation || !ready.conversation) return;
          if (typeof ready.balanceTokens === "number") setBalanceTokens(ready.balanceTokens);
          setPendingJobs((items) => items.filter((item) => item.id !== job.id));
          addGeneration(ready.generation, ready.conversation);
        }).catch(() => undefined);
      }
      if ((!videoJobs.length && !photoJobs.length) || !active) return;
      setPendingJobs((current) => {
        const known = new Set(current.map((item) => item.id));
        return [
          ...photoJobs.filter((job) => !known.has(job.id)).map((job) => ({
            id: job.id,
            prompt: job.title || "",
            modelLabel: job.modelLabel || "",
            count: 1,
            status: job.status === "failed" ? "failed" as const : "creating" as const,
            billedTokens: 0,
            createdAt: job.createdAt,
            errorCode: job.errorCode,
            kind: "photo" as const,
          })),
          ...videoJobs.filter((job) => !known.has(job.id)).map((job) => ({
            id: job.id,
            prompt: job.prompt,
            modelLabel: job.modelLabel,
            count: 1,
            status: job.status,
            billedTokens: 0,
            createdAt: job.createdAt,
            errorCode: job.errorCode,
            kind: "video" as const,
          })),
          ...current,
        ];
      });
      for (const job of photoJobs.filter((item) => item.status === "creating")) {
        if (pollingPhotoJobsRef.current.has(job.id)) continue;
        pollingPhotoJobsRef.current.add(job.id);
        void waitForGenerationJob(job.id).then((ready) => {
          const result = imageResultFromJob(ready);
          if (!mountedRef.current || !result.generation || !result.conversation) return;
          if (typeof result.balanceTokens === "number") setBalanceTokens(result.balanceTokens);
          setPendingJobs((items) => items.filter((item) => item.id !== job.id));
          addGeneration(result.generation, result.conversation);
        }).catch((error) => {
          if (!mountedRef.current || isPageDisconnect(error)) return;
          setPendingJobs((items) => items.map((item) => item.id === job.id ? { ...item, status: "failed", billedTokens: 0, errorCode: error instanceof GenerationJobError ? error.errorCode : null } : item));
        }).finally(() => { pollingPhotoJobsRef.current.delete(job.id); });
      }
      for (const job of videoJobs.filter((item) => item.status === "creating")) {
        if (pollingVideoJobsRef.current.has(job.id)) continue;
        pollingVideoJobsRef.current.add(job.id);
        void waitForVideoJob(job.id, text).then((ready) => {
          if (!mountedRef.current || !ready.generation || !ready.conversation) return;
          if (typeof ready.balanceTokens === "number") setBalanceTokens(ready.balanceTokens);
          setPendingJobs((items) => items.filter((item) => item.id !== job.id));
          addGeneration(ready.generation, ready.conversation);
        }).catch((error) => {
          if (!mountedRef.current || isPageDisconnect(error) || error instanceof VideoPollingTimeout) return;
          setPendingJobs((items) => items.map((item) => item.id === job.id ? { ...item, status: "failed", billedTokens: 0, errorCode: error instanceof GenerationJobError ? error.errorCode : null } : item));
        }).finally(() => { pollingVideoJobsRef.current.delete(job.id); });
      }
    };
    void restore();
    return () => { active = false; };
  }, [addGeneration, setBalanceTokens, text, user?.id, pathname]);
  useEffect(() => {
    if (!user?.id || !pathname.includes("create-foto-video")) return;
    const refresh = () => {
      if (document.visibilityState === "visible") window.dispatchEvent(new Event("genora-history-refresh"));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, user?.id]);
  useEffect(() => {
    const saved = window.localStorage.getItem(STUDIO_KIND_KEY);
    if (saved === "video" || saved === "photo") setMediaKind(saved);
    if (new URLSearchParams(window.location.search).get("tab") === "video") setMediaKind("video");
    setStudioKindReady(true);
  }, []);
  useEffect(() => {
    if (!studioKindReady) return;
    window.localStorage.setItem(STUDIO_KIND_KEY, mediaKind);
  }, [mediaKind, studioKindReady]);
  useEffect(() => () => { flushAndStopRecorder(recorderRef.current); recorderRef.current = null; }, []);
  useEffect(() => {
    if (!isRecording) return;
    const tick = window.setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [isRecording]);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const loadVideo = async () => {
      try {
        const response = await fetch("/api/video/catalog");
        if (!response.ok) throw new Error("video_catalog_failed");
        const data = await response.json() as VideoCatalog;
        if (active) setVideoCatalog(data);
      } catch {
        if (active) setVideoCatalog({ available: false, providers: [], models: [] });
      } finally { if (active) setVideoLoading(false); }
    };
    const load = async () => {
      try {
      const [catalogResponse, agentResponse] = await Promise.all([
          fetch("/api/images/catalog"), fetch(`/api/image-agents?locale=${encodeURIComponent(locale)}`),
        ]);
        if (!catalogResponse.ok) throw new Error("image_catalog_failed");
        const catalogData = await catalogResponse.json() as Catalog;
        const agentData = agentResponse.ok ? await agentResponse.json() as { agents: ImageAgent[] } : { agents: [] as ImageAgent[] };
        if (!active) return;
        setCatalog(catalogData);
        setAgents(agentData.agents);
        const first = sortModelsByStrength(catalogData.models)[0];
        if (first && !modelIdRef.current) selectModel(first);
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("agent");
        const requestedTemplate = params.get("template");
        if (requested) {
          const found = agentData.agents.find((item) => item.id === requested);
          applyAgentPreset(requested, catalogData.models);
          if (!agentIdRef.current) {
            setAgentId(requested);
            setPhotoMode(photoModeForAgent(found) ?? (imageAgentRequiresPhoto(requested) ? "i2i" : "t2i"));
            setGuideDismissed(!imageAgentRequiresPhoto(requested));
          }
        } else if (requestedTemplate && !agentIdRef.current) {
          setTemplateId(requestedTemplate);
          setPhotoMode("i2i");
          setGuideDismissed(false);
        }
      } catch { if (active) setError(textRef.current.catalogLoadFailed); }
      finally { if (active) setLoading(false); }
    };
    void loadVideo();
    void load();
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, [authReady, user?.id, locale]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void fetch("/api/characters", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as CharacterListPayload;
      if (!active) return;
      const ready = payload.characters.filter((item) => item.status === "ready");
      setCharacters(ready);
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("character");
      if (requested && params.get("tab") !== "video" && ready.some((item) => item.id === requested)) {
        setSelectedPhotoCharacterId(requested);
        setPhotoMode("i2i");
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) setAttachmentMenuOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAttachmentMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (!previewMedia && promptOpen === null && !editorOpen) return;
    const releaseScrollLock = acquireScrollLock();
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPreviewMedia(null);
      setPromptOpen(null);
      setEditorOpen(false);
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      releaseScrollLock();
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [previewMedia, promptOpen, editorOpen]);

  useEffect(() => {
    const reset = () => {
      setPrompt("");
      setSourceImages([]);
      setConsent(false);
      setAgentId("");
      setSelectedPhotoCharacterId("");
      setTemplateId("");
      setError(null);
      setNotice(null);
      setPhotoMode("t2i");
      setRevealedFilters({ size: false, format: false, quality: false, style: false });
      setCount(1);
      setEditorOpen(false);
      promptResizedRef.current = false;
      if (composerRef.current) {
        composerRef.current.style.height = "";
        composerRef.current.style.maxHeight = "";
        composerRef.current.style.overflowY = "";
      }
    };
    window.addEventListener("genora-new-image-conversation", reset);
    return () => window.removeEventListener("genora-new-image-conversation", reset);
  }, []);

  useEffect(() => {
    if (!user) return;
    const sync = () => setFavorites(readGalleryFavorites(user.id));
    sync();
    return subscribeGalleryFavorites(sync);
  }, [user]);

  const resetComposerHeight = () => {
    promptResizedRef.current = false;
    const target = composerRef.current;
    if (!target) return;
    target.style.height = "";
    target.style.maxHeight = "";
    target.style.overflowY = "";
  };

  const updatePrompt = (value: string, target: HTMLTextAreaElement) => {
    setPrompt(value.slice(0, PROMPT_MAX));
    if (promptResizedRef.current) return;
    target.style.height = "56px";
    const maximum = Math.min(window.innerHeight * 0.36, 320);
    target.style.height = `${Math.min(target.scrollHeight, maximum)}px`;
    target.style.overflowY = target.scrollHeight > maximum ? "auto" : "hidden";
  };

  const startPromptResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.detail >= 2) return;
    event.preventDefault();
    const startY = event.clientY;
    const startH = composerRef.current?.offsetHeight ?? 112;
    const move = (moveEvent: PointerEvent) => {
      const next = Math.min(Math.max(startH + (moveEvent.clientY - startY), 112), window.innerHeight * 0.7);
      const target = composerRef.current;
      if (!target) return;
      target.style.height = `${next}px`;
      target.style.maxHeight = "none";
      target.style.overflowY = "auto";
      promptResizedRef.current = true;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const chooseAgent = (value: string) => {
    const agent = studioAgents.find((item) => item.id === value);
    const nextMode = photoModeForAgent(agent);
    const preset = defaultImageAgentVariant(value);
    setAgentId(value);
    setSelectedPhotoCharacterId("");
    setTemplateId("");
    setVariantId(preset?.id ?? "");
    setConsent(false);
    setGalleryOpen(false);
    setMediaKind("photo");
    setPrompt("");
    setGuideOpen(false);
    setGuideDismissed(!imageAgentRequiresPhoto(value));
    applyAgentPreset(value);
    if (nextMode === "t2i") {
      setPhotoMode("t2i");
      setSourceImages([]);
      return;
    }
    setPhotoMode("i2i");
    setSourceImages((items) => items.slice(0, agent?.inputMax ?? 1));
    setAttachmentMenuOpen(false);
    setAttachmentSlot(null);
  };

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    setSelectedPhotoCharacterId("");
    setAgentId("");
    setVariantId("");
    setConsent(false);
    setSourceImages([]);
    setGuideDismissed(false);
    setGuideOpen(false);
    setGalleryOpen(false);
    setMediaKind("photo");
    setPhotoMode("i2i");
  };

  const appendTranscript = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setPrompt((current) => {
      const joined = current.trim() ? `${current.trim()} ${next}` : next;
      return joined.slice(0, PROMPT_MAX);
    });
  };

  const stopPromptMic = () => {
    flushAndStopRecorder(recorderRef.current);
    recorderRef.current = null;
    setIsRecording(false);
  };

  const togglePromptMic = async () => {
    if (isRecording) {
      stopPromptMic();
      return;
    }
    if (transcribing || (authReady && !user)) return;
    clearMessages();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      showError(copy.transcribeFailed);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = recorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = cleanAudioMime(recorder.mimeType || mime || "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < MIN_VOICE_BYTES || chunksRef.current.length === 0) {
          showError(copy.transcribeFailed);
          return;
        }
        setTranscribing(true);
        try {
          const dataUrl = await voiceFileDataUrl(blob);
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audioBase64: dataUrl, mime: type, filename: voiceFilename(type) }),
          });
          const payload = await response.json().catch(() => null) as { text?: string } | null;
          if (!response.ok || !payload?.text?.trim()) throw new Error("transcribe");
          appendTranscript(payload.text);
        } catch {
          showError(copy.transcribeFailed);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start(VOICE_RECORDER_TIMESLICE_MS);
    } catch {
      showError(copy.transcribeFailed);
    }
  };

  const studioAgents = useMemo(() => {
    const custom = customAgents.filter((item) => item.context === "images").map((item): ImageAgent => ({
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      mode: "T2I_OR_EDIT",
      inputMin: 0,
      inputMax: 2,
      consentRequired: false,
    }));
    const catalogIds = new Set(agents.map((item) => item.id));
    return [...custom.filter((item) => !catalogIds.has(item.id)), ...agents];
  }, [agents, customAgents]);
  const studioAgentsRef = useRef(studioAgents);
  studioAgentsRef.current = studioAgents;
  const studioVideoAgents = useMemo(() => {
    void catalogAgentVersion;
    return listVisibleAgents().filter((item) => item.category === "video").flatMap((item): StudioVideoAgent[] => {
      const override = getCatalogAgentOverride(item.id);
      const defaults = videoAgentDefaults(item.id);
      const videoMode = override?.videoMode ?? defaults?.videoMode;
      if (!videoMode) return [];
      return [{
        id: item.id,
        name: agentName(item.id, locale) || override?.name || item.name,
        description: agentDescription(item.id, locale) || override?.description || item.description,
        tag: override?.tag ?? defaults?.tag ?? "entertainment",
        providerId: override?.providerId ?? defaults?.providerId ?? "",
        modelId: override?.modelId ?? defaults?.modelId ?? item.modelId,
        videoMode,
        videoUrl: override?.videoUrl ?? defaults?.videoUrl ?? null,
        videoPreviewUrl: override?.videoPreviewUrl ?? defaults?.videoPreviewUrl ?? null,
        coverUrl: override?.coverUrl ?? defaults?.coverUrl ?? null,
        promptPlaceholder: override?.promptPlaceholder ?? defaults?.promptPlaceholder ?? "",
        videoSettings: { ...(defaults?.videoSettings ?? {}), ...(override?.videoSettings ?? {}) },
        guide: defaults?.guide,
        minUserReferences: defaults?.minUserReferences,
        maxUserReferences: defaults?.maxUserReferences,
      }];
    });
  }, [catalogAgentVersion, locale]);

  const urlAgent = searchParams.get("agent") ?? "";
  const urlVideoAgent = searchParams.get("videoAgent") ?? "";
  const urlTemplate = searchParams.get("template") ?? "";
  const urlTab = searchParams.get("tab");

  useEffect(() => {
    if (!isImageStudioPath(pathname)) return;
    const live = liveImageStudioQuery(urlAgent, urlTemplate, urlTab, window.location.search);
    if (!live) return;
    const key = imageStudioQueryKey(live.agent, live.template, live.tab);
    if (appliedQueryRef.current === key) return;
    appliedQueryRef.current = key;
    if (live.tab === "video") setMediaKind("video");
    else if (live.agent || live.template) setMediaKind("photo");
    if (live.agent) {
      const sameAgent = agentIdRef.current === live.agent;
      const found = studioAgentsRef.current.find((item) => item.id === live.agent);
      const preset = defaultImageAgentVariant(live.agent);
      setAgentId(live.agent);
      setTemplateId("");
      if (sameAgent) {
        if (!variantIdRef.current && preset) setVariantId(preset.id);
        return;
      }
      setVariantId(preset?.id ?? "");
      setPrompt("");
      setConsent(false);
      setGalleryOpen(false);
      setGuideOpen(false);
      setGuideDismissed(!imageAgentRequiresPhoto(live.agent));
      applyAgentPreset(live.agent);
      const nextMode = photoModeForAgent(found) ?? (imageAgentRequiresPhoto(live.agent) ? "i2i" : "t2i");
      setPhotoMode(nextMode);
      if (nextMode === "t2i") setSourceImages([]);
      return;
    }
    if (live.template) {
      setTemplateId(live.template);
      setAgentId("");
      setPhotoMode("i2i");
      setGuideDismissed(false);
    }
  }, [pathname, urlAgent, urlTemplate, urlTab]);

  useEffect(() => {
    if (!isImageStudioPath(pathname) || !urlVideoAgent) return;
    if (!studioVideoAgents.some((item) => item.id === urlVideoAgent)) return;
    setVideoAgentId(urlVideoAgent);
    setMediaKind("video");
  }, [pathname, studioVideoAgents, urlVideoAgent]);

  useEffect(() => {
    const preferred = imageAgentPreferredStyle(agentId);
    if (!preferred) return;
    const current = catalog.models.find((item) => item.id === modelId && item.provider === provider);
    if (current?.styles.includes(preferred)) {
      setStyle(preferred);
      setRevealedFilters((prev) => ({ ...prev, style: true }));
    }
  }, [agentId, catalog.models, modelId, provider]);

  const agentMinRefs = Math.max(selectedPhotoCharacterId ? 1 : 0, imageAgentMinReferences(agentId));
  const referenceModels = useMemo(
    () => filterModelsForMinReferences(catalog.models, agentMinRefs),
    [agentMinRefs, catalog.models],
  );
  const providerModels = useMemo(
    () => sortModelsByStrength(referenceModels.filter((item) => item.provider === provider)),
    [provider, referenceModels],
  );
  const model = catalog.models.find((item) => item.id === modelId && item.provider === provider) ?? providerModels[0];
  const formats = model ? (model.formats_by_size?.[size] ?? model.formats) : [];
  const supportedStyles = catalog.styles.filter((item) => model?.styles.includes(item.id));
  const selectedAgent = studioAgents.find((item) => item.id === agentId);
  const selectedVariants = selectedAgent ? imageAgentVariants(selectedAgent.id) : [];
  const photoTemplates = useMemo(() => imageExamplesForModels([], locale), [locale]);
  const selectedTemplate = photoTemplates.find((item) => item.id === templateId);
  const selectedAgentGuide = selectedAgent ? imageAgentGuideAssets(selectedAgent.id) : {};
  const selectedAgentGuideNotice = selectedAgent ? imageAgentGuideNotice(selectedAgent.id, locale) : null;
  const needsPhotoGuide = Boolean(templateId || (agentId && imageAgentRequiresPhoto(agentId)));
  const guideLabels = compareCornerLabels(locale);
  const selectedPhotoCharacter = characters.find((item) => item.id === selectedPhotoCharacterId);
  const sourceLabel = selectedAgent ? (agentName(selectedAgent.id, locale) || selectedAgent.name) : (templateId || UI.noAgent);
  const composerHints = imageAgentComposerCopy(locale);
  const composerPlaceholder = authReady && !user
    ? copy.placeholderGuest
    : selectedAgent
      ? (composerHints.placeholder[selectedAgent.id] ?? (imageAgentRequiresPhoto(selectedAgent.id) ? UI.placeholderPhotoAgent : UI.placeholderCustom))
      : templateId
        ? UI.placeholderTemplate
        : copy.placeholderDefault;
  const selectedAgentGuideMulti = selectedAgent ? imageAgentMultiGuide(selectedAgent.id) : null;
  const selectedAgentRatedGuide = selectedAgent ? imageAgentRatedGuide(selectedAgent.id) : null;
  const sourceActive = Boolean(selectedAgent || templateId);
  const modelPhotoCap = photoReferenceCap(model?.max_reference_images, Boolean(model?.input_image.supported));
  const photoSlots = photoSlotCount({
    photoMode,
    modelCap: modelPhotoCap,
    agentMax: selectedAgent?.inputMax,
    template: Boolean(templateId),
  });
  const photoRequired = Math.min(photoSlots, photoRequiredCount({
    photoMode,
    agentMin: selectedAgent?.inputMin,
    template: Boolean(templateId),
  }));
  const filledPhotos = sourceImages.filter((item): item is SourceImage => Boolean(item));
  const referenceCount = filledPhotos.length + (selectedPhotoCharacterId ? 1 : 0);
  const photoPresence = Array.from({ length: photoSlots }, (_, index) => sourceImages[index] ?? (selectedPhotoCharacter && selectedPhotoCharacterSlot === index ? { dataUrl: selectedPhotoCharacter.previewUrl ?? "character" } : null));
  const photosReady = photoRequiredSlotsFilled(photoPresence, photoRequired);
  useEffect(() => {
    setSourceImages((items) => items.length > photoSlots ? items.slice(0, photoSlots) : items);
    if (selectedPhotoCharacterId && selectedPhotoCharacterSlot >= photoSlots) setSelectedPhotoCharacterSlot(0);
  }, [photoSlots, selectedPhotoCharacterId, selectedPhotoCharacterSlot]);
  const maxFileBytes = Math.min(...[model?.input_image.provider_max_file_bytes, model?.input_image.integrator_max_file_bytes, 20 * 1024 * 1024].filter((value): value is number => typeof value === "number" && value > 0));
  const generations = useMemo(
    () => conversations
      .flatMap((conversation) => conversation.generations)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [conversations],
  );

  function selectModel(next: ImageModel) {
    setModelId(next.id);
    setProvider(next.provider);
    const nextSize = next.sizes[0] ?? "";
    setSize(nextSize);
    setFormat((next.formats_by_size?.[nextSize] ?? next.formats)[0] ?? "");
    setStyle(next.styles.includes("auto") ? "auto" : next.styles[0] ?? "auto");
    setQuality(next.reasoning?.defaultValue ?? next.reasoning?.options[0]?.value ?? "");
    if (!next.input_image.supported) {
      setSourceImages([]);
      setPhotoMode("t2i");
    } else {
      setSourceImages((items) => items.slice(0, photoReferenceCap(next.max_reference_images, true)));
    }
  }

  function applyAgentPreset(agent: string, availableModels: ImageModel[] = catalog.models) {
    const preset = imageAgentPreset(agent);
    if (!preset) return;
    const next = availableModels.find((item) => item.provider === preset.provider && item.id === preset.modelId);
    if (!next) return;
    selectModel(next);
    const nextSize = next.sizes.includes(preset.size) ? preset.size : next.sizes[0] ?? "";
    const nextFormats = next.formats_by_size?.[nextSize] ?? next.formats;
    setSize(nextSize);
    setFormat(nextFormats.includes(preset.format) ? preset.format : nextFormats[0] ?? "");
    setStyle(next.styles.includes(preset.style) ? preset.style : next.styles.includes("auto") ? "auto" : next.styles[0] ?? "auto");
    setRevealedFilters((current) => ({ ...current, size: true, format: true, style: true }));
  }

  const resetAgentOrTemplate = () => {
    setAgentId("");
    setTemplateId("");
    setVariantId("");
    setConsent(false);
    setSourceImages([]);
    setPhotoMode("t2i");
    setGuideOpen(false);
    setGuideDismissed(true);
    setAttachmentMenuOpen(false);
    setAttachmentSlot(null);
    setStyle(model?.styles.includes("auto") ? "auto" : model?.styles[0] ?? "auto");
    setRevealedFilters((current) => ({ ...current, style: false }));
    clearMessages();
  };

  const selectProvider = (value: string) => {
    const next = sortModelsByStrength(referenceModels.filter((item) => item.provider === value))[0];
    if (next) selectModel(next);
  };
  const selectPhotoCharacter = (id: string) => {
    if (id) {
      const capable = model?.input_image.supported && (model.max_reference_images ?? 0) >= 1
        ? model
        : sortModelsByStrength(catalog.models.filter((item) => modelSupportsMinReferences(item, 1)))[0];
      if (!capable) { showError(characterUiCopy(locale).genericError); return; }
      if (capable !== model) selectModel(capable);
      setPhotoMode("i2i");
      const slot = Math.max(0, Math.min(photoSlots - 1, attachmentSlot ?? 0));
      setSelectedPhotoCharacterSlot(slot);
      setSourceImages((items) => items.map((item, index) => index === slot ? null : item));
    }
    setSelectedPhotoCharacterId(id);
    clearMessages();
  };
  useEffect(() => {
    if (agentMinRefs < 2 || !referenceModels.length) return;
    if (model && modelSupportsMinReferences(model, agentMinRefs)) return;
    const next = sortModelsByStrength(referenceModels)[0];
    if (next) selectModel(next);
  }, [agentMinRefs, model, referenceModels]);
  const selectSize = (value: string) => { setSize(value); const next = model?.formats_by_size?.[value] ?? model?.formats ?? []; if (!next.includes(format)) setFormat(next[0] ?? ""); };
  const selectFormat = (value: string) => {
    if (model) {
      setSize(compatibleImageSizeForFormat({
        sizes: model.sizes,
        formatsBySize: model.formats_by_size,
        currentSize: size,
        format: value,
      }));
    }
    setFormat(value);
  };
  const megabytes = (bytes: number) => (bytes / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const showError = (message: string) => { setNotice(null); setError(message); };
  const clearMessages = () => { setNotice(null); setError(null); };
  const unsupportedTransform = () => showError(copy.catalogUnavailable);

  const attachFiles = async (files: FileList | File[], slot?: number | null) => {
    clearMessages();
    if (!model?.input_image.supported) { unsupportedTransform(); return; }
    try {
      const incoming = Array.from(files);
      if (!incoming.length) return;
      const additions: SourceImage[] = [];
      for (const file of incoming) {
        if (file.size > maxFileBytes) throw new Error(text.fileLimitForModel(megabytes(maxFileBytes)));
        const item = await normaliseImage(file, maxFileBytes, text);
        if (item.bytes > maxFileBytes) throw new Error(text.fileLimitForModel(megabytes(maxFileBytes)));
        additions.push(item);
      }
      if (!additions.length) return;
      if (typeof slot === "number" && slot === selectedPhotoCharacterSlot) setSelectedPhotoCharacterId("");
      setSourceImages((items) => {
        const cap = Math.min(4, Math.max(photoSlots, typeof slot === "number" ? slot + 1 : additions.length, 1));
        const next = items.slice(0, cap);
        while (next.length < cap) next.push(null);
        if (typeof slot === "number" && slot >= 0 && slot < next.length) {
          next[slot] = additions[0] ?? null;
          return next;
        }
        let cursor = 0;
        for (let index = 0; index < next.length && cursor < additions.length; index += 1) {
          if (!next[index]) {
            next[index] = additions[cursor];
            cursor += 1;
          }
        }
        return next;
      });
      setPhotoMode("i2i");
      setAttachmentMenuOpen(false);
      setAttachmentSlot(null);
      if (guideOpen) setGuideOpen(false);
    } catch (value) { showError(value instanceof Error ? value.message : text.attachImageFailed); }
  };

  const openSlotMenu = (index: number) => {
    if (authReady && !user) return;
    if (!model?.input_image.supported) { unsupportedTransform(); return; }
    setAttachmentSlot(index);
    setAttachmentMenuOpen((open) => attachmentSlot === index ? !open : true);
  };

  const pasteImages = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    await attachFiles(files);
  };

  const openCamera = async () => {
    clearMessages();
    if (!model?.input_image.supported) { unsupportedTransform(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { showError(text.cameraUnavailable); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } });
    } catch { showError(text.cameraAccessFailed); }
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOpen(false); };
  const capture = async () => { const video = videoRef.current; if (!video) return; const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d")?.drawImage(video, 0, 0); const dataUrl = canvas.toDataURL("image/jpeg", .9); await attachFiles([new File([await (await fetch(dataUrl)).blob()], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })], attachmentSlot); closeCamera(); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !model || (!prompt.trim() && !selectedAgent && !templateId)) return;
    const requestPrice = (tokensForQuality(model, size, quality) ?? 0) * count;
    if (requestPrice > (user.balanceTokens ?? 0)) return;
    if (selectedAgent && (referenceCount < selectedAgent.inputMin || referenceCount > selectedAgent.inputMax)) { showError(text.agentImagesRequired(agentName(selectedAgent.id, locale), selectedAgent.inputMin === selectedAgent.inputMax ? `${selectedAgent.inputMin}` : `${selectedAgent.inputMin}–${selectedAgent.inputMax}`)); return; }
    if (selectedAgent?.consentRequired && !consent) { showError(text.consentRequired); return; }
    if (photoMode === "i2i" && !photosReady) { showError(UI.addPhotoNeeded); return; }
    if (photoMode === "i2i" && filledPhotos.length && !model.input_image.supported) { unsupportedTransform(); return; }
    const usedPrompt = imageAgentVariantNotes(agentId, variantId, prompt);
    const usedImages = filledPhotos;
    const usedMode = photoMode;
    const usedConsent = consent;
    const usedAgentId = agentId;
    const usedCharacterId = selectedPhotoCharacterId;
    const usedCharacterSlot = selectedPhotoCharacterSlot;
    const usedCount = count;
    const pendingId = `pending-${crypto.randomUUID()}`;
    let trackedJobId = pendingId;
    const pendingTokens = (tokensForQuality(model, size, quality) ?? 0) * usedCount;
    setPendingJobs((jobs) => [{ id: pendingId, prompt: usedPrompt, modelLabel: model.label, count: usedCount, status: "creating", billedTokens: pendingTokens, createdAt: new Date().toISOString(), kind: "photo" }, ...jobs]);
    setPrompt("");
    setSourceImages([]);
    setSelectedPhotoCharacterId("");
    setSelectedPhotoCharacterSlot(0);
    setConsent(false);
    setAgentId("");
    setVariantId("");
    setTemplateId("");
    setGuideOpen(false);
    setGuideDismissed(true);
    setPhotoMode("t2i");
    setCount(1);
    setRevealedFilters({ size: false, format: false, quality: false, style: false });
    setStyle(model.styles.includes("auto") ? "auto" : model.styles[0] ?? "auto");
    setSize(model.sizes[0] ?? "");
    setFormat((model.formats_by_size?.[model.sizes[0] ?? ""] ?? model.formats)[0] ?? "");
    setQuality(model.reasoning?.defaultValue ?? model.reasoning?.options[0]?.value ?? "");
    resetComposerHeight();
    clearMessages();
    window.requestAnimationFrame(() => resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
    try {
      const inputImages = usedMode === "i2i" ? usedImages.map((item) => item.dataUrl) : [];
      if (inputImages.some((item) => bytesFromDataUrl(item) > maxFileBytes)) throw new Error(text.fileLimitForModel(megabytes(maxFileBytes)));
      const response = await fetch("/api/images/generations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: model.provider, model: model.id, prompt: usedPrompt, size, format, style, reasoning: quality || undefined, inputImage: inputImages[0], inputImages, sourceImageCount: inputImages.length + (usedCharacterId ? 1 : 0), imageAgentId: usedAgentId || undefined, characterId: usedCharacterId || undefined, characterSlot: usedCharacterSlot, consent: usedConsent, conversationId: activeConversationId || undefined, count: usedCount }) });
      const data = await readGenerationResponse(response, text);
      if (typeof data.balanceTokens === "number") setBalanceTokens(data.balanceTokens);
      const jobId = data.job?.id;
      if (jobId) {
        trackedJobId = jobId;
        setPendingJobs((jobs) => jobs.map((job) => job.id === pendingId ? { ...job, id: jobId } : job));
        const ready = data.generation && data.conversation
          ? data
          : imageResultFromJob(await waitForGenerationJob(jobId));
        if (typeof ready.balanceTokens === "number") setBalanceTokens(ready.balanceTokens);
        if (!ready.generation || !ready.conversation) throw new Error(data.error || text.generationFailed);
        setPendingJobs((jobs) => jobs.filter((job) => job.id !== jobId && job.id !== pendingId));
        addGeneration(ready.generation, ready.conversation);
        return;
      }
      if (!response.ok || !data.generation || !data.conversation) throw new Error(data.error || text.generationFailed);
      setPendingJobs((jobs) => jobs.filter((job) => job.id !== pendingId));
      addGeneration(data.generation, data.conversation);
    } catch (value) {
      if (isPageDisconnect(value)) return;
      setPendingJobs((jobs) => jobs.map((job) => job.id === pendingId || job.id === trackedJobId
        ? { ...job, status: "failed", billedTokens: 0, errorCode: value instanceof GenerationJobError ? value.errorCode : null }
        : job));
      showError(value instanceof Error ? value.message : text.generationFailed);
    }
  };

  const downloadImage = async (url: string, id: string) => {
    const response = await fetch(url);
    if (!response.ok) return showError(text.downloadFailed);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `genora-${id}.${blob.type.includes("jpeg") ? "jpg" : blob.type.split("/")[1] || "png"}`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const shareImage = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const file = new File([blob], `genora-${id}.${blob.type.split("/")[1] || "png"}`, { type: blob.type });
      const absoluteUrl = new URL(url, window.location.origin).href;
      const shareData = { url: absoluteUrl, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) await navigator.share(shareData);
      else if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else if (navigator.share) await navigator.share({ url: absoluteUrl });
      else { await navigator.clipboard.writeText(absoluteUrl); setError(null); setNotice(text.linkCopied); }
    } catch (value) { if ((value as DOMException)?.name !== "AbortError") showError(text.shareFailed); }
  };

  const useAsReference = async (generation: ImageGeneration, imageItem: { id: string; url: string }) => {
    if (mediaKind !== "video" && !model?.input_image.supported) { unsupportedTransform(); return; }
    try {
      const response = await fetch(imageItem.url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const source = await normaliseImage(new File([blob], `genora-${imageItem.id}.png`, { type: blob.type || "image/png" }), mediaKind === "video" ? VIDEO_IMAGE_FILE_MAX_BYTES : maxFileBytes, text);
      if (mediaKind === "video") {
        setVideoSeed(source);
        return;
      }
      setMediaKind("photo");
      setPhotoMode("i2i");
      setSourceImages((items) => {
        const cap = Math.max(1, photoSlots || photoReferenceCap(model?.max_reference_images, true));
        const next = items.slice(0, cap);
        while (next.length < cap) next.push(null);
        const empty = next.findIndex((item) => !item);
        next[empty >= 0 ? empty : 0] = source;
        return next;
      });
      composerRef.current?.focus();
    } catch { showError(text.reuseFailed); }
  };

  const providerChoices = catalog.providers
    .filter((item) => referenceModels.some((modelItem) => modelItem.provider === item.id))
    .map((item) => ({ value: item.id, label: item.label, logoName: item.label }));
  const modelChoices: Choice[] = providerModels.map((item) => ({ value: item.id, label: item.label, description: modelUseDescription(locale, item.id) ?? copy.models[item.id] ?? item.description }));
  const sizeChoices: Choice[] = sortStudioSizes(model?.sizes ?? []).map((item) => ({ value: item, label: item, description: copy.sizes[item] ?? copy.sizeFallback }));
  const formatChoices: Choice[] = (model?.formats ?? formats).map((item) => ({ value: item, label: item, description: copy.formats[item] ?? copy.formatFallback, visual: <RatioIcon value={item}/> }));
  const qualityLabel = (value: string, fallback: string) => imageQualityLabel(value, fallback, t.studio);
  const styleLabel = (id: string, fallback: string) => {
    const labels: Record<string, string> = {
      auto: t.studio.styleAuto,
      photorealistic: t.studio.stylePhotorealistic,
      illustration: t.studio.styleIllustration,
      cinematic: t.studio.styleCinematic,
      minimal: t.studio.styleMinimal,
      three_d: t.studio.style3d,
      cartoon: t.studio.styleCartoon,
    };
    return labels[id] ?? fallback;
  };
  const qualityChoices: Choice[] = model?.reasoning
    ? model.reasoning.options.map((item) => ({ value: item.value, label: qualityLabel(item.value, item.label), description: withCreditGlyphs(qualityHint(model, size, item.value, copy, locale)) }))
    : [{ value: "", label: t.studio.unavailable, description: t.studio.qualityHint, disabled: true }];
  const styleChoices: Choice[] = supportedStyles.map((item) => ({ value: item.id, label: styleLabel(item.id, item.label), description: copy.styleDescs[item.id] ?? item.description, visual: <StyleIcon id={item.id}/> }));
  const revealFilter = (key: keyof typeof revealedFilters) => setRevealedFilters((current) => ({ ...current, [key]: true }));
  const unitPrice = tokensForQuality(model, size, quality) ?? (model ? Object.values(model.token_prices).find((value) => typeof value === "number") ?? null : null);
  const totalPrice = unitPrice != null ? unitPrice * count : null;
  const shortOnFunds = totalPrice != null && (user?.balanceTokens ?? 0) < totalPrice;
  const libraryProviders = [...new Set(generations.map((item) => item.provider).filter(Boolean))];
  const libraryModels = [...new Set(generations.map((item) => item.modelLabel).filter(Boolean))];
  const visibleGenerations = generations.filter((item) => {
    const kind = item.kind ?? "photo";
    if (typeFilter === "photo" && kind !== "photo") return false;
    if (typeFilter === "video" && kind !== "video") return false;
    if (soundFilter !== "all" && (kind !== "video" || item.sound !== soundFilter)) return false;
    if (libraryProvider !== "all" && item.provider !== libraryProvider) return false;
    if (libraryModel !== "all" && item.modelLabel !== libraryModel) return false;
    if (favoritesOnly && !item.images.some((imageItem) => favorites.includes(imageItem.id))) return false;
    return true;
  }).map((item) => favoritesOnly
    ? { ...item, images: item.images.filter((imageItem) => favorites.includes(imageItem.id)) }
    : item);
  const visiblePending = favoritesOnly ? [] : pendingJobs.filter((job) => typeFilter === "all" || (job.kind ?? "photo") === typeFilter);
  const dismissPendingJob = async (job: PendingImageJob) => {
    setPendingJobs((items) => items.filter((item) => item.id !== job.id));
    const path = job.kind === "video" ? `/api/video/jobs/${encodeURIComponent(job.id)}` : `/api/generation-jobs/${encodeURIComponent(job.id)}`;
    await fetch(path, { method: "DELETE" }).catch(() => undefined);
  };
  const setSoundAndType = (value: string) => {
    setSoundFilter(value);
    if (value !== "all") setTypeFilter("video");
  };
  const setTypeAndSound = (value: string) => {
    setTypeFilter(value);
    if (value !== "video") setSoundFilter("all");
  };

  const pendingCards = visiblePending.flatMap((job) => Array.from({ length: job.count }, (_, index) => ({ key: `${job.id}-${index}`, kind: "pending" as const, job, createdAt: job.createdAt })));
  const readyCards = visibleGenerations.flatMap((generation) => generation.images.map((imageItem, imageIndex) => ({
    key: imageItem.id,
    kind: "ready" as const,
    createdAt: generation.createdAt,
    generation,
    imageItem,
    imageIndex,
  })));
  const libraryCards = [...pendingCards, ...readyCards].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  useEffect(() => {
    setLibraryLimit(4);
  }, [typeFilter, libraryProvider, libraryModel, soundFilter, favoritesOnly]);

  useEffect(() => {
    const node = librarySentinelRef.current;
    const root = resultsRef.current?.parentElement;
    if (!node || libraryCards.length <= libraryLimit) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setLibraryLimit((current) => current + 8);
    }, { root, rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [libraryCards.length, libraryLimit]);

  return <main className="flex min-h-0 flex-col bg-bg lg:h-[calc(100dvh-60px)] lg:flex-row lg:overflow-hidden">
    <section data-lenis-prevent className="border-b border-border px-4 py-4 lg:min-h-0 lg:max-w-[460px] lg:flex-1 lg:overflow-y-auto lg:border-b-0 lg:border-e lg:px-5">
      <div className="flex gap-6 border-b border-border pb-2">
        {(["photo", "video"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMediaKind(item)} className={cn("pb-1 text-base font-semibold", mediaKind === item ? "border-b-2 border-text text-text" : "text-steel")}>
            {item === "photo" ? videoStudioUiCopy(locale).photo : videoStudioUiCopy(locale).video}
          </button>
        ))}
      </div>

      <div className={cn(mediaKind !== "video" && "hidden")}>
        <VideoStudioPanel
          locale={locale}
          copy={copy}
          text={text}
          user={user}
          authReady={authReady}
          catalog={videoCatalog}
          characters={characters}
          initialCharacterId={searchParams.get("character") ?? ""}
          loading={videoLoading}
          error={error}
          notice={notice}
          activeConversationId={activeConversationId}
          addGeneration={addGeneration}
          setBalanceTokens={setBalanceTokens}
          setPendingJobs={setPendingJobs}
          showError={showError}
          clearMessages={clearMessages}
          resultsRef={resultsRef}
          seedImage={videoSeed}
          onSeedConsumed={() => setVideoSeed(null)}
          onOpenGallery={(tab) => { setGalleryTab(tab); setGalleryOpen(true); }}
          videoAgents={studioVideoAgents}
          selectedVideoAgentId={videoAgentId}
          onSelectedVideoAgentChange={setVideoAgentId}
        />
      </div>
      <div className={cn(mediaKind !== "photo" && "hidden")}>
        <form onSubmit={submit}>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["t2i", "i2i"] as const).map((item) => (
              <button key={item} type="button" disabled={item === "i2i" && !model?.input_image.supported} onClick={() => { setPhotoMode(item); if (item === "t2i") { setSourceImages([]); setSelectedPhotoCharacterId(""); } }} className={cn("h-11 rounded-xl border text-sm font-semibold", photoMode === item ? "border-accent-brand bg-accent-brand/10 text-text" : "border-border bg-surface text-steel", item === "i2i" && !model?.input_image.supported && "cursor-not-allowed opacity-40")}>
                {item === "t2i" ? UI.t2i : UI.i2i}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ProviderMenuSelect value={provider} options={providerChoices} onChange={selectProvider} label={UI.provider} className="h-11" highlight={Boolean(provider)} />
            <ChoiceSelect value={model?.id ?? ""} choices={modelChoices} highlight={Boolean(model?.id)} onChange={(value) => { const next = catalog.models.find((item) => item.provider === provider && item.id === value); if (next) selectModel(next); }} />
          </div>

          <button
            type="button"
            onClick={() => { setGalleryTab("photo"); setGalleryOpen(true); }}
            className={cn("relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-10 text-sm font-semibold hover:bg-mist", sourceActive ? "border-accent-brand bg-accent-brand/10 text-text ring-2 ring-accent-brand/20" : "border-border bg-surface text-text")}
          >
            <LayoutTemplate className="size-4 shrink-0 text-accent-brand" />
            <span>{UI.agentsTemplates}</span>
            <ChevronRight className="absolute right-3 size-4 text-steel" />
          </button>

          <div className={cn("relative mt-4 rounded-[24px] border bg-bg p-2 shadow-[0_10px_32px_-20px_rgba(15,40,80,.45)] focus-within:border-accent-brand/50 focus-within:ring-2 focus-within:ring-accent-brand/10", sourceActive ? "border-accent-brand ring-2 ring-accent-brand/20" : "border-border")}>
            <div className="relative flex items-start justify-between gap-2 px-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-1.5 pr-24">
                {needsPhotoGuide && !guideDismissed ? (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    aria-label={UI.guideBell}
                    title={UI.guideBell}
                    className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-accent-brand/40 bg-accent-brand/10 text-accent-brand hover:bg-accent-brand/15"
                  >
                    <span className="studio-bell-pulse absolute inset-1 rounded-full bg-accent-brand/35" aria-hidden />
                    <Bell className="studio-bell relative size-6" />
                  </button>
                ) : null}
              </div>
              {sourceActive ? (
                <span className="absolute left-1/2 top-1 z-10 flex max-w-[52%] -translate-x-1/2 items-center gap-1 rounded-full bg-accent-brand/25 py-1 ps-2.5 pe-1 text-xs font-semibold text-text">
                  <span className="truncate">{sourceLabel}</span>
                  <button type="button" onClick={resetAgentOrTemplate} className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface/70" aria-label={characterUiCopy(locale).cancel} title={characterUiCopy(locale).cancel}><X className="size-3.5" /></button>
                </span>
              ) : (
                <span className={cn("pointer-events-none absolute left-1/2 top-1 z-10 max-w-[46%] -translate-x-1/2 truncate rounded-full px-2.5 py-1 text-center text-xs font-semibold text-text", sourceActive ? "bg-accent-brand/25" : "bg-accent-brand/15")}>{sourceLabel}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {isRecording ? (
                  <div className="mr-1 flex items-center gap-1" aria-hidden>
                    <span className="mr-1 text-xs tabular-nums text-destructive">0:{String(recordingSeconds).padStart(2, "0")}</span>
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span key={bar} className="w-0.5 animate-pulse rounded-full bg-destructive" style={{ height: `${8 + ((bar * 5) % 14)}px`, animationDelay: `${bar * 90}ms` }} />
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={isRecording ? UI.micStop : UI.mic}
                  title={isRecording ? UI.micStop : UI.mic}
                  disabled={authReady && !user}
                  onClick={() => void togglePromptMic()}
                  className={cn("grid size-8 shrink-0 place-items-center rounded-lg", isRecording ? "bg-destructive/10 text-destructive" : "text-steel hover:bg-mist hover:text-text", (authReady && !user) && "cursor-not-allowed opacity-40")}
                >
                  {transcribing ? <LoaderCircle className="size-4 animate-spin" /> : isRecording ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
                </button>
              </div>
            </div>
            <textarea ref={composerRef} value={prompt} disabled={authReady && !user} onChange={(event) => updatePrompt(event.target.value, event.currentTarget)} onPaste={(event) => { if (photoMode === "i2i") void pasteImages(event); }} placeholder={composerPlaceholder} className="min-h-28 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm leading-relaxed text-text outline-none placeholder:text-steel/75 disabled:cursor-not-allowed disabled:opacity-70" maxLength={PROMPT_MAX} />
            <div className="flex items-end justify-between gap-2 px-1 pb-1">
              <div className="flex min-w-0 flex-wrap items-end gap-2">
                {selectedVariants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={copy.variant}
                    aria-label={copy.variant}
                    aria-pressed={variantId === item.id}
                    onClick={() => setVariantId(item.id)}
                    className={cn(VARIANT_THUMB_CLASS, variantId === item.id ? "border-accent-brand ring-2 ring-accent-brand/30" : "border-border")}
                  >
                    <Image src={item.thumb} alt={copy.variant} fill unoptimized className="object-cover" />
                  </button>
                ))}
              </div>
              <button type="button" aria-label={UI.expandPrompt} title={UI.expandPrompt} onPointerDown={startPromptResize} onDoubleClick={() => setEditorOpen(true)} className="grid size-8 shrink-0 cursor-ns-resize place-items-center rounded-lg text-steel hover:bg-mist hover:text-text">
                <ChevronsUpDown className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <ChoiceSelect compact prefix={t.studio.size} placeholder={t.studio.size} value={size} choices={sizeChoices} revealed={revealedFilters.size} onReveal={() => revealFilter("size")} onChange={(value) => { selectSize(value); revealFilter("size"); }} />
                <ChoiceSelect compact prefix={t.studio.format} placeholder={t.studio.format} value={format} choices={formatChoices} revealed={revealedFilters.format} onReveal={() => revealFilter("format")} onChange={(value) => { selectFormat(value); revealFilter("format"); }} />
                <ChoiceSelect compact prefix={t.studio.quality} placeholder={t.studio.quality} value={quality} choices={qualityChoices} revealed={revealedFilters.quality} onReveal={() => revealFilter("quality")} onChange={(value) => { setQuality(value); revealFilter("quality"); }} disabled={!model?.reasoning} />
              </div>
              <CountPicker copy={copy} value={count} onChange={setCount} />
            </div>
          </div>

          {photoSlots > 0 ? (
            <div className="mt-4 flex justify-center gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={(event) => { void attachFiles(event.target.files ?? [], attachmentSlot); event.currentTarget.value = ""; }} />
              {Array.from({ length: photoSlots }, (_, index) => {
                const item = sourceImages[index];
                const characterInSlot = Boolean(selectedPhotoCharacterId) && selectedPhotoCharacterSlot === index;
                const missing = index < photoRequired && !item && !characterInSlot;
                const slotHint = selectedAgent ? imageAgentSlotHint(selectedAgent.id, index, locale) : null;
                const slotTitle = slotHint ? `${photoSlotLabel(locale, index)}. ${slotHint}` : photoSlotLabel(locale, index);
                return (
                  <div key={index} ref={attachmentSlot === index ? attachmentMenuRef : undefined} className="relative">
                    <button
                      type="button"
                      onClick={() => openSlotMenu(index)}
                      aria-label={slotTitle}
                      title={slotTitle}
                      aria-expanded={attachmentMenuOpen && attachmentSlot === index}
                      disabled={authReady && !user}
                      className={cn("relative flex aspect-[3/4] w-[4.75rem] flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface px-1 text-accent-brand hover:bg-mist sm:w-20", missing ? "border-destructive" : "border-border", (authReady && !user) && "cursor-not-allowed opacity-40")}
                    >
                      {!item && !missing ? (
                        <span className="mb-0.5 px-0.5 text-center text-[8px] font-medium leading-tight text-steel">
                          {photoSlotLabel(locale, index)}
                          {slotHint ? <span className="mt-0.5 block text-[7px] font-normal">{slotHint}</span> : null}
                        </span>
                      ) : null}
                      {missing ? (
                        <span className="mb-0.5 px-0.5 text-center text-[8px] font-medium leading-tight text-destructive">
                          {photoSlotLabel(locale, index)}
                          {slotHint ? <span className="mt-0.5 block text-[7px] font-normal">{slotHint}</span> : null}
                        </span>
                      ) : null}
                      {characterInSlot && selectedPhotoCharacter?.previewUrl ? <Image src={selectedPhotoCharacter.previewUrl} alt={selectedPhotoCharacter.name} fill unoptimized className="object-contain" /> : item ? <Image src={item.dataUrl} alt={item.name} fill unoptimized className={selectedAgent?.id === "face-swap" && index === 0 ? "object-contain" : "object-cover"} /> : <Plus className="size-6" />}
                      {item || characterInSlot ? <span className="absolute inset-x-0 bottom-0 z-[1] bg-black/55 px-1 py-0.5 text-center text-[8px] font-medium leading-tight text-white">{characterInSlot ? selectedPhotoCharacter?.name : photoSlotLabel(locale, index)}{!characterInSlot && slotHint ? ` · ${slotHint}` : ""}</span> : null}
                    </button>
                    {item || characterInSlot ? (
                      <button type="button" onClick={() => { if (characterInSlot) setSelectedPhotoCharacterId(""); else setSourceImages((items) => items.map((current, itemIndex) => itemIndex === index ? null : current)); }} aria-label={copy.removeImage} className="absolute -right-1 -top-1 z-[2] rounded-full bg-black/65 p-0.5 text-white"><X className="size-3" /></button>
                    ) : null}
                    {attachmentMenuOpen && attachmentSlot === index ? (
                      <div role="menu" className="absolute bottom-[calc(100%+.5rem)] start-1/2 z-[90] w-52 -translate-x-1/2 rounded-2xl border border-border bg-surface p-1.5 shadow-2xl">
                        <button type="button" role="menuitem" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><ImagePlus className="size-4 text-accent-brand" />{copy.addPhoto}</button>
                        <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); void openCamera(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><Camera className="size-4 text-accent-brand" />{copy.takePhoto}</button>
                        <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); setCharacterPickerOpen(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><UserRound className="size-4 text-accent-brand" />{characterPickerLabel(locale)}</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="mt-3">
            <ChoiceSelect value={style} choices={styleChoices} placeholder={t.studio.styles} leading={<Palette className="size-4 shrink-0 text-accent-brand" />} revealed={revealedFilters.style} revealOnOpen onReveal={() => revealFilter("style")} onChange={(value) => { setStyle(value); revealFilter("style"); }} center highlight={revealedFilters.style && Boolean(style) && style !== "auto"} />
          </div>

          {notice ? <p className="mt-3 text-sm text-emerald-600" role="status">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive" role="alert">{promptErrorMessage(error, locale)}</p> : null}
          {selectedAgent?.consentRequired ? <label className="mt-3 flex items-center gap-1.5 text-xs text-steel"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{copy.consent}</label> : null}

          {!authReady ? (
            <div className="mt-6 grid h-12 place-items-center"><LoaderCircle className="size-5 animate-spin text-accent-brand" /></div>
          ) : (
            <div className="mt-6 flex items-stretch gap-2">
              {user ? (
                <Button type="submit" disabled={!catalog.available || shortOnFunds || !photosReady || (selectedAgent != null && referenceCount < selectedAgent.inputMin) || (selectedAgent && !imageAgentRequiresPhoto(selectedAgent.id) && !prompt.trim()) || (!prompt.trim() && !selectedAgent && !templateId)} className={cn("h-auto min-h-12 flex-1 flex-col gap-0.5 whitespace-normal py-2", shortOnFunds && "disabled:opacity-100")}>
                  <span className={cn(shortOnFunds && "opacity-50")}>{withCreditGlyphs(`${UI.generate}${totalPrice != null ? ` ${formatTokensAsCredits(totalPrice, locale, "price")}` : ""}`)}</span>
                  {shortOnFunds ? <span className="text-[11px] font-medium leading-none text-red-500">{UI.noFunds}</span> : null}
                </Button>
              ) : (
                <Button nativeButton={false} className="h-12 min-h-12 flex-1" render={<Link href="/register" />}>{copy.register}</Button>
              )}
            </div>
          )}
        </form>
      </div>
    </section>

    <section data-lenis-prevent className="flex min-w-0 flex-col bg-[#f3f6f8] px-4 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 dark:bg-slate-950" aria-label={UI.library}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text">{UI.library}</h2>
        <button
          type="button"
          aria-pressed={favoritesOnly}
          aria-label={favoritesOnly ? UI.filterFavoritesOff : UI.filterFavorites}
          title={favoritesOnly ? UI.filterFavoritesOff : UI.filterFavorites}
          onClick={() => setFavoritesOnly((current) => !current)}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-mist",
            favoritesOnly ? "text-rose-500" : "text-steel",
          )}
        >
          <Heart className={cn("size-5", favoritesOnly && "fill-current")} />
        </button>
      </div>
      <p className="mt-1 text-sm text-steel">{UI.libraryLead}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="min-w-0">
          <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{UI.filterType}</span>
          <SelectMenu ariaLabel={UI.filterType} value={typeFilter} highlight={typeFilter !== "all"} options={[{ value: "all", label: UI.filterAll }, { value: "photo", label: UI.typePhoto }, { value: "video", label: UI.typeVideo }]} onChange={setTypeAndSound} />
        </div>
        <div className="min-w-0">
          <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{UI.filterProvider}</span>
          <SelectMenu ariaLabel={UI.filterProvider} value={libraryProvider} highlight={libraryProvider !== "all"} options={[{ value: "all", label: UI.filterAll }, ...libraryProviders.map((item) => ({ value: item, label: catalog.providers.find((providerItem) => providerItem.id === item)?.label ?? videoCatalog.providers.find((providerItem) => providerItem.id === item)?.label ?? item }))]} onChange={setLibraryProvider} />
        </div>
        <div className="min-w-0">
          <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{UI.filterModel}</span>
          <SelectMenu ariaLabel={UI.filterModel} value={libraryModel} highlight={libraryModel !== "all"} options={[{ value: "all", label: UI.filterAll }, ...libraryModels.map((item) => ({ value: item, label: item }))]} onChange={setLibraryModel} />
        </div>
        <div className={cn("min-w-0", typeFilter !== "video" && "opacity-40")}>
          <span className="mb-1 block px-0.5 text-[11px] leading-none text-steel">{UI.filterSound}</span>
          <SelectMenu ariaLabel={UI.filterSound} value={soundFilter} highlight={soundFilter !== "all"} options={[{ value: "all", label: UI.filterAll }, { value: "on", label: UI.soundOn }, { value: "off", label: UI.soundOff }]} onChange={(value) => { if (typeFilter !== "video" && value !== "all") setTypeAndSound("video"); setSoundAndType(value); }} />
        </div>
      </div>
      <div ref={resultsRef} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {user && historyLoading ? <div className="col-span-full grid place-items-center py-16"><LoaderCircle className="size-7 animate-spin text-accent-brand" /></div> : null}
        {user && historyLoadFailed && !historyLoading ? <button type="button" className="col-span-full py-4 text-sm text-destructive" onClick={() => { window.dispatchEvent(new Event("genora-history-refresh")); }}>{apiAppCopy(locale).imagesHistoryFailed} ↻</button> : null}
        {!user && !loading ? <p className="col-span-full py-16 text-center text-sm text-steel">{UI.loginLibrary}</p> : null}
        {user && !historyLoading && !visibleGenerations.length && !visiblePending.length ? <p className="col-span-full py-16 text-center text-sm text-steel">{favoritesOnly ? UI.emptyFavorites : UI.emptyLibrary}</p> : null}
        {libraryCards.slice(0, libraryLimit).map((card) => card.kind === "pending" ? (
          <PendingCard key={card.key} job={card.job} locale={locale} deleteLabel={deleteCopy.title} onDismiss={() => setPendingJobDelete(card.job)} onShowPrompt={() => setPromptOpen({ prompt: card.job.prompt, title: "", assetId: card.job.id, kind: card.job.kind ?? "photo", editable: false })} />
        ) : (
          <ResultCard
            key={card.key}
            copy={copy}
            locale={locale}
            deleteLabel={t.workspace.deleteConfirm}
            generation={card.generation}
            imageItem={card.imageItem}
            imageIndex={card.imageIndex}
            liked={favorites.includes(card.imageItem.id)}
            onPreview={(url, alt) => setPreviewMedia({ kind: card.generation.kind === "video" ? "video" : "photo", url, alt })}
            onShowPrompt={() => setPromptOpen({ prompt: card.generation.prompt, title: card.imageItem.title ?? "", assetId: card.imageItem.id, kind: card.generation.kind ?? "photo", editable: true })}
            onShare={shareImage}
            onDownload={downloadImage}
            onReuse={useAsReference}
            onFavorite={() => { if (user) setFavorites(toggleGalleryFavorite(user.id, card.imageItem.id)); }}
            onDelete={() => setPendingDelete(card.generation)}
          />
        ))}
        {libraryCards.length > libraryLimit ? <div ref={librarySentinelRef} className="col-span-full h-8" aria-hidden /> : null}
      </div>
    </section>

    {galleryOpen ? createPortal(
      <AgentsTemplatesGallery
        tab={galleryTab}
        onTabChange={setGalleryTab}
        agents={[
          ...studioAgents.map((item) => ({ id: item.id, name: item.name, description: item.description, category: "images" as const })),
          ...studioVideoAgents.map((item) => ({ ...item, category: "video" as const })),
        ]}
        selectedAgentId={agentId}
        selectedTemplateId={templateId}
        onChooseAgent={chooseAgent}
        onChooseVideoAgent={(id) => { setVideoAgentId(id); setGalleryOpen(false); setMediaKind("video"); }}
        onChooseTemplate={chooseTemplate}
        onClose={() => setGalleryOpen(false)}
      />,
      document.body,
    ) : null}
    {editorOpen ? createPortal(
      <div className="fixed inset-0 z-[400] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={UI.expandPromptFull} onClick={() => setEditorOpen(false)}>
        <div className="flex h-[min(86dvh,760px)] w-full max-w-3xl flex-col rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text">{UI.promptTitle}</h3>
            <button type="button" aria-label={copy.close} onClick={() => setEditorOpen(false)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-mist"><X className="size-4" /></button>
          </div>
          <div className="relative min-h-0 flex-1">
            <textarea
              value={prompt}
              disabled={authReady && !user}
              onChange={(event) => setPrompt(event.target.value.slice(0, PROMPT_MAX))}
              placeholder={composerPlaceholder}
              className="h-full min-h-0 w-full resize-none rounded-xl border border-border bg-bg px-4 pb-8 pt-3 text-sm leading-relaxed text-text outline-none placeholder:text-steel/75 focus:border-accent-brand disabled:cursor-not-allowed disabled:opacity-70"
              maxLength={PROMPT_MAX}
              autoFocus
            />
            <p className="pointer-events-none absolute bottom-2.5 end-3 text-xs tabular-nums text-steel" aria-live="polite">
              {prompt.length.toLocaleString(locale)} / {PROMPT_MAX.toLocaleString(locale)}
            </p>
          </div>
        </div>
      </div>,
      document.body,
    ) : null}
    {promptOpen !== null ? createPortal(
      <div className="fixed inset-0 z-[400] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={mediaTitleCopy(locale).prompt} onClick={() => setPromptOpen(null)}>
        <MediaPromptDialog key={`${promptOpen.kind}:${promptOpen.assetId}`} locale={locale} prompt={promptOpen.prompt} title={promptOpen.title} closeLabel={copy.close}
          onClose={() => setPromptOpen(null)} onSave={promptOpen.editable === false ? undefined : (title) => renameMedia(promptOpen.kind, promptOpen.assetId, title)}
          copyButton={<PromptCopyButton text={promptOpen.prompt} />} />
      </div>,
      document.body,
    ) : null}
    {guideOpen && (selectedTemplate || selectedAgent) ? createPortal(
      <div className="fixed inset-0 z-[400] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="photo-guide-title" onClick={() => setGuideOpen(false)}>
        <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <h3 id="photo-guide-title" className="text-center text-xl font-semibold text-text">{UI.uploadPhoto}</h3>
          {selectedAgentGuideNotice ? <p className="mt-2 text-center text-sm font-semibold text-accent-brand">{selectedAgentGuideNotice}</p> : null}
          {selectedAgentGuideMulti ? (
            <>
              <div className={cn("mt-5 grid gap-3", selectedAgentGuideMulti.sources.length > 2 ? "grid-cols-3" : "grid-cols-2")}>
                {selectedAgentGuideMulti.sources.map((src, index) => {
                  const caption = selectedAgentGuideMulti.sourceCaption === "good" ? UI.exampleGood : photoSlotLabel(locale, index);
                  const hint = selectedAgent ? imageAgentSlotHint(selectedAgent.id, index, locale) : null;
                  return (
                    <figure key={src} className="relative">
                      <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                        <Image src={src} alt={hint ? `${caption}. ${hint}` : caption} fill unoptimized className={selectedAgentGuideMulti.sourceClassNames?.[index] ?? "object-contain"} />
                      </span>
                      <figcaption className="mt-1.5 text-center text-[11px] font-medium text-text">
                        {caption}
                        {hint ? <span className="mt-0.5 block text-[10px] font-normal text-steel">{hint}</span> : null}
                      </figcaption>
                      {selectedAgentGuideMulti.sourceCaption === "good" ? (
                        <CheckCircle2 className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-emerald-500" aria-hidden />
                      ) : null}
                    </figure>
                  );
                })}
              </div>
              <p className="mt-5 text-center text-sm text-steel">{UI.uploadPhotoLead}</p>
              <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl bg-mist">
                <Image src={selectedAgentGuideMulti.result} alt={UI.uploadPhotoLead} fill unoptimized className="object-contain" />
              </div>
            </>
          ) : selectedAgentRatedGuide ? (
            <div className="mt-5 grid grid-cols-3 gap-3">
              {selectedAgentRatedGuide.good.map((src) => (
                <figure key={src} className="relative">
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                    <Image src={src} alt={UI.exampleGood} fill unoptimized className={selectedAgentRatedGuide.objectFit === "contain" ? "object-contain" : "object-cover"} />
                  </span>
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{UI.exampleGood}</figcaption>
                  <CheckCircle2 className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-emerald-500" aria-hidden />
                </figure>
              ))}
              <figure className="relative">
                <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                  <Image src={selectedAgentRatedGuide.bad} alt={UI.exampleBad} fill unoptimized className={selectedAgentRatedGuide.objectFit === "contain" ? "object-contain" : "object-cover"} />
                </span>
                <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{UI.exampleBad}</figcaption>
                <CircleX className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-red-500" aria-hidden />
              </figure>
              {selectedAgentRatedGuide.uploadFromGuide ? (
                <button type="button" onClick={() => guideFileRef.current?.click()} className="relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-bg hover:bg-mist" aria-label={UI.uploadHere}>
                  <span className="grid size-14 place-items-center rounded-full bg-accent-brand text-white"><Plus className="size-7" /></span>
                  <input ref={guideFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={(event) => { void attachFiles(event.target.files ?? []); event.currentTarget.value = ""; }} />
                </button>
              ) : null}
            </div>
          ) : selectedTemplate || (selectedAgent && imageAgentUsesOldGuide(selectedAgent.id)) ? (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <figure className="relative">
                <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                  <Image src="/image-guide/face-good.jpg" alt={UI.exampleGood} fill unoptimized className="object-cover" />
                </span>
                <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{UI.exampleGood}</figcaption>
                <CheckCircle2 className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-emerald-500" aria-hidden />
              </figure>
              <figure className="relative">
                <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                  <Image src="/image-guide/face-bad.jpg" alt={UI.exampleBad} fill unoptimized className="object-cover" />
                </span>
                <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{UI.exampleBad}</figcaption>
                <CircleX className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-red-500" aria-hidden />
              </figure>
              <button type="button" onClick={() => guideFileRef.current?.click()} className="relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-bg hover:bg-mist" aria-label={UI.uploadHere}>
                <span className="grid size-14 place-items-center rounded-full bg-accent-brand text-white"><Plus className="size-7" /></span>
                <input ref={guideFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={(event) => { void attachFiles(event.target.files ?? []); event.currentTarget.value = ""; }} />
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-3">
              {selectedAgentGuide.before ? (
                <figure>
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                    <Image src={selectedAgentGuide.before} alt={guideLabels.before} fill unoptimized className="object-contain" />
                  </span>
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{guideLabels.before}</figcaption>
                </figure>
              ) : null}
              {selectedAgentGuide.after || selectedAgentGuide.still ? (
                <figure>
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                    <Image src={selectedAgentGuide.after ?? selectedAgentGuide.still ?? ""} alt={guideLabels.after} fill unoptimized className="object-contain" />
                  </span>
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{selectedAgentGuide.after ? guideLabels.after : sourceLabel}</figcaption>
                </figure>
              ) : null}
              {selectedAgent && imageAgentHidesGuideUpload(selectedAgent.id) ? null : (
                <button type="button" onClick={() => guideFileRef.current?.click()} className="relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-bg hover:bg-mist" aria-label={UI.uploadHere}>
                  <span className="grid size-14 place-items-center rounded-full bg-accent-brand text-white"><Plus className="size-7" /></span>
                  <input ref={guideFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={(event) => { void attachFiles(event.target.files ?? []); event.currentTarget.value = ""; }} />
                </button>
              )}
            </div>
          )}
          {!selectedAgentGuideMulti ? (
            <>
              <p className="mt-5 text-center text-sm text-steel">{UI.uploadPhotoLead}</p>
              {selectedVariants.length ? (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {selectedVariants.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={copy.variant}
                      aria-label={copy.variant}
                      aria-pressed={variantId === item.id}
                      onClick={() => setVariantId(item.id)}
                      className={cn(VARIANT_THUMB_CLASS, variantId === item.id ? "border-accent-brand ring-2 ring-accent-brand/30" : "border-border")}
                    >
                      <Image src={item.thumb} alt={copy.variant} fill unoptimized className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl bg-mist">
                <Image src={selectedVariants.find((item) => item.id === variantId)?.thumb ?? selectedTemplate?.image ?? selectedAgentGuide.after ?? selectedAgentGuide.still ?? selectedAgentGuide.before ?? "/agents/preview-after.jpg"} alt={sourceLabel} fill unoptimized className={selectedTemplate ? "object-cover" : "object-contain"} />
              </div>
            </>
          ) : null}
          <Button type="button" variant="secondary" className="mt-5 h-11 w-full" onClick={() => { setGuideOpen(false); setGuideDismissed(true); }}>{UI.guideClose}</Button>
        </div>
      </div>,
      document.body,
    ) : null}
    {cameraOpen ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={copy.cameraTitle}><div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-surface p-4"><video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-2xl bg-black object-cover"/><div className="mt-4 flex justify-between"><Button type="button" variant="secondary" onClick={closeCamera}>{copy.cameraCancel}</Button><Button type="button" onClick={() => void capture()}><Camera className="size-4"/>{copy.cameraCapture}</Button></div></div></div> : null}
    <CharacterPickerDialog locale={locale} characters={characters} selectedId={selectedPhotoCharacterId} open={characterPickerOpen} onClose={() => setCharacterPickerOpen(false)} onChange={selectPhotoCharacter} />
    {previewMedia
      ? createPortal(
          <div
            data-lenis-prevent
            className="fixed inset-0 z-[400] cursor-zoom-out bg-black/85"
            role="dialog"
            aria-modal="true"
            aria-label={copy.previewAria}
            onClick={() => setPreviewMedia(null)}
          >
            <button
              type="button"
              aria-label={copy.closeImage}
              title={copy.close}
              onClick={() => setPreviewMedia(null)}
              className="fixed left-4 top-4 z-[410] grid size-12 place-items-center rounded-full border-2 border-white bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:bg-neutral-800"
            >
              <X className="size-6" strokeWidth={2.5} />
            </button>
            {previewMedia.kind === "video" ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                onClick={(event) => event.stopPropagation()}
                className="absolute left-1/2 top-1/2 max-h-[90dvh] max-w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 cursor-default rounded-2xl bg-black shadow-2xl"
              />
            ) : (
              <RetryPreviewImage
                url={previewMedia.url}
                alt={previewMedia.alt}
                onClick={(event) => event.stopPropagation()}
                className="absolute left-1/2 top-1/2 max-h-[90dvh] max-w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 cursor-default rounded-2xl object-contain shadow-2xl"
              />
            )}
          </div>,
          document.body,
        )
      : null}
    {pendingDelete ? (
      <ConfirmActionDialog
        title={deleteCopy.title}
        cancelLabel={deleteCopy.cancel}
        confirmLabel={deleteCopy.confirm}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          const requestId = pendingDelete.requestId;
          setPendingDelete(null);
          void deleteGeneration(requestId);
        }}
      />
    ) : null}
    {pendingJobDelete ? (
      <ConfirmActionDialog
        title={deleteCopy.title}
        cancelLabel={deleteCopy.cancel}
        confirmLabel={deleteCopy.confirm}
        onClose={() => setPendingJobDelete(null)}
        onConfirm={() => {
          const job = pendingJobDelete;
          setPendingJobDelete(null);
          void dismissPendingJob(job);
        }}
      />
    ) : null}
  </main>;
}

const VIDEO_MODES: StudioVideoMode[] = ["t2v", "animate", "i2v", "v2v"];
const STUDIO_KIND_KEY = "genora-studio-kind";

function FitModeLabel({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [small, setSmall] = useState(false);
  useLayoutEffect(() => {
    setSmall(false);
  }, [children]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || small) return;
    if (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1) setSmall(true);
  }, [children, small]);
  return <span ref={ref} className={cn("min-w-0 max-h-9 overflow-hidden text-center font-semibold leading-[1.1]", small ? "text-[9px]" : "text-[13px]")}>{children}</span>;
}

function VideoPromptTextarea({
  value,
  acceptedChars,
  disabled,
  placeholder,
  textareaRef,
  containerClassName,
  textareaClassName,
  mirrorClassName,
  autoFocus,
  onValueChange,
}: {
  value: string;
  acceptedChars: number;
  disabled: boolean;
  placeholder: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  containerClassName?: string;
  textareaClassName: string;
  mirrorClassName: string;
  autoFocus?: boolean;
  onValueChange: (value: string, target: HTMLTextAreaElement) => void;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const parts = splitVideoPrompt(value, acceptedChars);
  return (
    <div className={cn("relative", containerClassName)}>
      <div ref={mirrorRef} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words", mirrorClassName)}>
        <span className="text-text">{parts.accepted}</span>
        <span className="text-destructive">{parts.overflow}</span>
        {value.endsWith("\n") ? "\u00a0" : null}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value, event.currentTarget)}
        onScroll={(event) => { if (mirrorRef.current) mirrorRef.current.scrollTop = event.currentTarget.scrollTop; }}
        placeholder={placeholder}
        className={cn("relative z-[1] text-transparent caret-accent-brand selection:bg-accent-brand/25", textareaClassName)}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function VideoStudioPanel({
  locale,
  copy,
  text,
  user,
  authReady,
  catalog,
  characters,
  initialCharacterId,
  loading,
  error,
  notice,
  activeConversationId,
  addGeneration,
  setBalanceTokens,
  setPendingJobs,
  showError,
  clearMessages,
  resultsRef,
  seedImage,
  onSeedConsumed,
  onOpenGallery,
  videoAgents,
  selectedVideoAgentId,
  onSelectedVideoAgentChange,
}: {
  locale: Locale;
  copy: WorkspaceUiCopy;
  text: StudioBattleCopy;
  user: { balanceTokens?: number } | null;
  authReady: boolean;
  catalog: VideoCatalog;
  characters: CharacterSummary[];
  initialCharacterId: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  activeConversationId: string | null;
  addGeneration: (generation: ImageGeneration, conversation: { id: string; title: string; updatedAt: string }) => void;
  setBalanceTokens: (value: number) => void;
  setPendingJobs: Dispatch<SetStateAction<PendingImageJob[]>>;
  showError: (message: string) => void;
  clearMessages: () => void;
  resultsRef: RefObject<HTMLDivElement | null>;
  seedImage: SourceImage | null;
  onSeedConsumed: () => void;
  onOpenGallery: (tab: StudioGalleryTab) => void;
  videoAgents: StudioVideoAgent[];
  selectedVideoAgentId: string;
  onSelectedVideoAgentChange: (id: string) => void;
}) {
  const [mode, setMode] = useState<StudioVideoMode>("t2v");
  const [duration, setDuration] = useState(8);
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [size, setSize] = useState("");
  const [format, setFormat] = useState("");
  const [sound, setSound] = useState<VideoSound>("on");
  const [style, setStyle] = useState("auto");
  const [prompt, setPrompt] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [characterSlot, setCharacterSlot] = useState(0);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [agentGuideOpen, setAgentGuideOpen] = useState(false);
  const [characterPickerSlot, setCharacterPickerSlot] = useState(0);
  const [attachmentMenuSlot, setAttachmentMenuSlot] = useState<number | null>(null);
  const [refs, setRefs] = useState<Array<VideoRef | null>>([]);
  const [refErrors, setRefErrors] = useState<Array<string | null>>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [revealed, setRevealed] = useState({ size: false, format: false, style: false });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cameraRefs = useRef<Array<HTMLInputElement | null>>([]);
  const agentGuideFileRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const promptResizedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef(0);
  const selectedVideoAgent = videoAgents.find((item) => item.id === selectedVideoAgentId) ?? null;
  const selectedVideoAgentCopy = videoAgentCopy(selectedVideoAgent?.id ?? "", locale);
  const userPromptRequired = videoAgentNeedsUserPrompt(selectedVideoAgent?.id ?? "");
  const motionTransferAgent = videoAgentRequiresMotionControlInputs(selectedVideoAgent?.id ?? "");

  useEffect(() => () => { flushAndStopRecorder(recorderRef.current); recorderRef.current = null; }, []);
  useEffect(() => {
    if (!selectedVideoAgent) return;
    const recommended = catalog.models.find((item) => item.provider === selectedVideoAgent.providerId && item.id === selectedVideoAgent.modelId)
      ?? (videoAgentRequiresMotionControlInputs(selectedVideoAgent.id)
        ? catalog.models.find((item) => item.provider === selectedVideoAgent.providerId && isMotionControlModel(item))
        : undefined);
    setMode(selectedVideoAgent.videoMode);
    setDuration(selectedVideoAgent.videoSettings.duration ?? 8);
    setProvider(selectedVideoAgent.providerId);
    setModelId(recommended?.id ?? "");
    setSize(selectedVideoAgent.videoSettings.resolution ?? "");
    setFormat(selectedVideoAgent.videoSettings.aspectRatio ?? "");
    setSound(selectedVideoAgent.videoSettings.sound ?? "off");
    setStyle(selectedVideoAgent.videoSettings.style ?? "auto");
    setPrompt("");
    setCharacterId("");
    setCharacterSlot(0);
    setRefs([]);
    setRefErrors([]);
    setAgentGuideOpen(false);
  }, [catalog.models, selectedVideoAgent]);
  useEffect(() => {
    if (!initialCharacterId || !characters.some((item) => item.id === initialCharacterId)) return;
    const timer = window.setTimeout(() => { setCharacterId(initialCharacterId); setCharacterSlot(0); setMode("i2v"); setProvider(""); setModelId(""); }, 0);
    return () => window.clearTimeout(timer);
  }, [characters, initialCharacterId]);
  useEffect(() => {
    if (attachmentMenuSlot === null) return;
    const close = (event: MouseEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) setAttachmentMenuSlot(null);
    };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAttachmentMenuSlot(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [attachmentMenuSlot]);
  useEffect(() => {
    if (!isRecording) return;
    const tick = window.setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [isRecording]);

  const inputCompatibleModels = useMemo(() => {
    const hasImage = refs.some((item) => item?.kind === "image");
    const hasVideo = refs.some((item) => item?.kind === "video");
    return mode === "v2v" && hasImage && hasVideo
      ? catalog.models.filter(videoV2vAcceptsPhotos)
      : catalog.models;
  }, [catalog.models, mode, refs]);
  const characterModels = useMemo(() => characterId
    ? inputCompatibleModels.filter(videoModelSupportsCharacter)
    : inputCompatibleModels, [characterId, inputCompatibleModels]);
  const durationModels = useMemo(() => filterVideoModels(characterModels, { mode, duration }), [characterModels, duration, mode]);
  const matchingModels = useMemo(
    () => filterVideoModels(characterModels, { mode, duration, resolution: size || undefined, aspect: format || undefined, sound }),
    [characterModels, duration, format, mode, size, sound],
  );
  const filtered = useMemo(
    () => filterVideoModels(characterModels, { mode, duration, resolution: size || undefined, aspect: format || undefined, sound, provider: provider || undefined }),
    [characterModels, duration, format, mode, provider, size, sound],
  );
  const model = characterModels.find((item) => item.id === modelId && item.provider === provider && (motionTransferAgent ? isMotionControlModel(item) : filterVideoModels([item], { mode, duration }).length > 0))
    ?? undefined;
  const selectedCharacter = characters.find((character) => character.id === characterId && character.status === "ready");
  const characterRightsRequired = Boolean(selectedCharacter && selectedCharacter.kind !== "ai" && videoCharacterRightsRequired(model));
  const providers = useMemo(() => {
    const ids = videoOpenChoices(characterModels, { mode, duration, resolution: size || undefined, aspect: format || undefined }).providers;
    return catalog.providers.filter((item) => ids.includes(item.id));
  }, [characterModels, catalog.providers, duration, format, mode, size]);
  const providerModels = useMemo(
    () => filterVideoModels(characterModels, { mode, duration, resolution: size || undefined, aspect: format || undefined, sound, provider: provider || undefined }),
    [characterModels, duration, format, mode, provider, size, sound],
  );
  const sizes = useMemo(
    () => (model
      ? [...new Set(model.resolutions ?? [])]
      : videoOpenChoices(characterModels, { mode, duration, aspect: format || undefined, provider: provider || undefined }).resolutions),
    [characterModels, duration, format, mode, model, provider],
  );
  const formats = useMemo(
    () => (model
      ? [...new Set(model.aspect_ratios ?? [])]
      : videoOpenChoices(characterModels, { mode, duration, resolution: size || undefined, provider: provider || undefined }).aspects),
    [characterModels, duration, mode, model, provider, size],
  );
  const v = videoStudioUiCopy(locale);
  const modelSlotCount = model ? videoSlotCount(mode, model) : videoModeSlotMax(mode);
  const slotCount = Math.min(modelSlotCount, selectedVideoAgent?.maxUserReferences ?? modelSlotCount);
  const userReferenceCount = refs.filter((item) => item?.kind === "image").length + (characterId ? 1 : 0);
  const agentReferencesReady = userReferenceCount >= (selectedVideoAgent?.minUserReferences ?? 0);
  const motionTransferInputsReady = !motionTransferAgent || (refs.some((item) => item?.kind === "image") && refs.some((item) => item?.kind === "video"));
  const sounds = model ? videoSoundModes(model) : ["off", "on"] as VideoSound[];
  const perFileMax = videoPerFileMaxBytes(mode, model, durationModels);
  const totalMax = videoTotalMaxBytes();
  const styles = useMemo(() => [
    { id: "auto", label: videoStudioUiCopy(locale).styleAuto, description: videoStudioUiCopy(locale).styleAutoDesc, prompt: "" },
    ...videoStyleCopies(locale),
  ], [locale]);
  const styleExtra = videoStylePromptExtraChars(locale, style);
  const promptMax = videoUserPromptMaxChars(model, styleExtra);
  const promptHighlightMax = model ? promptMax : Number.MAX_SAFE_INTEGER;
  const promptOverflow = model ? prompt.length > promptMax : false;

  useEffect(() => {
    if (!model) return;
    setSize((current) => (model.resolutions ?? []).includes(current) ? current : (model.default_resolution ?? model.resolutions?.[0] ?? ""));
    setFormat((current) => (model.aspect_ratios ?? []).includes(current) ? current : (model.default_aspect_ratio ?? model.aspect_ratios?.[0] ?? ""));
    const modes = videoSoundModes(model);
    setSound((current) => modes.includes(current) || !modes.length ? current : modes[0]);
  }, [model]);
  useEffect(() => {
    setRefs((items) => items.length >= slotCount ? items : Array.from({ length: slotCount }, (_, index) => items[index] ?? null));
    setRefErrors((items) => items.length >= slotCount ? items : Array.from({ length: slotCount }, (_, index) => items[index] ?? null));
    if (characterId && characterSlot >= slotCount) setCharacterSlot(0);
  }, [characterId, characterSlot, slotCount]);
  useEffect(() => {
    if (!seedImage) return;
    setRefs((items) => {
      const next = items.length ? [...items] : [null];
      next[0] = { name: seedImage.name, dataUrl: seedImage.dataUrl, bytes: seedImage.bytes, kind: "image" };
      return next;
    });
    setRefErrors((items) => items.map((item, index) => index === 0 ? null : item));
    if (mode === "t2v" || mode === "v2v") setMode("i2v");
    onSeedConsumed();
  }, [seedImage]);

  const motionClip = refs.find((item): item is VideoRef => item?.kind === "video") ?? null;
  const motionLocked = isMotionControlModel(model) && Boolean(motionClip);
  const durationLocked = motionTransferAgent || motionLocked;
  const billedDuration = isMotionControlModel(model)
    ? (motionClip ? motionControlDurationFromClip(model, motionClip.durationSec ?? 0) : null)
    : nearestVideoDuration(model?.durations ?? [], duration);
  const price = model && size && billedDuration != null ? videoTokensForClip(model, size, sound, billedDuration) : null;
  const shortOnFunds = price != null && (user?.balanceTokens ?? 0) < price;
  const motionClipReady = !isMotionControlModel(model) || billedDuration != null;

  useEffect(() => {
    if (!isMotionControlModel(model) || !motionClip) return;
    const index = refs.findIndex((item) => item?.kind === "video");
    const issue = motionControlClipIssue(model, motionClip.bytes, motionClip.durationSec ?? 0);
    const copy = videoStudioUiCopy(locale);
    if (issue && index >= 0) {
      const bounds = motionControlClipBounds(model);
      const message = issue === "size"
        ? `${copy.fileTooBig}\n${copy.fileLimit(videoLimitMb(bounds.maxFileBytes))}`
        : issue === "duration-short"
          ? copy.clipTooShort(bounds.min)
          : issue === "duration-long"
            ? copy.clipTooLong(bounds.max)
            : copy.clipUnreadable;
      setRefErrors((items) => items[index] === message ? items : Array.from({ length: Math.max(slotCount, items.length, index + 1) }, (_, itemIndex) => itemIndex === index ? message : items[itemIndex] ?? null));
      setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
      return;
    }
    const billed = motionControlDurationFromClip(model, motionClip.durationSec ?? 0);
    if (billed != null && billed !== duration) setDuration(billed);
  }, [duration, locale, model, motionClip, refs, slotCount]);
  const styleChoices: Choice[] = styles.map((item) => ({ value: item.id, label: item.label, description: item.description, visual: <Palette className="size-4 shrink-0 text-accent-brand" /> }));
  const lockedProvider = motionTransferAgent && selectedVideoAgent
    ? catalog.providers.find((item) => item.id === selectedVideoAgent.providerId) ?? { id: selectedVideoAgent.providerId, label: "Kling" }
    : null;
  const providerChoices = (lockedProvider ? [lockedProvider] : providers)
    .map((item) => ({ value: item.id, label: item.label, logoName: item.label }));
  const agentMotionModels = motionTransferAgent
    ? characterModels.filter((item) => item.provider === selectedVideoAgent?.providerId
      && isMotionControlModel(item)
      && (!motionClip || !motionControlClipIssue(item, motionClip.bytes, motionClip.durationSec ?? 0)))
    : providerModels;
  const modelChoices: Choice[] = agentMotionModels
    .map((item) => ({ value: item.id, label: item.label, description: mediaModelDescription(locale, item.id) }));
  const sizeChoices: Choice[] = sortStudioSizes(sizes).map((item) => ({ value: item, label: item, description: copy.sizes[item] ?? copy.sizeFallback }));
  const formatChoices: Choice[] = formats.map((item) => ({ value: item, label: item, description: copy.formats[item] ?? copy.formatFallback, visual: <RatioIcon value={item} /> }));

  const updatePrompt = (value: string, target: HTMLTextAreaElement) => {
    setPrompt(value);
    if (promptResizedRef.current) return;
    target.style.height = "56px";
    const maximum = Math.min(window.innerHeight * 0.36, 320);
    target.style.height = `${Math.min(target.scrollHeight, maximum)}px`;
    target.style.overflowY = target.scrollHeight > maximum ? "auto" : "hidden";
  };
  const startPromptResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.detail >= 2) return;
    event.preventDefault();
    const startY = event.clientY;
    const startH = composerRef.current?.offsetHeight ?? 112;
    const move = (moveEvent: PointerEvent) => {
      const next = Math.min(Math.max(startH + (moveEvent.clientY - startY), 112), window.innerHeight * 0.7);
      const target = composerRef.current;
      if (!target) return;
      target.style.height = `${next}px`;
      target.style.maxHeight = "none";
      target.style.overflowY = "auto";
      promptResizedRef.current = true;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const appendTranscript = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setPrompt((current) => current.trim() ? `${current.trim()} ${next}` : next);
  };
  const togglePromptMic = async () => {
    if (isRecording) {
      flushAndStopRecorder(recorderRef.current);
      recorderRef.current = null;
      setIsRecording(false);
      return;
    }
    if (transcribing || (authReady && !user)) return;
    clearMessages();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      showError(copy.transcribeFailed);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = recorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = cleanAudioMime(recorder.mimeType || mime || "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < MIN_VOICE_BYTES || chunksRef.current.length === 0) {
          showError(copy.transcribeFailed);
          return;
        }
        setTranscribing(true);
        try {
          const dataUrl = await voiceFileDataUrl(blob);
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audioBase64: dataUrl, mime: type, filename: voiceFilename(type) }),
          });
          const payload = await response.json().catch(() => null) as { text?: string } | null;
          if (!response.ok || !payload?.text?.trim()) throw new Error("transcribe");
          appendTranscript(payload.text);
        } catch {
          showError(copy.transcribeFailed);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start(VOICE_RECORDER_TIMESLICE_MS);
    } catch {
      showError(copy.transcribeFailed);
    }
  };

  const setSlotError = (index: number, message: string) => {
    setRefErrors((items) => Array.from({ length: Math.max(slotCount, items.length, index + 1) }, (_, itemIndex) => itemIndex === index ? message : items[itemIndex] ?? null));
  };

  const attachRef = async (index: number, file: File) => {
    clearMessages();
    const wantsMixed = mode === "v2v";
    if (wantsMixed && !file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      setSlotError(index, text.unsupportedFormat);
      return;
    }
    if (!wantsMixed && !file.type.startsWith("image/")) {
      setSlotError(index, text.unsupportedFormat);
      return;
    }
    if (wantsMixed && model && !videoV2vAcceptsPhotos(model)) {
      const otherKinds = refs.filter((item, itemIndex) => itemIndex !== index && item).map((item) => item?.kind);
      const wouldMix = (file.type.startsWith("image/") && otherKinds.includes("video"))
        || (file.type.startsWith("video/") && otherKinds.includes("image"));
      if (wouldMix) {
        const message = videoReferenceMixUnsupportedCopy(locale);
        setSlotError(index, message);
        showError(message);
        return;
      }
    }
    const others = refs.reduce((sum, item, itemIndex) => itemIndex === index || !item ? sum : sum + item.bytes, 0);
    if (file.size > perFileMax) {
      setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
      setSlotError(index, `${v.fileTooBig}\n${v.fileLimit(videoLimitMb(perFileMax))}`);
      return;
    }
    if (others + file.size > totalMax) {
      setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
      setSlotError(index, `${v.filesTotalBig}\n${v.fileLimit(videoLimitMb(totalMax))}`);
      return;
    }
    try {
      if (wantsMixed && file.type.startsWith("video/")) {
        let durationSec: number;
        try {
          durationSec = await readVideoFileDuration(file);
        } catch {
          setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
          setSlotError(index, v.clipUnreadable);
          return;
        }
        if (isMotionControlModel(model)) {
          const issue = motionControlClipIssue(model, file.size, durationSec);
          if (issue) {
            setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
            const bounds = motionControlClipBounds(model);
            setSlotError(index, issue === "size"
              ? `${v.fileTooBig}\n${v.fileLimit(videoLimitMb(bounds.maxFileBytes))}`
              : issue === "duration-short"
                ? v.clipTooShort(bounds.min)
                : issue === "duration-long"
                  ? v.clipTooLong(bounds.max)
                  : v.clipUnreadable);
            return;
          }
          const billed = motionControlDurationFromClip(model, durationSec);
          if (billed != null) setDuration(billed);
        }
        const dataUrl = await fileDataUrl(file, text);
        if (characterId && characterSlot === index) setCharacterId("");
        setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? { name: file.name, dataUrl, bytes: file.size, kind: "video", durationSec } : item));
        setSlotError(index, "");
        return;
      }
      const image = await normaliseImage(file, perFileMax, text);
      if (image.bytes > perFileMax) {
        setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
        setSlotError(index, `${v.fileTooBig}\n${v.fileLimit(videoLimitMb(perFileMax))}`);
        return;
      }
      if (others + image.bytes > totalMax) {
        setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? null : item));
        setSlotError(index, `${v.filesTotalBig}\n${v.fileLimit(videoLimitMb(totalMax))}`);
        return;
      }
      if (characterId && characterSlot === index) setCharacterId("");
      setRefs((items) => items.map((item, itemIndex) => itemIndex === index ? { ...image, kind: "image" } : item));
      setSlotError(index, "");
    } catch (value) {
      setSlotError(index, value instanceof Error ? value.message : text.attachImageFailed);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !model || (userPromptRequired && !prompt.trim())) {
      if (!model) showError(v.pickModel);
      return;
    }
    if (price != null && price > (user.balanceTokens ?? 0)) return;
    const filled = refs.filter((item): item is VideoRef => Boolean(item));
    if (!agentReferencesReady) {
      showError(v.addVideoNeeded);
      return;
    }
    const integratorMode = studioIntegratorMode(mode, model);
    if (!integratorMode) {
      showError(mode === "v2v" ? videoReferenceMixUnsupportedCopy(locale) : v.addVideoNeeded);
      return;
    }
    const imagesPreview = filled.filter((item) => item.kind === "image");
    const clipsPreview = filled.filter((item) => item.kind === "video");
    if (motionTransferAgent && (!imagesPreview.length || !clipsPreview.length)) {
      showError(v.addVideoNeeded);
      return;
    }
    if (integratorMode === "video-to-video" && imagesPreview.length && clipsPreview.length && !videoV2vAcceptsPhotos(model)) {
      showError(videoReferenceMixUnsupportedCopy(locale));
      return;
    }
    if (integratorMode === "motion-control" && (!imagesPreview.length || !clipsPreview.length)) {
      showError(v.addVideoNeeded);
      return;
    }
    const submitClip = clipsPreview[0];
    const submitDuration = integratorMode === "motion-control"
      ? motionControlDurationFromClip(model, submitClip?.durationSec ?? 0)
      : nearestVideoDuration(model.durations ?? [], duration);
    if (integratorMode === "motion-control") {
      const issue = motionControlClipIssue(model, submitClip?.bytes ?? 0, submitClip?.durationSec ?? 0);
      if (issue || submitDuration == null) {
        const bounds = motionControlClipBounds(model);
        showError(issue === "size"
          ? `${v.fileTooBig}\n${v.fileLimit(videoLimitMb(bounds.maxFileBytes))}`
          : issue === "duration-short"
            ? v.clipTooShort(bounds.min)
            : issue === "duration-long"
              ? v.clipTooLong(bounds.max)
              : v.clipUnreadable);
        return;
      }
    }
    if (integratorMode === "video-to-video" && !clipsPreview.length) {
      showError(v.addVideoNeeded);
      return;
    }
    if (slotCount > 0 && filled.length + (characterId ? 1 : 0) < 1) {
      showError(v.addVideoNeeded);
      return;
    }
    const userPrompt = prompt.trim();
    const usedCharacterId = characterId;
    const usedAgentId = selectedVideoAgent?.id ?? "";
    const usedCharacterSlot = characterSlot;
    const usedRefs = refs;
    const usedDuration = submitDuration ?? nearestVideoDuration(model.durations ?? [], duration);
    const pendingId = `pending-${crypto.randomUUID()}`;
    let trackedJobId = pendingId;
    setPendingJobs((jobs) => [{ id: pendingId, prompt: userPrompt || selectedVideoAgentCopy?.name || v.generate, modelLabel: model.label, count: 1, status: "creating", billedTokens: price ?? 0, createdAt: new Date().toISOString(), kind: "video" }, ...jobs]);
    setPrompt("");
    setRefs(Array.from({ length: slotCount }, () => null));
    setCharacterId("");
    setCharacterSlot(0);
    setRefErrors(Array.from({ length: slotCount }, () => null));
    setStyle("auto");
    if (!selectedVideoAgent) {
      resetProviderModel();
      setSize("");
      setFormat("");
    }
    setRevealed({ size: false, format: false, style: false });
    promptResizedRef.current = false;
    if (composerRef.current) {
      composerRef.current.style.height = "";
      composerRef.current.style.maxHeight = "";
      composerRef.current.style.overflowY = "";
    }
    clearMessages();
    window.requestAnimationFrame(() => resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
    try {
      const images = usedRefs.filter((item): item is VideoRef => item?.kind === "image").map((item) => item.dataUrl);
      const clips = usedRefs.filter((item): item is VideoRef => item?.kind === "video").map((item) => item.dataUrl);
      const response = await fetch("/api/video/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: model.provider,
          model: model.id,
          mode,
          prompt: userPrompt,
          locale,
          duration: usedDuration,
          clipDuration: integratorMode === "motion-control" ? submitClip?.durationSec : undefined,
          resolution: size,
          aspectRatio: format,
          sound,
          style,
          characterId: usedCharacterId || undefined,
          characterSlot: usedCharacterSlot,
          conversationId: activeConversationId || undefined,
          firstFrame: integratorMode === "image-to-video" || integratorMode === "motion-control" ? images[0] : undefined,
          lastFrame: integratorMode === "image-to-video" ? images[1] : undefined,
          references: integratorMode === "ref-to-video" || integratorMode === "motion-control" || (integratorMode === "video-to-video" && videoV2vAcceptsPhotos(model))
            ? images
            : undefined,
          videos: integratorMode === "video-to-video" || integratorMode === "motion-control" ? clips : undefined,
          agentId: usedAgentId || undefined,
        }),
      });
      const data = await readGenerationResponse(response, text);
      if (typeof data.balanceTokens === "number") setBalanceTokens(data.balanceTokens);
      const jobId = data.job?.id;
      if (jobId) {
        trackedJobId = jobId;
        setPendingJobs((jobs) => jobs.map((job) => job.id === pendingId ? { ...job, id: jobId } : job));
        const ready = data.generation && data.conversation ? data : await waitForVideoJob(jobId, text);
        if (typeof ready.balanceTokens === "number") setBalanceTokens(ready.balanceTokens);
        if (!ready.generation || !ready.conversation) throw new Error(ready.error || text.generationFailed);
        setPendingJobs((jobs) => jobs.filter((job) => job.id !== jobId && job.id !== pendingId));
        addGeneration(ready.generation, ready.conversation);
        return;
      }
      if (!response.ok || !data.generation || !data.conversation) throw new Error(data.error || text.generationFailed);
      setPendingJobs((jobs) => jobs.filter((job) => job.id !== pendingId));
      addGeneration(data.generation, data.conversation);
    } catch (value) {
      if (isPageDisconnect(value) || value instanceof VideoPollingTimeout) return;
      setPendingJobs((jobs) => jobs.map((job) => (
        job.id === pendingId || job.id === trackedJobId
          ? { ...job, status: "failed" as const, billedTokens: 0, errorCode: value instanceof GenerationJobError ? value.errorCode : null }
          : job
      )));
      showError(value instanceof Error ? value.message : text.generationFailed);
    }
  };

  const modeLabel = (item: StudioVideoMode) => item === "t2v" ? v.t2v : item === "animate" ? v.animate : item === "i2v" ? v.i2v : v.v2v;
  const canToggleSound = sounds.includes("on") && sounds.includes("off");
  const resetProviderModel = () => { setProvider(""); setModelId(""); };
  const resetVideoConfiguration = () => {
    resetProviderModel();
    setSize("");
    setFormat("");
    setSound("on");
    setStyle("auto");
    setRevealed({ size: false, format: false, style: false });
  };
  const selectVideoCharacter = (id: string) => {
    setCharacterId(id);
    if (id) {
      setMode("i2v");
      setCharacterSlot(characterPickerSlot);
      setRefs((items) => items.map((item, index) => index === characterPickerSlot ? null : item));
      setRefErrors((items) => items.map((item, index) => index === characterPickerSlot ? null : item));
    }
    if (id && (!model || !videoModelSupportsCharacter(model))) resetProviderModel();
  };
  const sliderPercent = ((billedDuration ?? duration) - 4) / 26;
  const providerIcon = <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist"><Network className="size-4 text-accent-brand" /></span>;
  const modelIcon = <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist"><Cpu className="size-4 text-accent-brand" /></span>;

  return (
    <form onSubmit={(event) => void submit(event)}>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {VIDEO_MODES.map((item) => (
          <button key={item} type="button" title={modeLabel(item)} onClick={() => { setMode(item); onSelectedVideoAgentChange(""); if (item !== "i2v") { setCharacterId(""); setCharacterSlot(0); } resetProviderModel(); }} className={cn("flex h-11 min-w-0 items-center justify-center rounded-xl border px-1", mode === item ? "border-accent-brand bg-accent-brand/10 text-text" : "border-border bg-surface text-steel")}>
            <FitModeLabel>{modeLabel(item)}</FitModeLabel>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-text">
          <span>{v.duration}</span>
          <span className="tabular-nums">{billedDuration ?? duration} {v.seconds}{motionLocked ? ` · ${v.durationFromClip}` : ""}</span>
        </div>
        <div className="relative pb-9">
          <input
            type="range"
            min={4}
            max={30}
            step={1}
            value={billedDuration ?? duration}
            disabled={durationLocked}
            onChange={(event) => {
              if (durationLocked) return;
              setDuration(Number(event.target.value));
              resetVideoConfiguration();
            }}
            className={cn("h-2 w-full appearance-none rounded-full bg-mist accent-current [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-brand", durationLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
          />
          <span
            className="pointer-events-none absolute top-8 whitespace-nowrap text-[10px] font-medium leading-none text-steel"
            style={{ left: `calc(${sliderPercent} * (100% - 16px) + 8px)`, transform: "translateX(-50%)" }}
          >
            {v.modelsCount(matchingModels.length)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenGallery("video")}
        className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-10 text-sm font-semibold text-text hover:bg-mist"
      >
        <Clapperboard className="size-4 shrink-0 text-accent-brand" />
        <span>{v.agentsTemplates}</span>
        <ChevronRight className="absolute right-3 size-4 text-steel" />
      </button>

      <div className={cn("relative mt-4 rounded-[24px] border bg-bg p-2 shadow-[0_10px_32px_-20px_rgba(15,40,80,.45)] focus-within:border-accent-brand/50 focus-within:ring-2 focus-within:ring-accent-brand/10", selectedVideoAgent ? "border-accent-brand ring-2 ring-accent-brand/20" : "border-border")}>
        <div className="relative flex items-start justify-between gap-2 px-1">
          <div className="flex min-w-0 flex-1 pr-24">
            {selectedVideoAgent && (selectedVideoAgent.guide || selectedVideoAgentCopy?.guideNotice) ? (
              <button
                type="button"
                onClick={() => setAgentGuideOpen(true)}
                aria-label={selectedVideoAgentCopy?.name ?? copy.addImageAria}
                title={selectedVideoAgentCopy?.name ?? copy.addImageAria}
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-accent-brand/40 bg-accent-brand/10 text-accent-brand hover:bg-accent-brand/15"
              >
                <span className="studio-bell-pulse absolute inset-1 rounded-full bg-accent-brand/35" aria-hidden />
                <Bell className="studio-bell relative size-6" />
              </button>
            ) : null}
            {selectedVideoAgent ? (
              <span className="absolute left-1/2 top-1 z-10 flex max-w-[52%] -translate-x-1/2 items-center gap-1 rounded-full bg-accent-brand/25 py-1 ps-2.5 pe-1 text-xs font-semibold text-text">
                <span className="truncate">{videoAgentCopy(selectedVideoAgent.id, locale)?.name ?? selectedVideoAgent.name}</span>
                <button type="button" onClick={() => { onSelectedVideoAgentChange(""); setMode("t2v"); setPrompt(""); setRefs([]); setRefErrors([]); setAgentGuideOpen(false); resetVideoConfiguration(); }} aria-label={copy.close} title={copy.close} className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface/70"><X className="size-3.5" /></button>
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isRecording ? (
              <div className="mr-1 flex items-center gap-1" aria-hidden>
                <span className="mr-1 text-xs tabular-nums text-destructive">0:{String(recordingSeconds).padStart(2, "0")}</span>
                {[0, 1, 2, 3, 4].map((bar) => (
                  <span key={bar} className="w-0.5 animate-pulse rounded-full bg-destructive" style={{ height: `${8 + ((bar * 5) % 14)}px`, animationDelay: `${bar * 90}ms` }} />
                ))}
              </div>
            ) : null}
            <button
              type="button"
              aria-label={isRecording ? v.micStop : v.mic}
              title={isRecording ? v.micStop : v.mic}
              disabled={(authReady && !user) || !userPromptRequired}
              onClick={() => void togglePromptMic()}
              className={cn("grid size-8 shrink-0 place-items-center rounded-lg", isRecording ? "bg-destructive/10 text-destructive" : "text-steel hover:bg-mist hover:text-text", (authReady && !user) && "cursor-not-allowed opacity-40")}
            >
              {transcribing ? <LoaderCircle className="size-4 animate-spin" /> : isRecording ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
            </button>
          </div>
        </div>
        <VideoPromptTextarea
          textareaRef={composerRef}
          value={prompt}
          acceptedChars={promptHighlightMax}
          disabled={(authReady && !user) || !userPromptRequired}
          placeholder={selectedVideoAgentCopy?.placeholder ?? selectedVideoAgent?.promptPlaceholder ?? copy.placeholderDefault}
          onValueChange={updatePrompt}
          textareaClassName="min-h-28 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-steel/75 disabled:cursor-not-allowed disabled:opacity-70"
          mirrorClassName="px-3 py-2 text-sm leading-relaxed"
        />
        {model ? (
          <div className="px-3 pb-1 text-right text-[11px]">
            <p className={cn("tabular-nums", promptOverflow ? "font-semibold text-destructive" : "text-steel")}>{prompt.length} / {promptMax}</p>
            {promptOverflow ? <p className="mt-0.5 font-medium text-destructive" role="status">{videoPromptOverflowCopy(locale)}</p> : null}
          </div>
        ) : null}
        {characterRightsRequired ? <p className="px-3 pb-1 text-sm font-medium text-destructive" role="alert">{videoCharacterRightsCopy(locale)}</p> : null}
        <div className="flex items-end justify-between gap-2 px-1 pb-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <ChoiceSelect compact prefix={v.size} placeholder={v.size} value={size} choices={sizeChoices} revealed={Boolean(size) || revealed.size} onReveal={() => setRevealed((current) => ({ ...current, size: true }))} onChange={(value) => {
              setSize(value);
              setRevealed((current) => ({ ...current, size: true }));
              if (model) {
                if (!(model.resolutions ?? []).includes(value)) resetProviderModel();
                return;
              }
              const pool = filterVideoModels(inputCompatibleModels, { mode, duration, resolution: value, aspect: format || undefined, sound });
              if (provider && !pool.some((item) => item.provider === provider)) resetProviderModel();
            }} />
            <ChoiceSelect compact prefix={v.format} placeholder={v.format} value={format} choices={formatChoices} revealed={Boolean(format) || revealed.format} onReveal={() => setRevealed((current) => ({ ...current, format: true }))} onChange={(value) => {
              setFormat(value);
              setRevealed((current) => ({ ...current, format: true }));
              if (model) {
                if (!(model.aspect_ratios ?? []).includes(value)) resetProviderModel();
                return;
              }
              const pool = filterVideoModels(inputCompatibleModels, { mode, duration, resolution: size || undefined, aspect: value, sound });
              if (provider && !pool.some((item) => item.provider === provider)) resetProviderModel();
            }} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canToggleSound && sounds.length <= 1}
              onClick={() => {
                if (!canToggleSound) return;
                const next = sound === "on" ? "off" : "on";
                setSound(next);
                if (model && videoSoundModes(model).includes(next)) return;
                const pool = filterVideoModels(inputCompatibleModels, { mode, duration, resolution: size || undefined, aspect: format || undefined, sound: next });
                if ((model && !videoSoundModes(model).includes(next)) || (provider && !pool.some((item) => item.provider === provider))) resetProviderModel();
              }}
              className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-text outline-none hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Volume2 className="size-3.5 text-accent-brand" />
              {v.sound}: {sound === "on" ? v.soundYes : v.soundNo}
            </button>
            <button type="button" aria-label={v.expandPrompt} title={v.expandPrompt} onPointerDown={startPromptResize} onDoubleClick={() => setEditorOpen(true)} className="grid size-8 cursor-ns-resize place-items-center rounded-lg text-steel hover:bg-mist hover:text-text">
              <ChevronsUpDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ChoiceSelect
          value={provider}
          choices={providerChoices.map((item) => ({ value: item.value, label: item.label, visual: <ProviderLogo provider={item.logoName ?? item.label} className="size-7" /> }))}
          placeholder={v.provider}
          leading={providerIcon}
          revealed={Boolean(provider)}
          highlight={Boolean(provider)}
          disabled={motionTransferAgent}
          onChange={(value) => { setProvider(value); setModelId(""); }}
          onClear={provider ? resetVideoConfiguration : undefined}
          clearLabel={videoProviderResetCopy(locale)}
        />
        <ChoiceSelect
          value={modelId}
          choices={modelChoices}
          placeholder={v.model}
          leading={modelIcon}
          revealed={Boolean(modelId)}
          highlight={Boolean(modelId)}
          onChange={(value) => {
            const next = agentMotionModels.find((item) => item.id === value) ?? filtered.find((item) => item.id === value) ?? catalog.models.find((item) => item.id === value);
            if (!next) return;
            setModelId(next.id);
            setProvider(next.provider);
          }}
        />
      </div>

      {selectedVideoAgentCopy?.guideNotice ? <p className="mt-3 text-xs leading-relaxed text-steel">{selectedVideoAgentCopy.guideNotice}</p> : null}

      {slotCount > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {Array.from({ length: slotCount }, (_, index) => {
            const item = refs[index];
            const characterInSlot = Boolean(selectedCharacter) && characterSlot === index;
            const slotError = refErrors[index];
            const frameLabel = mode === "v2v" ? `${v.photo} / ${v.video}` : mode === "animate" || index === 0 ? v.firstFrame : index === slotCount - 1 ? v.lastFrame : null;
            return (
              <div key={index} ref={attachmentMenuSlot === index ? attachmentMenuRef : undefined} className="relative">
                <input
                  ref={(node) => { fileRefs.current[index] = node; }}
                  type="file"
                  accept={mode === "v2v" ? (model && !videoV2vAcceptsPhotos(model) ? "video/mp4,video/quicktime,video/webm" : V2V_FILE_ACCEPT) : "image/png,image/jpeg,image/webp"}
                  className="sr-only"
                  onChange={(event) => { const file = event.target.files?.[0]; setAttachmentMenuSlot(null); if (file) void attachRef(index, file); event.currentTarget.value = ""; }}
                />
                <input
                  ref={(node) => { cameraRefs.current[index] = node; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => { const file = event.target.files?.[0]; setAttachmentMenuSlot(null); if (file) void attachRef(index, file); event.currentTarget.value = ""; }}
                />
                <button type="button" aria-expanded={attachmentMenuSlot === index} onClick={() => setAttachmentMenuSlot((current) => current === index ? null : index)} className={cn("relative flex aspect-[3/4] w-[4.75rem] flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface px-1 text-accent-brand hover:bg-mist sm:w-20", slotError ? "border-destructive" : "border-border")}>
                  {frameLabel && !item && !characterInSlot && !slotError ? <span className="mb-0.5 px-0.5 text-center text-[8px] font-medium leading-tight text-steel">{frameLabel}</span> : null}
                  {characterInSlot && selectedCharacter?.previewUrl ? <Image src={selectedCharacter.previewUrl} alt={selectedCharacter.name} fill unoptimized className="object-contain" /> : item?.kind === "image" ? <Image src={item.dataUrl} alt={item.name} fill unoptimized className="object-cover" /> : item?.kind === "video" ? <video src={item.dataUrl} muted className="absolute inset-0 size-full object-cover" /> : slotError ? <span className="whitespace-pre-line text-center text-[9px] font-medium leading-tight text-destructive">{slotError}</span> : <Plus className="size-6" />}
                  {characterInSlot || (frameLabel && item) ? <span className="absolute inset-x-0 bottom-0 z-[1] bg-black/55 px-1 py-0.5 text-center text-[8px] font-medium leading-tight text-white">{characterInSlot ? selectedCharacter?.name : frameLabel}</span> : null}
                </button>
                {item || characterInSlot ? (
                  <button type="button" onClick={() => { if (characterInSlot) setCharacterId(""); else { setRefs((items) => items.map((current, itemIndex) => itemIndex === index ? null : current)); setRefErrors((items) => items.map((current, itemIndex) => itemIndex === index ? null : current)); } }} aria-label={copy.removeImage} className="absolute -right-1 -top-1 z-[2] rounded-full bg-black/65 p-0.5 text-white"><X className="size-3" /></button>
                ) : null}
                {attachmentMenuSlot === index ? (
                  <div role="menu" className="absolute bottom-[calc(100%+.5rem)] start-1/2 z-[90] w-52 -translate-x-1/2 rounded-2xl border border-border bg-surface p-1.5 shadow-2xl">
                    <button type="button" role="menuitem" onClick={() => fileRefs.current[index]?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><ImagePlus className="size-4 text-accent-brand" />{mode === "v2v" ? copy.addFile : copy.addPhoto}</button>
                    <button type="button" role="menuitem" onClick={() => cameraRefs.current[index]?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><Camera className="size-4 text-accent-brand" />{copy.takePhoto}</button>
                    {mode === "i2v" && (!model || videoModelSupportsCharacter(model)) ? <button type="button" role="menuitem" onClick={() => { setCharacterPickerSlot(index); setAttachmentMenuSlot(null); setCharacterPickerOpen(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><UserRound className="size-4 text-accent-brand" />{characterPickerLabel(locale)}</button> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3">
        <ChoiceSelect value={style} choices={styleChoices} placeholder={v.styles} leading={<Palette className="size-4 shrink-0 text-accent-brand" />} revealed={revealed.style} revealOnOpen onReveal={() => setRevealed((current) => ({ ...current, style: true }))} onChange={(value) => { setStyle(value); setRevealed((current) => ({ ...current, style: true })); }} center highlight={revealed.style} />
      </div>

      {notice ? <p className="mt-3 text-sm text-emerald-600" role="status">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{promptErrorMessage(error, locale)}</p> : null}
      {!catalog.available && !loading ? <p className="mt-3 text-sm text-destructive" role="alert">{v.videoCatalogFailed}</p> : null}

      {!authReady ? (
        <div className="mt-6 grid h-12 place-items-center"><LoaderCircle className="size-5 animate-spin text-accent-brand" /></div>
      ) : user ? (
        <Button type="submit" disabled={!catalog.available || shortOnFunds || (userPromptRequired && !prompt.trim()) || !agentReferencesReady || !motionTransferInputsReady || !model || !motionClipReady || characterRightsRequired} className={cn("mt-6 h-auto min-h-12 w-full flex-col gap-0.5 whitespace-normal py-2", shortOnFunds && "disabled:opacity-100")}>
          <span className={cn(shortOnFunds && "opacity-50")}>{withCreditGlyphs(`${v.generate}${price != null ? ` ${formatTokensAsCredits(price, locale, "price")}` : ""}`)}</span>
          {shortOnFunds ? <span className="text-[11px] font-medium leading-none text-red-500">{v.noFunds}</span> : null}
        </Button>
      ) : (
        <Button nativeButton={false} className="mt-6 h-12 w-full" render={<Link href="/register" />}>{copy.register}</Button>
      )}

      {editorOpen ? createPortal(
        <div className="fixed inset-0 z-[400] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={copy.previewAria} onClick={() => setEditorOpen(false)}>
          <div className="flex h-[min(86dvh,760px)] w-full max-w-3xl flex-col rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-text">{mediaTitleCopy(locale).prompt}</h3>
              <button type="button" aria-label={copy.close} onClick={() => setEditorOpen(false)} className="grid size-9 place-items-center rounded-full border border-border hover:bg-mist"><X className="size-4" /></button>
            </div>
            <div className="relative min-h-0 flex-1">
              <VideoPromptTextarea
                value={prompt}
                acceptedChars={promptHighlightMax}
                disabled={(authReady && !user) || !userPromptRequired}
                placeholder={selectedVideoAgentCopy?.placeholder ?? selectedVideoAgent?.promptPlaceholder ?? copy.placeholderDefault}
                onValueChange={(value) => setPrompt(value)}
                containerClassName="h-full rounded-xl border border-border bg-bg focus-within:border-accent-brand"
                textareaClassName="h-full min-h-0 w-full resize-none overflow-y-auto bg-transparent px-4 pb-14 pt-3 text-sm leading-relaxed outline-none placeholder:text-steel/75 disabled:cursor-not-allowed disabled:opacity-70"
                mirrorClassName="px-4 pb-14 pt-3 text-sm leading-relaxed"
                autoFocus
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-2.5 z-[2] text-right text-xs">
                <p className={cn("tabular-nums", promptOverflow ? "font-semibold text-destructive" : "text-steel")}>{prompt.length} / {promptMax}</p>
                {promptOverflow ? <p className="mt-0.5 font-medium text-destructive">{videoPromptOverflowCopy(locale)}</p> : null}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {agentGuideOpen && selectedVideoAgent && (selectedVideoAgent.guide || selectedVideoAgentCopy?.guideNotice) ? createPortal(
        <div className="fixed inset-0 z-[430] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="video-agent-guide-title" onClick={() => setAgentGuideOpen(false)}>
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 id="video-agent-guide-title" className="text-center text-xl font-semibold text-text">{selectedVideoAgentCopy?.name ?? copy.uploadPhoto}</h3>
            {selectedVideoAgentCopy?.guideNotice ? <p className="mt-3 text-center text-sm leading-relaxed text-steel">{selectedVideoAgentCopy.guideNotice}</p> : null}
            {selectedVideoAgent.guide?.goodImageUrl && selectedVideoAgent.guide.badImageUrl ? (
              <div className="mt-5 grid grid-cols-3 gap-3">
                <figure className="relative">
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                    <Image src={selectedVideoAgent.guide.goodImageUrl} alt={copy.uploadPhoto} fill unoptimized className="object-contain" />
                  </span>
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{copy.uploadPhoto}</figcaption>
                  <CheckCircle2 className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-emerald-500" aria-hidden />
                </figure>
                <figure className="relative">
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                    <Image src={selectedVideoAgent.guide.badImageUrl} alt={copy.uploadPhoto} fill unoptimized className="object-cover" />
                  </span>
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-steel">{copy.uploadPhoto}</figcaption>
                  <CircleX className="absolute -bottom-0.5 -end-0.5 size-7 rounded-full bg-surface text-red-500" aria-hidden />
                </figure>
                {selectedVideoAgent.guide.uploadFromGuide ? (
                <button type="button" onClick={() => agentGuideFileRef.current?.click()} className="relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-border bg-bg hover:bg-mist" aria-label={copy.addFile}>
                  <span className="grid size-14 place-items-center rounded-full bg-accent-brand text-white"><Plus className="size-7" /></span>
                </button>
                ) : null}
              </div>
            ) : null}
            {selectedVideoAgent.guide?.uploadFromGuide ? (
                <input
                  ref={agentGuideFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void attachRef(0, file);
                    event.currentTarget.value = "";
                  }}
                />
            ) : null}
            {selectedVideoAgent.videoUrl ? (
              <>
                <p className="mt-5 text-center text-sm text-steel">{copy.addPhoto}</p>
                <div className="mt-3 overflow-hidden rounded-2xl bg-black">
                  <video src={selectedVideoAgent.videoUrl} poster={selectedVideoAgent.coverUrl ?? undefined} controls muted playsInline className="max-h-[42dvh] w-full object-contain" />
                </div>
              </>
            ) : selectedVideoAgent.coverUrl ? (
              <div className="relative mt-5 aspect-video overflow-hidden rounded-2xl bg-mist">
                <Image src={selectedVideoAgent.coverUrl} alt={selectedVideoAgentCopy?.name ?? selectedVideoAgent.name} fill unoptimized className="object-contain" />
              </div>
            ) : null}
            <Button type="button" variant="secondary" className="mt-5 h-11 w-full" onClick={() => setAgentGuideOpen(false)}>{copy.close}</Button>
          </div>
        </div>,
        document.body,
      ) : null}
      <CharacterPickerDialog locale={locale} characters={characters} selectedId={characterId} open={characterPickerOpen} onClose={() => setCharacterPickerOpen(false)} onChange={selectVideoCharacter} />
    </form>
  );
}

function tokensForImage(generation: ImageGeneration) {
  return Math.round(generation.billedTokens / Math.max(generation.images.length, 1));
}

function PendingCard({ job, locale, deleteLabel, onDismiss, onShowPrompt }: { job: PendingImageJob; locale: string; deleteLabel: string; onDismiss: () => void; onShowPrompt: () => void }) {
  const videoUi = videoStudioUiCopy((locale as Locale) || "en");
  const copy = workspaceUiCopy((locale as Locale) || "en");
  const errorLabel = generationErrorLabel((locale as Locale) || "en");
  const failureLabel = generationFailureLabel((locale as Locale) || "en", job.errorCode);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="relative grid aspect-square w-full place-items-center bg-mist">
        {job.status === "creating" ? <LoaderCircle className="size-8 animate-spin text-accent-brand" /> : <p className="max-w-[18rem] px-5 text-center text-sm font-semibold leading-relaxed text-destructive">{failureLabel}</p>}
      </div>
      <div className="p-3">
        <div className="flex h-4 items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs font-medium text-text">{job.prompt || "—"}</p><button type="button" aria-label={mediaTitleCopy(locale).prompt} onClick={onShowPrompt} className="relative grid size-4 shrink-0 place-items-center rounded text-steel after:absolute after:-inset-1.5 hover:bg-mist hover:text-text"><Eye className="size-3.5" /></button></div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">{job.kind === "video" ? videoUi.badgeVideo : copy.variant}</span>
          <span className="truncate text-[11px] text-steel">{job.modelLabel}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
          <span className={job.status === "failed" ? "font-medium text-destructive" : "text-steel"}>{job.status === "creating" ? (job.kind === "video" ? videoUi.creatingVideo : copy.uploadPhoto) : errorLabel}</span>
          <span className="inline-flex items-center text-text">{withCreditGlyphs(formatTokensAsCredits(Math.round(job.billedTokens / Math.max(job.count, 1)), locale, "price"))}</span>
        </div>
        {job.status === "failed" ? (
          <div className="mt-2 flex w-full items-center justify-end border-t border-border pt-2">
            <IconAction label={deleteLabel} onClick={onDismiss}><Trash2 className="size-3.5" /></IconAction>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ResultCard({ copy, locale, deleteLabel, generation, imageItem, imageIndex, liked, onPreview, onShowPrompt, onShare, onDownload, onReuse, onFavorite, onDelete }: { copy: WorkspaceUiCopy; locale: string; deleteLabel: string; generation: ImageGeneration; imageItem: ImageGeneration["images"][number]; imageIndex: number; liked: boolean; onPreview: (url: string, alt: string) => void; onShowPrompt: () => void; onShare: (url: string, id: string) => Promise<void>; onDownload: (url: string, id: string) => Promise<void>; onReuse: (generation: ImageGeneration, imageItem: { id: string; url: string }) => Promise<void>; onFavorite: () => void; onDelete: () => void }) {
  const videoUi = videoStudioUiCopy((locale as Locale) || "en");
  const alt = `${generation.prompt}, ${copy.variant} ${imageIndex + 1}`;
  const feedback = useModelFeedback();
  const rated = feedback.voteForMessage(imageItem.id) === 1;
  const created = new Date(generation.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <button type="button" aria-label={`${copy.variant} ${imageIndex + 1}`} onClick={() => onPreview(imageItem.url, alt)} className="relative aspect-square w-full cursor-zoom-in bg-mist">
        {generation.kind === "video" ? (
          <RetryStudioVideo previewUrl={imageItem.previewUrl ?? `${imageItem.url}?variant=preview`} alt={alt} />
        ) : (
          <RetryStudioImage url={imageItem.previewUrl ?? imageItem.url} alt={alt} />
        )}
      </button>
      <div className="p-3">
        <div className="flex h-4 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium leading-4 text-text">{imageItem.title || generation.prompt || "—"}</p>
          <button type="button" aria-label={mediaTitleCopy(locale).prompt} onClick={onShowPrompt} className="relative grid size-4 shrink-0 place-items-center rounded text-steel after:absolute after:-inset-1.5 hover:bg-mist hover:text-text"><Eye className="size-3.5" /></button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">{generation.kind === "video" ? videoUi.badgeVideo : copy.variant}</span>
          <span className="min-w-0 truncate text-[11px] text-steel">
            {generation.modelLabel}{generation.size ? ` · ${generation.size}` : ""}
          </span>
          {generation.kind === "video" && generation.durationSec ? (
            <span className="ms-auto shrink-0 text-[11px] tabular-nums text-steel">{generation.durationSec} {videoUi.seconds}</span>
          ) : generation.kind !== "video" && generation.format ? (
            <span className="ms-auto shrink-0 text-[11px] uppercase tracking-wide text-steel">{generation.format}</span>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
          <span className="text-steel">{created}</span>
          <span className="inline-flex items-center text-text">{withCreditGlyphs(formatTokensAsCredits(tokensForImage(generation), locale, "spend"))}</span>
        </div>
        <div className="mt-2 flex w-full items-center justify-between border-t border-border pt-2">
          <DownloadSizeAction label={copy.download} url={imageItem.url} onClick={() => void onDownload(imageItem.url, imageItem.id)} />
          <IconAction label={copy.share} onClick={() => void onShare(imageItem.url, imageItem.id)}><Share2 className="size-3.5" /></IconAction>
          <IconAction label={copy.rate} active={rated} onClick={() => saveModelFeedback(imageItem.id, generation.modelId, generation.modelLabel, 1)}><ThumbsUp className={cn("size-3.5", rated && "fill-current")} /></IconAction>
          <IconAction label={copy.rate} active={liked} onClick={onFavorite}><Heart className={cn("size-3.5", liked && "fill-current")} /></IconAction>
          {generation.kind === "video" ? null : <IconAction label={copy.reuse} onClick={() => void onReuse(generation, imageItem)}><RotateCcw className="size-3.5" /></IconAction>}
          <IconAction label={deleteLabel} onClick={onDelete}><Trash2 className="size-3.5" /></IconAction>
        </div>
      </div>
    </article>
  );
}

function retryAssetUrl(url: string, attempt: number): string {
  const next = new URL(url, "https://genora.local");
  next.searchParams.set("retry", String(attempt));
  return `${next.pathname}${next.search}`;
}

function RetryStudioVideo({ previewUrl, alt }: { previewUrl: string; alt: string }) {
  return (
    <>
      <RetryStudioImage url={previewUrl} alt={alt} />
      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
        <span className="grid size-12 place-items-center rounded-full bg-black/55 text-white">
          <Play className="size-5 fill-current" />
        </span>
      </span>
    </>
  );
}

function RetryStudioImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState(url);
  const tries = useRef(0);
  useEffect(() => { setSrc(url); tries.current = 0; }, [url]);
  return <Image src={src} alt={alt} fill unoptimized className="object-contain" sizes="(max-width: 640px) 78vw, 24vw" onError={() => {
    if (tries.current >= 4) return;
    tries.current += 1;
    const attempt = tries.current;
    window.setTimeout(() => setSrc(retryAssetUrl(url, attempt)), 700 * attempt);
  }} />;
}

function RetryPreviewImage({ url, alt, className, onClick }: { url: string; alt: string; className?: string; onClick?: (event: ReactMouseEvent<HTMLImageElement>) => void }) {
  const [src, setSrc] = useState(url);
  const tries = useRef(0);
  useEffect(() => { setSrc(url); tries.current = 0; }, [url]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onClick={onClick} onError={() => {
      if (tries.current >= 4) return;
      tries.current += 1;
      const attempt = tries.current;
      window.setTimeout(() => setSrc(retryAssetUrl(url, attempt)), 700 * attempt);
    }} />
  );
}

function IconAction({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={cn("grid size-7 place-items-center rounded-lg transition-colors hover:bg-mist hover:text-text", active ? "bg-emerald-500/10 text-emerald-500" : "text-steel")}>{children}</button>; }

function CountPicker({ copy, value, onChange }: { copy: WorkspaceUiCopy; value: 1 | 2 | 4; onChange: (value: 1 | 2 | 4) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative"><button type="button" aria-label={copy.countAria} title={copy.countAria} onClick={() => setOpen((current) => !current)} className="flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-text hover:bg-mist">{value} {copy.variantsShort}<ChevronDown className="size-3"/></button>{open ? <><button type="button" aria-label={copy.closeList} className="fixed inset-0 z-40" onClick={() => setOpen(false)}/><div className="absolute bottom-[calc(100%+.45rem)] end-0 z-50 w-28 rounded-xl border border-border bg-surface p-1 shadow-xl">{([1, 2, 4] as const).map((item) => <button key={item} type="button" onClick={() => { onChange(item); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-text hover:bg-mist"><span>{item} {copy.variantsShort}</span>{item === value ? <Check className="size-3.5 text-accent-brand"/> : null}</button>)}</div></> : null}</div>;
}

function ChoiceSelect({ value, choices, onChange, disabled = false, direction = "down", align = "start", compact = false, prefix, placeholder, leading, revealed = true, onReveal, revealOnOpen = false, center = false, highlight = false, onClear, clearLabel }: { value: string; choices: Choice[]; onChange: (value: string) => void; disabled?: boolean; direction?: "up" | "down"; align?: "start" | "end"; compact?: boolean; prefix?: string; placeholder?: string; leading?: ReactNode; revealed?: boolean; onReveal?: () => void; revealOnOpen?: boolean; center?: boolean; highlight?: boolean; onClear?: () => void; clearLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = choices.find((item) => item.value === value) ?? choices[0];
  const showPlaceholder = Boolean(placeholder) && !revealed;
  const { locale } = useLocale();
  const closeLabel = workspaceUiCopy(locale).closeList;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const view = window.visualViewport;
      const viewLeft = view?.offsetLeft ?? 0;
      const viewTop = view?.offsetTop ?? 0;
      const viewWidth = view?.width ?? window.innerWidth;
      const viewHeight = view?.height ?? window.innerHeight;
      const width = Math.min(Math.max(panel.scrollWidth, trigger.width, 230), viewWidth - 16);
      let left = align === "end" ? trigger.right - width : trigger.left;
      left = Math.min(Math.max(left, viewLeft + 8), viewLeft + viewWidth - width - 8);
      const maxHeight = Math.max(160, viewHeight - 16);
      const height = Math.min(panel.offsetHeight || 280, maxHeight);
      let top = direction === "up" ? trigger.top - height - 6 : trigger.bottom + 6;
      if (top < viewTop + 8) top = trigger.bottom + 6;
      if (top + height > viewTop + viewHeight - 8) top = Math.max(viewTop + 8, trigger.top - height - 6);
      setCoords({ top, left, width, maxHeight });
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (panelRef.current && observer) observer.observe(panelRef.current);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [align, direction, open]);

  const pageDir = typeof document === "undefined" ? "ltr" : document.documentElement.dir || "ltr";
  const panel = open && !disabled && mounted ? createPortal(
    <>
      <button type="button" aria-label={closeLabel} className="fixed inset-0 z-[75] cursor-default" onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        data-lenis-prevent
        dir={pageDir}
        style={{
          top: 0,
          left: 0,
          right: "auto",
          width: coords?.width,
          maxHeight: coords?.maxHeight,
          transform: coords ? `translate3d(${coords.left}px, ${coords.top}px, 0)` : "translate3d(-9999px, 0, 0)",
        }}
        className="fixed z-[80] min-w-[230px] overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-2xl"
      >
        {choices.map((item) => (
          <button key={item.value} type="button" disabled={item.disabled} onClick={() => { onChange(item.value); onReveal?.(); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-mist disabled:opacity-45">
            {item.visual}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text">{item.label}</span>
              {item.description ? <span className="block text-[10px] leading-snug text-steel">{item.description}</span> : null}
            </span>
            {item.value === value ? <Check className="size-4 shrink-0 text-accent-brand"/> : null}
          </button>
        ))}
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <div ref={triggerRef} className="relative">
      <button type="button" disabled={disabled} aria-label={prefix ? `${prefix}: ${selected?.label ?? "—"}` : undefined} title={prefix ? `${prefix}: ${selected?.label ?? "—"}` : undefined} onClick={() => { if (revealOnOpen) onReveal?.(); setOpen((current) => !current); }} className={cn(compact ? "flex h-8 max-w-[10rem] items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-text outline-none hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40" : cn("flex h-11 w-full items-center gap-2 rounded-xl border text-sm text-text outline-none transition hover:bg-mist focus:border-accent-brand disabled:cursor-not-allowed disabled:text-steel", highlight ? "border-accent-brand bg-accent-brand/10 ring-2 ring-accent-brand/20" : "border-border bg-bg", center ? "relative justify-center px-8 text-center" : "justify-between px-3 text-start", onClear && value && "relative pe-16"))}>
        <span className="flex min-w-0 items-center gap-1.5">{showPlaceholder ? leading : (selected?.visual ?? leading)}<span className="min-w-0 truncate font-medium">{showPlaceholder ? placeholder : (selected?.label ?? "—")}</span></span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-steel", (center || (onClear && value)) && "absolute end-3")}/>
      </button>
      {onClear && value ? <button type="button" aria-label={clearLabel} title={clearLabel} onClick={(event) => { event.stopPropagation(); setOpen(false); onClear(); }} className="absolute end-9 top-1/2 z-[2] grid size-5 -translate-y-1/2 place-items-center rounded-full border border-steel/40 bg-surface text-steel hover:border-destructive hover:text-destructive"><X className="size-3" /></button> : null}
      {panel}
    </div>
  );
}

function StyleIcon({ id }: { id: string }) {
  const Icon = { auto: Sparkles, photorealistic: Camera, illustration: PenLine, cinematic: Clapperboard, minimal: Minimize2, three_d: Box, cartoon: Smile }[id] ?? Sparkles;
  return <Icon className="size-4 shrink-0 text-accent-brand" />;
}

function RatioIcon({ value }: { value: string }) { const [width, height] = value.split(":").map(Number); const ratio = width && height ? width / height : 1; const boxWidth = ratio >= 1 ? 18 : Math.max(10, 18 * ratio); const boxHeight = ratio <= 1 ? 18 : Math.max(10, 18 / ratio); return <span className="grid size-5 shrink-0 place-items-center"><span className="rounded border-2 border-steel/60" style={{ width: boxWidth, height: boxHeight }}/></span>; }
