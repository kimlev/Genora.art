"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocalePush } from "@/lib/i18n/use-locale-push";
import { cn } from "@/lib/utils";

function getInitials(label: string | undefined, email: string): string {
  const source = label?.trim();

  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

/**
 * Аватар пользователя в шапке ведёт в настройки профиля.
 * Место под аватар зарезервировано всегда, чтобы шапка не «прыгала» у гостей.
 */
export function UserMenu({ className }: { className?: string }) {
  const { user, ready } = useAuth();
  const pushLocale = useLocalePush();

  if (!ready || !user) {
    return <div className="size-10 shrink-0" aria-hidden />;
  }

  const label = user.nickname?.trim() || user.name?.trim() || user.email;

  return (
    <button
      type="button"
      onClick={() => pushLocale("/profile")}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-brand bg-cover bg-center text-sm font-semibold text-white transition-opacity hover:opacity-90",
        className,
      )}
      style={user.avatarDataUrl ? { backgroundImage: `url(${user.avatarDataUrl})` } : undefined}
    >
      {user.avatarDataUrl ? null : getInitials(user.nickname ?? user.name, user.email)}
    </button>
  );
}
