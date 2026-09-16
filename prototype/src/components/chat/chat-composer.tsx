"use client";

import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_CHAT_ATTACHMENT_BYTES, MAX_CHAT_ATTACHMENTS, MAX_CHAT_ATTACHMENTS_TOTAL_BYTES } from "@/lib/chat-attachments";
import { chatVideoCopy, isGeminiVideoFile, MAX_CHAT_VIDEO_BYTES } from "@/lib/chat-video";
import { photoPromptCopy, photoPromptPlaceholder } from "@/lib/photo-prompt-agent";
import { MIN_VOICE_BYTES, VOICE_RECORDER_TIMESLICE_MS, cleanAudioMime, fileDataUrl, flushAndStopRecorder, recorderMime, voiceFilename } from "@/lib/voice-recorder";
import { workspaceUiCopy } from "@/lib/i18n/workspace-ui-copy";
import { chatUiCopy } from "@/lib/i18n/copy/chat-ui";
import { getLocaleOption } from "@/lib/i18n";
import { AlertCircle, ArrowUp, Camera, FileAudio, FileText, FolderUp, ImagePlus, Mic, Plus, Square, Video, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type ComposerAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: "image" | "file" | "audio" | "video";
  dataUrl: string;
};

export type ComposerDraft = {
  text: string;
  attachments?: ComposerAttachment[];
  nonce: number;
};

type ChatComposerProps = {
  onSend: (message: string, attachments: ComposerAttachment[]) => void;
  disabled?: boolean;
  allowDeviceAccess?: boolean;
  allowVideo?: boolean;
  videoOnly?: boolean;
  photoOnly?: boolean;
  className?: string;
  draft?: ComposerDraft | null;
};

const MAX_IMAGE_EDGE = 1600;

