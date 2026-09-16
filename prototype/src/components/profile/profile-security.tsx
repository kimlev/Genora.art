"use client";

import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { useT } from "@/components/providers/locale-provider";
import { PinTiles } from "@/components/security/pin-tiles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { useEffect, useState, type FormEvent } from "react";

type SecurityStatus = {
  pinEnabled: boolean;
  totpEnabled: boolean;
  totpUiEnabled: boolean;
};

export function ProfileSecurity() {
  const t = useT();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/security", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as SecurityStatus | null;
        if (active && response.ok && payload) setStatus(payload);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        {t.profile.securityTitle}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-steel">
        {t.profile.securitySubtitle}
      </p>

      {notice ? (
        <p role="status" className="mt-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {notice}
        </p>
      ) : null}

      <Accordion multiple={false} value={open} onValueChange={setOpen} className="mt-8 gap-3">
        <SecurityItem value="password" title={t.profile.changePasswordTitle}>
          <PasswordPanel />
        </SecurityItem>

        <SecurityItem
          value="pin"
          title={t.profile.pinTitle}
          enabled={status?.pinEnabled ?? false}
          onLabel={t.profile.statusOn}
          offLabel={t.profile.statusOff}
        >
          <PinPanel
            enabled={status?.pinEnabled ?? false}
            onEnabledChange={(pinEnabled) => setStatus((current) => current ? { ...current, pinEnabled } : current)}
            onNotice={setNotice}
          />
        </SecurityItem>

        {status?.totpUiEnabled ? (
          <SecurityItem
            value="totp"
            title={t.profile.googleAuthTitle}
            enabled={status.totpEnabled}
            onLabel={t.profile.statusOn}
            offLabel={t.profile.statusOff}
          >
            {open.includes("totp") ? (
              <TotpPanel
                enabled={status.totpEnabled}
                onEnabledChange={(totpEnabled) => setStatus((current) => current ? { ...current, totpEnabled } : current)}
                onNotice={setNotice}
              />
            ) : null}
          </SecurityItem>
        ) : null}
      </Accordion>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-steel">
          {t.profile.sessionsTitle}
        </h2>
        <p className="mt-3 text-sm text-steel">{t.profile.sessionsNote}</p>
      </div>
    </section>
  );
}

