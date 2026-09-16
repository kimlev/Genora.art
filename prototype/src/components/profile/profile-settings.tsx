"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Textarea } from "@/components/ui/textarea";
import { countryFlag, countryLabel } from "@/lib/geo/countries";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

const MAX_AVATAR_FILE_SIZE = 5_000_000;
const AVATAR_SIZE = 256;
const MAX_IMAGE_SIDE = 10_000;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const AVATAR_ERROR_CODES = [
  "avatarTypeError",
  "avatarSizeError",
  "avatarMinError",
  "avatarMaxError",
  "avatarProcessError",
] as const;

type AvatarErrorCode = (typeof AVATAR_ERROR_CODES)[number];

function isAvatarErrorCode(value: string): value is AvatarErrorCode {
  return (AVATAR_ERROR_CODES as readonly string[]).includes(value);
}

async function prepareAvatar(file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) throw new Error("avatarTypeError");
  if (file.size > MAX_AVATAR_FILE_SIZE) throw new Error("avatarSizeError");

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 128 || bitmap.height < 128) throw new Error("avatarMinError");
    if (bitmap.width > MAX_IMAGE_SIDE || bitmap.height > MAX_IMAGE_SIDE) throw new Error("avatarMaxError");

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("avatarProcessError");

    const sourceSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - sourceSize) / 2;
    const sourceY = (bitmap.height - sourceSize) / 2;
    context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return canvas.toDataURL("image/webp", 0.84);
  } finally {
    bitmap.close();
  }
}