async function optimizedImageDataUrl(file: File): Promise<string> {
  const source = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image_decode_failed"));
      image.src = source;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function ChatComposer({ onSend, disabled = false, allowDeviceAccess = false, allowVideo = false, videoOnly = false, photoOnly = false, className, draft }: ChatComposerProps) {
  const t = useT();
  const { locale } = useLocale();
  const copy = workspaceUiCopy(locale);
  const chatCopy = chatUiCopy(locale);
  const videoCopy = chatVideoCopy(locale);
  const photoCopy = photoPromptCopy(locale);
  const mediaOnly = videoOnly || photoOnly;
  const intlTag = getLocaleOption(locale).intl;
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingSecondsRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);

  const videoEnabled = allowVideo || videoOnly;

  useEffect(() => {
    if (photoOnly) {
      setAttachments((current) => current.filter((item) => item.kind === "image"));
      return;
    }
    if (videoOnly) {
      setAttachments((current) => current.filter((item) => item.kind === "video"));
      return;
    }
    if (allowVideo) return;
    setAttachments((current) => current.filter((item) => item.kind !== "video"));
  }, [allowVideo, photoOnly, videoOnly]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setAttachmentMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setAttachmentMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKeyDown); };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    void videoRef.current.play();
  }, [cameraOpen]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!draft) return;
    setValue(draft.text);
    setAttachments(draft.attachments ?? []);
  }, [draft]);

  const appendTranscript = useCallback((text: string) => {
    const next = text.trim();
    if (!next) return;
    setValue((current) => current.trim() ? `${current.trim()} ${next}` : next);
  }, []);

  const transcribeAudio = useCallback(async (dataUrl: string, mime: string, filename: string) => {
    setTranscribing(true);
    setMicError(null);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audioBase64: dataUrl, mime, filename }),
      });
      const payload = await response.json().catch(() => null) as { text?: string } | null;
      if (!response.ok || !payload?.text?.trim()) throw new Error("transcribe_failed");
      appendTranscript(payload.text);
    } catch {
      setMicError(copy.transcribeFailed);
    } finally {
      setTranscribing(false);
    }
  }, [appendTranscript, copy.transcribeFailed]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (videoOnly && !attachments.some((item) => item.kind === "video")) return;
    if (photoOnly && !attachments.some((item) => item.kind === "image")) return;
    if ((!trimmed && attachments.length === 0) || disabled || isRecording || transcribing) return;
    onSend(mediaOnly ? trimmed : (trimmed || chatCopy.attachmentOnlyPrompt), attachments);
    setValue("");
    setAttachments([]);
  }, [attachments, chatCopy.attachmentOnlyPrompt, disabled, isRecording, mediaOnly, onSend, photoOnly, transcribing, value, videoOnly]);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>, kind: "image" | "file" | "audio" | "video") => {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_CHAT_ATTACHMENTS);
    event.target.value = "";
    setAttachmentError(null);
    if (photoOnly && kind !== "image") {
      setAttachmentError(photoCopy.photosOnly);
      return;
    }
    if (videoOnly && kind !== "video") {
      setAttachmentError(videoCopy.videoOnlyGemini);
      return;
    }
    if (kind === "video" && !videoEnabled) {
      setAttachmentError(videoCopy.videoOnlyGemini);
      return;
    }
    const fileLimit = kind === "video" ? MAX_CHAT_VIDEO_BYTES : MAX_CHAT_ATTACHMENT_BYTES;
    const tooLarge = files.find((file) => file.size > fileLimit);
    if (tooLarge) setAttachmentError(kind === "video" ? videoCopy.tooLarge(tooLarge.name) : chatCopy.attachmentTooLarge(tooLarge.name));
    const currentBytes = attachments
      .filter((item) => kind === "video" ? item.kind === "video" : item.kind !== "video")
      .reduce((sum, item) => sum + item.size, 0);
    let nextBytes = currentBytes;
    const totalLimit = kind === "video" ? MAX_CHAT_VIDEO_BYTES : MAX_CHAT_ATTACHMENTS_TOTAL_BYTES;
    const accepted = files.filter((file) => {
      const matchesKind = kind === "file"
        || (kind === "image" ? file.type.startsWith("image/") : kind === "video" ? isGeminiVideoFile(file.name, file.type) : file.type.startsWith("audio/") || /\.(?:webm|mp3|m4a|wav|ogg|mp4)$/i.test(file.name));
      if (!matchesKind || file.size > fileLimit || nextBytes + file.size > totalLimit) return false;
      nextBytes += file.size;
      return true;
    });
    if (kind === "video") {
      const rejected = files.find((file) => !accepted.includes(file) && file.size <= fileLimit && !isGeminiVideoFile(file.name, file.type));
      if (rejected) setAttachmentError(videoCopy.notVideo(rejected.name));
    } else if (accepted.length < files.filter((file) => file.size <= fileLimit).length && nextBytes >= totalLimit) setAttachmentError(chatCopy.attachmentsTotalTooLarge);
    const prepared = await Promise.all(accepted.map(async (file): Promise<ComposerAttachment | null> => {
      const dataUrl = kind === "image" ? await optimizedImageDataUrl(file) : await fileDataUrl(file);
      if (kind === "audio") {
        await transcribeAudio(dataUrl, file.type || "audio/webm", file.name);
        return null;
      }
      return {
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        kind,
        dataUrl,
      };
    }));
    setAttachments((current) => [...current, ...prepared.filter((item): item is ComposerAttachment => Boolean(item))].slice(0, MAX_CHAT_ATTACHMENTS));
    setAttachmentMenuOpen(false);
  };

  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .slice(0, 4);
    if (videoOnly) {
      if (files.length) {
        event.preventDefault();
        setAttachmentError(videoCopy.videoOnlyGemini);
      }
      return;
    }
    if (photoOnly && !files.length) return;
    if (!files.length) return;
    event.preventDefault();
    setAttachmentError(null);
    const accepted = files.filter((file) => file.size <= MAX_CHAT_ATTACHMENT_BYTES);
    if (accepted.length !== files.length) setAttachmentError(chatCopy.screenshotTooLarge);
    const prepared = await Promise.all(accepted.map(async (file): Promise<ComposerAttachment> => ({
      id: `clipboard-${Date.now()}-${Math.random()}`,
      name: file.name || chatCopy.screenshotName(new Date().toLocaleTimeString(intlTag)),
      size: file.size,
      type: file.type,
      kind: "image",
      dataUrl: await optimizedImageDataUrl(file),
    })));
    setAttachments((current) => [...current, ...prepared].slice(0, MAX_CHAT_ATTACHMENTS));
  };

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }, []);

  const startCamera = async () => {
    setAttachmentError(null);
    setAttachmentMenuOpen(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraOpen(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError") {
        setAttachmentError(chatCopy.cameraDenied);
        return;
      }
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    const captured: ComposerAttachment = {
      id: `camera-${Date.now()}`,
      name: chatCopy.photoName(new Date().toLocaleTimeString(intlTag, { hour: "2-digit", minute: "2-digit" })),
      size: Math.round(dataUrl.length * 0.75),
      type: "image/jpeg",
      kind: "image",
      dataUrl,
    };
    setAttachments((current) => [...current, captured].slice(0, MAX_CHAT_ATTACHMENTS));
    stopCamera();
  };

  const startRecording = async () => {
    setMicError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMicError(chatCopy.micInsecure);
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setMicError(chatCopy.micUnsupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = recorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recordingSecondsRef.current = 0;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > MAX_CHAT_ATTACHMENT_BYTES) setMicError(chatCopy.voiceTooLarge);
        else if (blob.size < MIN_VOICE_BYTES || chunksRef.current.length === 0) setMicError(copy.transcribeFailed);
        else {
          const dataUrl = await fileDataUrl(blob);
          await transcribeAudio(dataUrl, cleanAudioMime(type), voiceFilename(type));
        }
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start(VOICE_RECORDER_TIMESLICE_MS);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMicError(name === "NotAllowedError" ? chatCopy.micDenied : chatCopy.micFailed);
    }
  };

  const stopRecording = () => {
    flushAndStopRecorder(recorderRef.current);
    setIsRecording(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit(); };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } };

  return (
    <>
    <div data-testid="chat-composer" className={cn("min-h-[184px] shrink-0 border-t border-border bg-surface/90 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4", className)}>
      <div className="mx-auto max-w-4xl">
        {attachmentError ? <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"><span>{attachmentError}</span><button type="button" aria-label={chatCopy.dismissMessage} onClick={() => setAttachmentError(null)}><X className="size-3.5" /></button></div> : null}
        {transcribing ? <div className="mb-2 rounded-xl bg-mist px-3 py-2 text-xs text-steel">{copy.transcribing}</div> : null}
        {micError ? <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-text"><span className="flex gap-2"><AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />{micError}</span><button type="button" aria-label={chatCopy.dismissMessage} onClick={() => setMicError(null)}><X className="size-3.5" /></button></div> : null}
        {!mediaOnly && attachments.length ? <div className="mb-2 flex flex-wrap gap-2">{attachments.map((file) => <span key={file.id} className="inline-flex max-w-[260px] items-center gap-1.5 rounded-xl border border-border bg-bg px-2 py-1.5 text-xs text-steel">{file.kind === "image" ? <Image src={file.dataUrl} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 rounded-md object-cover" /> : file.kind === "video" ? <Video className="size-3.5 shrink-0 text-accent-brand" /> : file.kind === "audio" ? <FileAudio className="size-3.5 shrink-0 text-accent-brand" /> : <FileText className="size-3.5 shrink-0 text-accent-brand" />}<span className="truncate">{file.name}</span><button type="button" aria-label={chatCopy.removeAttachment(file.name)} onClick={() => setAttachments((items) => items.filter((item) => item.id !== file.id))} className="rounded p-0.5 hover:bg-mist"><X className="size-3" /></button></span>)}</div> : null}
        <form onSubmit={handleSubmit} className="rounded-[24px] border border-border bg-bg p-2 shadow-[0_10px_32px_-20px_rgba(15,40,80,.45)] focus-within:border-accent-brand/50 focus-within:ring-2 focus-within:ring-accent-brand/10">
          <Textarea value={value} onChange={(event) => setValue(event.target.value)} onPaste={(event) => void handlePaste(event)} onKeyDown={handleKeyDown} placeholder={photoOnly ? photoPromptPlaceholder(locale) : videoOnly ? videoCopy.upload : t.chat.placeholder} disabled={disabled || isRecording} rows={2} className="min-h-[64px] max-h-48 w-full resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0" />
          <div className="flex items-center justify-between gap-2">
            <div ref={menuRef} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative shrink-0">
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void onFiles(event, "image")} />
              <input ref={photoInputRef} type="file" multiple accept="image/*" className="sr-only" onChange={(event) => void onFiles(event, "image")} />
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.xml,.yml,.yaml,application/pdf,text/*" className="sr-only" onChange={(event) => void onFiles(event, "file")} />
              <input ref={audioInputRef} type="file" accept="audio/*,.webm,.mp3,.m4a,.wav,.ogg,.mp4" className="sr-only" onChange={(event) => void onFiles(event, "audio")} />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/mpeg,video/x-msvideo,video/x-ms-wmv,video/x-flv,video/3gpp,.mp4,.mov,.webm,.mpeg,.mpg,.avi,.wmv,.flv,.3gp" className="sr-only" onChange={(event) => void onFiles(event, "video")} />
              <button type="button" title={photoOnly ? photoPromptPlaceholder(locale) : videoOnly ? videoCopy.upload : copy.addAttachment} aria-label={photoOnly ? photoPromptPlaceholder(locale) : videoOnly ? videoCopy.upload : copy.addAttachment} aria-expanded={attachmentMenuOpen} disabled={disabled || isRecording} onClick={() => videoOnly ? videoInputRef.current?.click() : setAttachmentMenuOpen((open) => !open)} className="grid size-9 place-items-center rounded-full border border-border text-text transition-colors hover:bg-mist disabled:opacity-45"><Plus className="size-4" /></button>
              {!videoOnly && attachmentMenuOpen ? <div className="absolute bottom-[calc(100%+10px)] start-0 z-30 w-52 rounded-2xl border border-border bg-surface p-1.5 shadow-[0_18px_50px_-18px_rgba(15,40,80,.45)]" role="menu">
                <button type="button" role="menuitem" onClick={() => void startCamera()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><Camera className="size-4 text-accent-brand" />{copy.takePhoto}</button>
                <button type="button" role="menuitem" onClick={() => photoInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><ImagePlus className="size-4 text-accent-brand" />{copy.uploadPhoto}</button>
                {!photoOnly ? <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><FolderUp className="size-4 text-accent-brand" />{copy.addFile}</button> : null}
                {!photoOnly ? <button type="button" role="menuitem" onClick={() => audioInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><FileAudio className="size-4 text-accent-brand" />{copy.uploadAudio}</button> : null}
                {videoEnabled && !photoOnly ? <button type="button" role="menuitem" onClick={() => videoInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm text-text hover:bg-mist"><Video className="size-4 text-accent-brand" />{copy.uploadVideo ?? videoCopy.upload}</button> : null}
              </div> : null}
              </div>
              {mediaOnly && attachments.length ? <div className="flex min-w-0 flex-wrap items-center gap-1.5">{attachments.map((file) => <span key={file.id} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1 text-xs text-steel">{file.kind === "image" ? <Image src={file.dataUrl} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 rounded-md object-cover" /> : file.kind === "video" ? <video src={file.dataUrl} muted className="size-7 shrink-0 rounded-md object-cover" /> : <Video className="size-3.5 shrink-0 text-accent-brand" />}<span className="truncate">{file.name}</span><button type="button" aria-label={chatCopy.removeAttachment(file.name)} onClick={() => setAttachments((items) => items.filter((item) => item.id !== file.id))} className="rounded p-0.5 hover:bg-mist"><X className="size-3" /></button></span>)}</div> : null}
            </div>
            <div className="flex items-center gap-1.5">
              {!mediaOnly && isRecording ? <div className="mr-1 flex items-center gap-1" aria-label={chatCopy.recordingInProgress}><span className="mr-1 text-xs tabular-nums text-destructive">0:{String(recordingSeconds).padStart(2, "0")}</span>{[0, 1, 2, 3, 4].map((bar) => <span key={bar} className="w-0.5 animate-pulse rounded-full bg-destructive" style={{ height: `${8 + ((bar * 5) % 14)}px`, animationDelay: `${bar * 90}ms` }} />)}</div> : null}
              {!mediaOnly ? <button type="button" aria-label={isRecording ? chatCopy.stopRecording : chatCopy.recordVoice} title={isRecording ? chatCopy.stopRecording : chatCopy.voiceMessage} onClick={isRecording ? stopRecording : startRecording} disabled={disabled} className={cn("grid size-9 place-items-center rounded-full text-steel transition-colors hover:bg-mist hover:text-text", isRecording && "bg-destructive/10 text-destructive")}>
                {isRecording ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
              </button> : null}
              <Button type="submit" size="icon" className="rounded-full" disabled={disabled || isRecording || transcribing || (videoOnly ? !attachments.some((item) => item.kind === "video") : photoOnly ? !attachments.some((item) => item.kind === "image") : (!value.trim() && attachments.length === 0))} aria-label={t.chat.send}><ArrowUp className="size-4" /></Button>
            </div>
          </div>
        </form>
        <p className="mt-2 text-center text-[11px] text-steel">{copy.disclaimerChat}</p>
      </div>
    </div>
    {cameraOpen ? (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={copy.cameraTitle}>
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-surface p-4">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full rounded-2xl bg-black object-cover" />
          <div className="mt-4 flex justify-between">
            <Button type="button" variant="secondary" onClick={stopCamera}>{copy.cameraCancel}</Button>
            <Button type="button" onClick={capturePhoto}><Camera className="size-4" />{copy.cameraCapture}</Button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
