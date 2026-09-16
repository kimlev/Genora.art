"use client";

import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/layout/confirm-action-dialog";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/locale-link";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { DownloadSizeAction } from "@/components/ui/download-size-action";
import { waitForGenerationJob } from "@/lib/generation-job-client";
import { canCreateAiCharacter, canCreateCharacter, CHARACTER_DESCRIPTION_MAX, CHARACTER_NAME_MAX, CHARACTER_NAME_MIN, type CharacterKind, type CharacterListPayload, type CharacterSummary } from "@/lib/characters";
import { deleteConfirmationCopy } from "@/lib/i18n/copy/delete-confirmation";
import { galleryCopy } from "@/lib/i18n/copy/gallery-copy";
import { characterUiCopy } from "@/lib/i18n/copy/characters";
import { readGalleryFavorites, subscribeGalleryFavorites, toggleGalleryFavorite } from "@/lib/gallery-favorites";
import { saveModelFeedback, useModelFeedback } from "@/lib/model-feedback";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { formatTokensAsCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";
import { Bell, CircleAlert, Clapperboard, Heart, ImagePlus, LoaderCircle, Plus, Share2, ThumbsUp, Trash2, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SOURCE_MAX_SIDE = 1800;
const SOURCE_MAX_BYTES = 8_000_000;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function prepareCharacterPhoto(file: File): Promise<string> {
  if (!ACCEPTED.has(file.type) || file.size > SOURCE_MAX_BYTES) throw new Error("photo");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 256 || bitmap.height < 256) throw new Error("photo");
    const scale = Math.min(1, SOURCE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("photo");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    bitmap.close();
  }
}

function CharacterGuide({ onClose }: { onClose: () => void }) {
  const { locale } = useLocale();
  const copy = characterUiCopy(locale);
  const examples = [
    { src: "/agents/character-card-before.jpg", title: copy.portrait, hint: copy.portraitHint, className: "object-cover" },
    { src: "/agents/character-card-profile.jpg", title: copy.profile, hint: copy.profileHint, className: "object-cover" },
    { src: "/agents/character-card-full-body.jpg", title: copy.fullBody, hint: copy.fullBodyHint, className: "object-cover" },
  ];
  return createPortal(
    <div className="fixed inset-0 z-[500] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="character-guide-title" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl bg-surface p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><h3 id="character-guide-title" className="text-xl font-semibold text-text">{copy.guideTitle}</h3><p className="mt-2 text-sm leading-relaxed text-steel">{copy.guideLead}</p></div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full border border-border hover:bg-mist" aria-label={copy.cancel}><X className="size-4" /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {examples.map((item) => <figure key={item.title}>
            <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-mist"><Image src={item.src} alt={`${item.title}: ${item.hint}`} fill unoptimized className={item.className} /></span>
            <figcaption className="mt-2 text-center text-xs font-semibold text-text">{item.title}<span className="mt-0.5 block font-normal text-steel">{item.hint}</span></figcaption>
          </figure>)}
        </div>
      </div>
    </div>, document.body,
  );
}

function CreateCharacterDialog({ onClose, onCreated, complimentary, priceTokens }: { onClose: () => void; onCreated: () => Promise<void>; complimentary: boolean; priceTokens: number | null }) {
  const { locale } = useLocale();
  const copy = characterUiCopy(locale);
  const [kind, setKind] = useState<CharacterKind>("personal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Array<string | null>>([null, null, null]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const fields = [
    { title: copy.portrait, hint: copy.portraitHint },
    { title: copy.profile, hint: copy.profileHint },
    { title: copy.fullBody, hint: copy.fullBodyHint },
  ];
  const createReady = kind === "personal" ? canCreateCharacter(name, photos, consent) : canCreateAiCharacter(name, description);

  const attach = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const photo = await prepareCharacterPhoto(file);
      setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? photo : item));
    } catch { setError(copy.photosError); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < CHARACTER_NAME_MIN || cleanName.length > CHARACTER_NAME_MAX) return setError(copy.nameError);
    if (kind === "personal" && photos.some((photo) => !photo)) return setError(copy.photosError);
    if (kind === "personal" && !consent) return setError(copy.consentError);
    if (kind === "ai" && !canCreateAiCharacter(cleanName, description)) return setError(copy.descriptionError);
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/characters", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, name: cleanName, description, images: kind === "personal" ? photos : [], consent: kind === "personal" ? consent : false, locale }) });
      const data = await response.json().catch(() => null) as { job?: { id?: string }; balanceTokens?: number; error?: string } | null;
      if (!response.ok || !data?.job?.id) throw new Error(data?.error || copy.genericError);
      if (typeof data.balanceTokens === "number") window.dispatchEvent(new Event("genora-balance-changed"));
      await onCreated();
      onClose();
      void waitForGenerationJob(data.job.id).finally(() => { void onCreated(); });
    } catch (value) { setError(value instanceof Error ? value.message : copy.genericError); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[450] grid place-items-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="character-dialog-title" onClick={() => !busy && onClose()}>
      <form className="my-auto w-full max-w-2xl rounded-3xl bg-surface p-5 shadow-2xl sm:p-7" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4"><h2 id="character-dialog-title" className="text-xl font-semibold text-text">{copy.modalTitle}</h2><button type="button" disabled={busy} onClick={onClose} className="grid size-9 place-items-center rounded-full border border-border hover:bg-mist" aria-label={copy.cancel}><X className="size-4" /></button></div>
        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-mist p-1" role="group">
          {(["personal", "ai"] as const).map((item) => <button key={item} type="button" disabled={busy} onClick={() => { setKind(item); setError(null); }} className={cn("rounded-xl px-3 py-2 text-sm font-semibold transition", kind === item ? "bg-surface text-text shadow-sm" : "text-steel hover:text-text")}>{item === "personal" ? copy.personalMode : copy.aiMode}</button>)}
        </div>
        <label className="mt-5 block text-sm font-semibold text-text">{copy.name} <span className="text-destructive" aria-hidden>*</span><Input required value={name} minLength={CHARACTER_NAME_MIN} maxLength={CHARACTER_NAME_MAX} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} className="mt-2 h-11 rounded-xl" /></label>
        {kind === "personal" ? <><div className="mt-6 flex items-start justify-between gap-3"><div><h3 className="font-semibold text-text">{copy.photosTitle} <span className="text-destructive" aria-hidden>*</span> {complimentary ? <span className="ms-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">{copy.free}</span> : null}</h3><p className="mt-1 text-sm text-steel">{copy.photosLead}</p></div><button type="button" onClick={() => setGuide(true)} className="grid size-10 shrink-0 place-items-center rounded-full border border-accent-brand/30 bg-accent-brand/10 text-accent-brand" aria-label={copy.guideTitle}><Bell className="size-4" /></button></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {fields.map((field, index) => <div key={field.title}>
            <button type="button" onClick={() => refs.current[index]?.click()} className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-mist text-steel hover:border-accent-brand">
              {photos[index] ? <Image src={photos[index]!} alt={field.title} fill unoptimized className="object-cover" /> : <Plus className="size-6" />}
            </button>
            <input ref={(node) => { refs.current[index] = node; }} type="file" accept="image/jpeg,image/png,image/webp" aria-required="true" className="sr-only" onChange={(event) => void attach(index, event)} />
            <p className="mt-2 text-center text-xs font-semibold text-text">{field.title}<span className="block font-normal text-steel">{field.hint}</span></p>
          </div>)}
        </div>
        <label className="mt-5 flex items-start gap-2 rounded-2xl border border-border p-3 text-sm text-text"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 accent-[var(--accent-brand)]" /><span>{copy.consent}</span></label></> : <label className="mt-6 block text-sm font-semibold text-text">{copy.aiDescription} <span className="text-destructive" aria-hidden>*</span><textarea required value={description} maxLength={CHARACTER_DESCRIPTION_MAX} onChange={(event) => setDescription(event.target.value)} placeholder={copy.aiDescriptionPlaceholder} className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none placeholder:text-steel/75 focus:border-accent-brand" /><span className="mt-1 block text-end text-xs tabular-nums text-steel">{[...description].length}/{CHARACTER_DESCRIPTION_MAX}</span></label>}
        {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>{copy.cancel}</Button><Button type="submit" disabled={busy || !createReady || (!complimentary && priceTokens == null)}>{busy ? <><LoaderCircle className="size-4 animate-spin" />{copy.building}</> : complimentary ? copy.build : withCreditGlyphs(`${copy.create} ${formatTokensAsCredits(priceTokens ?? 0, locale, "price")}`)}</Button></div>
      </form>
      {guide ? <CharacterGuide onClose={() => setGuide(false)} /> : null}
    </div>, document.body,
  );
}

