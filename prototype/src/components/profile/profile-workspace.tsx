"use client";

import { ProfileBalance } from "@/components/profile/profile-balance";
import { ProfileGuard } from "@/components/profile/profile-guard";
import { ProfileSecurity } from "@/components/profile/profile-security";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { ProfileUsage } from "@/components/profile/profile-usage";
import { ProfileCharacters } from "@/components/profile/profile-characters";
import { useAppPathname } from "@/lib/i18n/use-app-pathname";
import { useEffect, useState } from "react";

type ProfileSection = "settings" | "characters" | "balance" | "usage" | "security";

function activeSection(pathname: string): ProfileSection {
  if (pathname.startsWith("/profile/characters")) return "characters";
  if (pathname.startsWith("/profile/balance")) return "balance";
  if (pathname.startsWith("/profile/usage")) return "usage";
  if (pathname.startsWith("/profile/security")) return "security";
  return "settings";
}

const sections: Array<{ id: ProfileSection; content: React.ReactNode }> = [
  { id: "settings", content: <ProfileSettings /> },
  { id: "characters", content: <ProfileCharacters /> },
  { id: "balance", content: <ProfileBalance /> },
  { id: "usage", content: <ProfileUsage /> },
  { id: "security", content: <ProfileSecurity /> },
];

export function ProfileWorkspace() {
  const pathname = useAppPathname();
  const active = activeSection(pathname);
  const [visited, setVisited] = useState<Set<ProfileSection>>(() => new Set([active]));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisited((current) => current.has(active) ? current : new Set([...current, active]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <main data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <ProfileGuard>
          {sections.map((section) => visited.has(section.id) || section.id === active ? (
            <div key={section.id} className={section.id === active ? "animate-in fade-in duration-150" : "hidden"}>
              {section.content}
            </div>
          ) : null)}
        </ProfileGuard>
      </div>
    </main>
  );
}
