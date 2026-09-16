"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity, ArrowLeft, LogOut, MessageCircleQuestion, Shield, User, UsersRound, Wallet } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useLocaleRouter } from "@/lib/i18n/use-locale-push";
import { characterUiCopy } from "@/lib/i18n/copy/characters";

type ProfileSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function ProfileSidebar({ onNavigate, className }: ProfileSidebarProps) {
  const t = useT();
  const { locale } = useLocale();
  const pathname = useAppPathname();
  const router = useLocaleRouter();
  const { user, signOut } = useAuth();

  const items = [
    { href: "/profile", label: t.profile.navProfile, icon: User },
    { href: "/profile/characters", label: characterUiCopy(locale).nav, icon: UsersRound },
    { href: "/profile/balance", label: t.profile.navBalance, icon: Wallet },
    { href: "/profile/usage", label: t.profile.navUsage, icon: Activity },
    { href: "/profile/security", label: t.profile.navSecurity, icon: Shield },
    { href: "/support", label: t.footer.links.support, icon: MessageCircleQuestion },
  ];

  const handleSignOut = () => {
    signOut();
    onNavigate?.();
    router.push("/");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-r border-border bg-sidebar",
        className,
      )}
    >
      <div className="flex-1 px-3 pt-4">
        <Link
          href="/chat"
          prefetch={false}
          onClick={() => onNavigate?.()}
          className="mb-3 flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm text-steel transition-colors hover:bg-sidebar-accent/60 hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {t.workspace.backToMenu}
        </Link>

        {user ? (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-brand bg-cover bg-center text-sm font-semibold text-white" style={user.avatarDataUrl ? { backgroundImage: `url(${user.avatarDataUrl})` } : undefined}>
              {user.avatarDataUrl ? null : (user.nickname ?? user.name ?? user.email).charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text">
                {user.nickname ?? user.name ?? user.email}
              </span>
              <span className="block truncate text-xs text-steel">
                {user.email}
              </span>
            </span>
          </div>
        ) : null}

        <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-steel">
          {t.profile.title}
        </p>
        <nav className="space-y-1" aria-label={t.profile.title}>
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-text"
                    : "text-steel hover:bg-sidebar-accent/60 hover:text-text",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {user ? (
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            {t.profile.signOut}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