function CharacterAction({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} onClick={onClick} className={cn("grid size-8 place-items-center rounded-lg transition-colors hover:bg-mist hover:text-text", active ? "bg-emerald-500/10 text-emerald-500" : "text-steel")}>{children}</button>;
}

function CharacterCard({ character, liked, onFavorite, onDownload, onShare, onDelete }: { character: CharacterSummary; liked: boolean; onFavorite: () => void; onDownload: () => void; onShare: () => void; onDelete: () => void }) {
  const { locale } = useLocale();
  const copy = characterUiCopy(locale);
  const gallery = galleryCopy(locale);
  const feedback = useModelFeedback();
  const rated = character.assetId ? feedback.voteForMessage(character.assetId) === 1 : false;
  return <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
    <div className="relative aspect-square bg-mist">
      {character.previewUrl ? <Image src={character.previewUrl} alt={character.name} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center">{character.status === "creating" ? <LoaderCircle className="size-8 animate-spin text-accent-brand" /> : <CircleAlert className="size-8 text-destructive" />}</div>}
      <span className={`absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold shadow ${character.status === "failed" ? "text-destructive" : character.status === "ready" ? "text-emerald-600" : "text-accent-brand"}`}>{character.status === "ready" ? copy.ready : character.status === "failed" ? copy.failed : copy.building}</span>
    </div>
    <div className="p-4"><h3 className="truncate font-semibold text-text">{character.name}</h3>
      {character.modelLabel ? <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-xs text-steel"><span className="truncate">{character.modelLabel}{character.format ? ` · ${character.format}` : ""}</span>{character.size ? <span className="shrink-0">{character.size}</span> : null}</div> : null}
      {character.status === "ready" && character.assetId && character.assetUrl ? <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <Button nativeButton={false} size="icon-sm" variant="outline" title={copy.usePhoto} aria-label={copy.usePhoto} render={<Link href={`/create-foto-video?character=${encodeURIComponent(character.id)}`} />}><ImagePlus className="size-4" /></Button>
          <Button nativeButton={false} size="icon-sm" title={copy.useVideo} aria-label={copy.useVideo} render={<Link href={`/create-foto-video?tab=video&character=${encodeURIComponent(character.id)}`} />}><Clapperboard className="size-4" /></Button>
        </div>
        <div className="ms-auto flex items-center gap-0.5">
          <DownloadSizeAction label={gallery.download} url={character.assetUrl} onClick={onDownload} buttonClassName="size-8" />
          <CharacterAction label={gallery.share} onClick={onShare}><Share2 className="size-3.5" /></CharacterAction>
          <CharacterAction label={gallery.rate} active={rated} onClick={() => character.modelId && saveModelFeedback(character.assetId!, character.modelId, character.modelLabel ?? character.modelId, 1)}><ThumbsUp className={cn("size-3.5", rated && "fill-current")} /></CharacterAction>
          <CharacterAction label={liked ? gallery.favoriteRemove : gallery.favoriteAdd} active={liked} onClick={onFavorite}><Heart className={cn("size-3.5", liked && "fill-current")} /></CharacterAction>
          <CharacterAction label={deleteConfirmationCopy(locale).title} onClick={onDelete}><Trash2 className="size-3.5" /></CharacterAction>
        </div>
      </div> : null}
    </div>
  </article>;
}

export function ProfileCharacters() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const copy = characterUiCopy(locale);
  const gallery = galleryCopy(locale);
  const deleteCopy = deleteConfirmationCopy(locale);
  const [data, setData] = useState<CharacterListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<CharacterSummary | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/characters", { cache: "no-store" });
      if (!response.ok) throw new Error("load");
      setData(await response.json() as CharacterListPayload); setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("create") === "1") setDialog(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!data?.characters.some((item) => item.status === "creating")) return;
    const timer = window.setInterval(() => { void load(); }, 3000);
    return () => window.clearInterval(timer);
  }, [data, load]);
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => setFavorites(readGalleryFavorites(user.id));
    refresh();
    return subscribeGalleryFavorites(refresh);
  }, [user?.id]);
  const downloadCharacter = async (character: CharacterSummary) => {
    if (!character.assetUrl || !character.assetId) return;
    try {
      const response = await fetch(character.assetUrl);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `genora-${character.assetId}.${blob.type.includes("jpeg") ? "jpg" : blob.type.split("/")[1] || "png"}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch { setActionNotice(gallery.downloadFailed); }
  };
  const shareCharacter = async (character: CharacterSummary) => {
    if (!character.assetUrl || !character.assetId) return;
    try {
      const response = await fetch(character.assetUrl);
      if (!response.ok) throw new Error("share");
      const blob = await response.blob();
      const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.split("/")[1] || "png";
      const file = new File([blob], `genora-${character.assetId}.${ext}`, { type: blob.type });
      const absoluteUrl = new URL(character.assetUrl, window.location.origin).href;
      const shareData = { url: absoluteUrl, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) await navigator.share(shareData);
      else if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else if (navigator.share) await navigator.share({ url: absoluteUrl });
      else { await navigator.clipboard.writeText(absoluteUrl); setActionNotice(gallery.linkCopied); }
    } catch (value) { if ((value as DOMException)?.name !== "AbortError") setActionNotice(gallery.shareFailed); }
  };
  const archiveCharacter = async (character: CharacterSummary) => {
    const response = await fetch(`/api/characters/${encodeURIComponent(character.id)}?locale=${encodeURIComponent(locale)}`, { method: "DELETE" });
    if (!response.ok) { setActionNotice(copy.genericError); return; }
    setPendingDelete(null);
    await load();
    window.dispatchEvent(new Event("genora-history-refresh"));
  };
  const activeCount = data?.characters.filter((item) => item.status === "ready" || item.status === "creating").length ?? 0;
  return <section>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-semibold tracking-tight text-text">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">{copy.subtitle}</p></div><Button onClick={() => setDialog(true)} disabled={!data || (!data.freeRemaining && data.nextBuildTokens == null)}><Plus className="size-4" />{copy.create}</Button></div>
    <div className="mt-5 flex flex-wrap gap-2 text-xs text-steel"><span className="rounded-full border border-border bg-surface px-3 py-1.5">{copy.count(activeCount, data?.limit ?? 1)}</span><span className="rounded-full border border-border bg-surface px-3 py-1.5">{copy.freeBuilds(data?.freeRemaining ?? 0)}</span></div>
    {actionNotice ? <p className="mt-4 text-sm text-steel" role="status">{actionNotice}</p> : null}
    {loading ? <div className="grid place-items-center py-20"><LoaderCircle className="size-7 animate-spin text-accent-brand" /></div> : error ? <button type="button" onClick={() => void load()} className="mt-10 text-sm text-destructive">{copy.genericError} ↻</button> : data && !data.characters.length ? <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-brand/10 text-accent-brand"><UserRound className="size-7" /></span><p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-steel">{copy.empty}</p></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data?.characters.map((character) => <CharacterCard key={character.id} character={character} liked={Boolean(character.assetId && favorites.includes(character.assetId))} onFavorite={() => { if (user && character.assetId) setFavorites(toggleGalleryFavorite(user.id, character.assetId)); }} onDownload={() => void downloadCharacter(character)} onShare={() => void shareCharacter(character)} onDelete={() => setPendingDelete(character)} />)}</div>}
    {dialog ? <CreateCharacterDialog onClose={() => setDialog(false)} onCreated={load} complimentary={Boolean(data?.freeRemaining)} priceTokens={data?.nextBuildTokens ?? null} /> : null}
    {pendingDelete ? <ConfirmActionDialog title={deleteCopy.title} cancelLabel={deleteCopy.cancel} confirmLabel={deleteCopy.confirm} onClose={() => setPendingDelete(null)} onConfirm={() => { void archiveCharacter(pendingDelete); }} /> : null}
  </section>;
}
