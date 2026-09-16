"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/locale-link";
import type { ReactNode } from "react";

export function ProfileGuard({ children }: { children: ReactNode }) {
  const t = useT();
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="min-h-[40vh]" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {t.profile.guestTitle}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-steel">
          {t.profile.guestSubtitle}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/register" target="_blank" rel="noopener" />}>
            {t.workspace.signUp}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/login" target="_blank" rel="noopener" />}
          >
            {t.workspace.signIn}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