export function ProfileSettings() {
  const t = useT();
  const { locale } = useLocale();
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nickname: user?.nickname ?? "",
    timezone: user?.timezone ?? "Europe/Minsk",
    aiTone: user?.aiTone ?? "balanced",
    aiPreferences: user?.aiPreferences ?? "",
    registrationCountry: user?.registrationCountry ?? "",
    addressLine: user?.addressLine ?? "",
    city: user?.city ?? "",
    region: user?.region ?? "",
    postalCode: user?.postalCode ?? "",
  });
  const [avatarDataUrl, setAvatarDataUrl] = useState(user?.avatarDataUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const onAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const result = await prepareAvatar(file);
      setAvatarDataUrl(result);
      updateUser({ avatarDataUrl: result });
      setSaved(false);
    } catch (error) {
      const code = error instanceof Error && isAvatarErrorCode(error.message) ? error.message : "avatarProcessError";
      setAvatarError(t.profile[code]);
    } finally {
      setAvatarBusy(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUser({
      nickname: form.nickname.trim() || undefined,
      timezone: form.timezone,
      aiTone: form.aiTone,
      aiPreferences: form.aiPreferences.trim() || undefined,
      registrationCountry: form.registrationCountry.trim() || undefined,
      addressLine: form.addressLine.trim() || undefined,
      city: form.city.trim() || undefined,
      region: form.region.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      avatarDataUrl,
    });
    setSaved(true);
  };

  const detectedCountry = user?.detectedCountryCode
    ? `${countryFlag(user.detectedCountryCode)} ${countryLabel(user.detectedCountryCode, locale)}`.trim()
    : null;

  const change = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-text">{t.profile.profileTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-steel">{t.profile.profileSubtitle}</p>

      <form className="mt-8 grid gap-7" onSubmit={onSubmit}>
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
          <button
            type="button"
            className="group relative grid size-24 shrink-0 place-items-center overflow-visible rounded-2xl bg-mist text-2xl font-semibold text-accent-brand outline-none ring-accent-brand/25 focus-visible:ring-4"
            onClick={() => inputRef.current?.click()}
            disabled={avatarBusy}
            aria-label={avatarDataUrl ? t.profile.changePhoto : t.profile.addPhoto}
          >
            <span
              className="absolute inset-0 overflow-hidden rounded-2xl bg-cover bg-center"
              style={avatarDataUrl ? { backgroundImage: `url(${avatarDataUrl})` } : undefined}
            />
            {!avatarDataUrl ? <Plus className="relative size-7" /> : null}
            {avatarDataUrl ? <span className="absolute -bottom-1.5 -right-1.5 grid size-8 place-items-center rounded-full border-2 border-surface bg-accent-brand text-white shadow-sm"><Pencil className="size-3.5" /></span> : null}
            {avatarBusy ? <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45 text-xs font-medium text-white">{t.profile.processing}</span> : null}
          </button>
          <Input ref={inputRef} id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatar} />
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="profile-nickname">{t.profile.nickname}</Label>
            <Input id="profile-nickname" value={form.nickname} maxLength={25} placeholder="modelmaker" onChange={(event) => change("nickname", event.target.value)} />
            {avatarError ? <p className="text-xs text-destructive" role="alert">{avatarError}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t.profile.timezone}</Label>
            <TimezoneSelect
              value={form.timezone}
              onChange={(next) => change("timezone", next)}
              label={t.profile.timezone}
              searchLabel={t.profile.timezoneSearch}
              emptyLabel={t.profile.timezoneNotFound}
            />
          </div>
          <div className="space-y-2">
            <Label>{t.profile.aiTone}</Label>
            <SelectMenu
              ariaLabel={t.profile.aiTone}
              value={form.aiTone}
              options={[
                { value: "concise", label: t.profile.toneConcise },
                { value: "balanced", label: t.profile.toneBalanced },
                { value: "detailed", label: t.profile.toneDetailed },
                { value: "expert", label: t.profile.toneExpert },
              ]}
              onChange={(next) => change("aiTone", next)}
            />
          </div>
        </div>

        <fieldset className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 font-semibold text-text">{t.profile.addressLegend}</legend>
          <p className="text-sm leading-relaxed text-steel">{t.profile.addressHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="profile-country">{t.profile.country}</Label><CountrySelect id="profile-country" value={form.registrationCountry} onChange={(next) => change("registrationCountry", next)} label={t.profile.country} placeholder={t.profile.countrySelect} searchLabel={t.profile.countrySearch} emptyLabel={t.profile.countryNotFound} /></div>
            <div className="space-y-2"><Label htmlFor="profile-postal-code">{t.profile.postalCode}</Label><Input id="profile-postal-code" autoComplete="postal-code" maxLength={20} value={form.postalCode} onChange={(event) => change("postalCode", event.target.value)} placeholder="000000" /></div>
            <div className="space-y-2"><Label htmlFor="profile-region">{t.profile.region}</Label><Input id="profile-region" autoComplete="address-level1" maxLength={100} value={form.region} onChange={(event) => change("region", event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="profile-city">{t.profile.city}</Label><Input id="profile-city" autoComplete="address-level2" maxLength={100} value={form.city} onChange={(event) => change("city", event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="profile-address">{t.profile.address}</Label><Input id="profile-address" autoComplete="street-address" maxLength={240} value={form.addressLine} onChange={(event) => change("addressLine", event.target.value)} placeholder={t.profile.addressPlaceholder} /></div>
          <div className="flex items-start gap-3 rounded-xl bg-mist/70 px-4 py-3 text-sm text-steel">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent-brand" />
            <span>{t.profile.detectedPrefix} <b className="font-medium text-text">{detectedCountry ?? t.profile.detectedUnknown}</b>{user?.detectedIpAddress ? <> · IP <b className="font-medium text-text">{user.detectedIpAddress}</b></> : null}. {t.profile.detectedSuffix}</span>
          </div>
        </fieldset>

        <div className="space-y-2"><Label htmlFor="profile-ai-preferences">{t.profile.aiPreferences}</Label><Textarea id="profile-ai-preferences" value={form.aiPreferences} maxLength={500} onChange={(event) => change("aiPreferences", event.target.value)} placeholder={t.profile.aiPreferencesPlaceholder} className="min-h-28" /><p className="text-right text-xs tabular-nums text-steel">{form.aiPreferences.length}/500</p></div>

        <div className="flex items-center gap-3"><Button type="submit">{t.profile.saveChanges}</Button>{saved ? <span className="text-sm text-accent-brand">{t.profile.changesSaved}</span> : null}</div>
      </form>
    </section>
  );
}