function SecurityItem({
  value,
  title,
  enabled,
  onLabel,
  offLabel,
  children,
}: {
  value: string;
  title: string;
  enabled?: boolean;
  onLabel?: string;
  offLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="overflow-hidden rounded-2xl border border-border bg-surface px-4 not-last:border-b-0">
      <AccordionTrigger className="items-center gap-3 py-4 text-base text-text hover:no-underline">
        <span className="flex-1 text-left font-medium">{title}</span>
        {onLabel && offLabel ? (
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            enabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-mist text-steel",
          )}>
            {enabled ? onLabel : offLabel}
          </span>
        ) : null}
      </AccordionTrigger>
      <AccordionContent className="pb-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function PasswordPanel() {
  const t = useT();
  const router = useLocaleRouter();
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== repeatPassword) return setError(t.profile.passwordMismatch);
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: formData.get("currentPassword"), newPassword }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? t.profile.passwordChangeFailed);
      setSaving(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="current-password">{t.profile.currentPassword}</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 bg-surface"
          onChange={() => setError(null)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">{t.profile.newPassword}</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className="h-10 bg-surface"
          minLength={8}
          maxLength={128}
          value={newPassword}
          onChange={(event) => { setNewPassword(event.target.value); setError(null); }}
        />
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="repeat-password">{t.profile.repeatPassword}</Label>
        <Input
          id="repeat-password"
          name="repeatPassword"
          type="password"
          autoComplete="new-password"
          required
          className="h-10 bg-surface"
          value={repeatPassword}
          onChange={(event) => { setRepeatPassword(event.target.value); setError(null); }}
        />
      </div>
      <div className="mt-1">
        <Button type="submit" disabled={saving}>{saving ? t.profile.saving : t.profile.changePassword}</Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function PinPanel({
  enabled,
  onEnabledChange,
  onNotice,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onNotice: (message: string | null) => void;
}) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [repeatPin, setRepeatPin] = useState("");
  const [step, setStep] = useState<"create" | "repeat">("create");
  const [wantOff, setWantOff] = useState(false);
  const [disablePin, setDisablePin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPin("");
    setRepeatPin("");
    setStep("create");
    setWantOff(false);
    setDisablePin("");
    setError(null);
  }, [enabled]);

  const savePin = async () => {
    if (pin.length !== 4) return setError(t.profile.pinInvalid);
    if (pin !== repeatPin) return setError(t.profile.pinMismatch);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin, confirmPin: repeatPin }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) return setError(payload?.error ?? t.profile.pinInvalid);
    onEnabledChange(true);
    onNotice(t.profile.pinSaved);
  };

  const disable = async () => {
    if (disablePin.length !== 4) return setError(t.profile.pinInvalid);
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/pin", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: disablePin }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) return setError(payload?.error ?? t.profile.pinWrong);
    onEnabledChange(false);
    onNotice(t.profile.pinDisabled);
  };

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-steel">{t.profile.pinActiveDescription}</p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-mist/40 px-4 py-3">
          <span className="text-sm font-medium text-text">{wantOff ? t.profile.statusOff : t.profile.statusOn}</span>
          <Switch
            checked={!wantOff}
            onCheckedChange={(checked) => {
              setWantOff(!checked);
              setDisablePin("");
              setError(null);
              onNotice(null);
            }}
          />
        </div>
        {wantOff ? (
          <>
            <PinTiles
              id="disable-pin"
              value={disablePin}
              onChange={(value) => { setDisablePin(value); setError(null); }}
              autoFocus
              ariaLabel={t.profile.pinEnterToDisable}
            />
            <div>
              <Button type="button" disabled={saving || disablePin.length !== 4} onClick={() => void disable()}>
                {saving ? t.profile.saving : t.profile.pinConfirmDisable}
              </Button>
            </div>
          </>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-steel">{t.profile.pinDescription}</p>
      <PinTiles
        id="new-pin"
        value={pin}
        onChange={(value) => { setPin(value); setError(null); }}
        disabled={step === "repeat"}
        ariaLabel={t.profile.pinTitle}
      />
      {step === "create" ? (
        <div>
          <Button type="button" disabled={pin.length !== 4} onClick={() => { setStep("repeat"); setError(null); }}>
            {t.profile.pinAdd}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-text">{t.profile.pinRepeat}</p>
          <PinTiles
            id="repeat-pin"
            value={repeatPin}
            onChange={(value) => { setRepeatPin(value); setError(null); }}
            autoFocus
            ariaLabel={t.profile.pinRepeat}
          />
          <div>
            <Button type="button" disabled={saving || repeatPin.length !== 4} onClick={() => void savePin()}>
              {saving ? t.profile.saving : t.profile.pinSave}
            </Button>
          </div>
        </>
      )}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function TotpPanel({
  enabled,
  onEnabledChange,
  onNotice,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onNotice: (message: string | null) => void;
}) {
  const t = useT();
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [wantOff, setWantOff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (enabled) return;
    let active = true;
    void fetch("/api/auth/totp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { qrSvg?: string; error?: string } | null;
      if (!active) return;
      if (!response.ok) {
        setError(payload?.error ?? t.profile.googleAuthCode);
        return;
      }
      setQrSvg(payload?.qrSvg ?? null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [enabled, t.profile.googleAuthCode]);

  const activate = async () => {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/totp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "enable", code }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) return setError(payload?.error ?? t.profile.googleAuthCode);
    onEnabledChange(true);
    onNotice(t.profile.googleAuthActivated);
  };

  const disable = async () => {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/auth/totp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "disable", code }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) return setError(payload?.error ?? t.profile.googleAuthCode);
    onEnabledChange(false);
    setQrSvg(null);
    setCode("");
    setWantOff(false);
    onNotice(t.profile.googleAuthDisabled);
  };

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-steel">{t.profile.googleAuthEnabled}</p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-mist/40 px-4 py-3">
          <span className="text-sm font-medium text-text">{wantOff ? t.profile.statusOff : t.profile.statusOn}</span>
          <Switch
            checked={!wantOff}
            onCheckedChange={(checked) => {
              setWantOff(!checked);
              setCode("");
              setError(null);
            }}
          />
        </div>
        {wantOff ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="totp-disable">{t.profile.googleAuthCode}</Label>
              <Input
                id="totp-disable"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 bg-surface tracking-[0.3em]"
              />
            </div>
            <div>
              <Button type="button" disabled={saving || code.length !== 6} onClick={() => void disable()}>
                {saving ? t.profile.saving : t.profile.googleAuthDisable}
              </Button>
            </div>
          </>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-steel">{t.profile.googleAuthDescription}</p>
      {qrSvg ? (
        <div
          className="w-44 overflow-hidden rounded-2xl border border-border bg-white p-3 text-text"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      ) : (
        <div className="h-44 w-44 animate-pulse rounded-2xl bg-mist" />
      )}
      <div className="space-y-2">
        <Label htmlFor="totp-enable">{t.profile.googleAuthCode}</Label>
        <Input
          id="totp-enable"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-10 bg-surface tracking-[0.3em]"
        />
      </div>
      <div>
        <Button type="button" disabled={saving || code.length !== 6} onClick={() => void activate()}>
          {saving ? t.profile.saving : t.profile.googleAuthActivate}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
