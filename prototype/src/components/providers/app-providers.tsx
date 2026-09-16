"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { BattleHistoryProvider } from "@/components/providers/battle-history-provider";
import { CatalogAgentsBoot } from "@/components/providers/catalog-agents-boot";
import { CatalogProvider } from "@/components/providers/catalog-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { ImageHistoryProvider } from "@/components/providers/image-history-provider";
import type { Locale } from "@/lib/i18n";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function AppProviders({ children, initialLocale }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LocaleProvider initialLocale={initialLocale}>
        <CatalogProvider>
          <CatalogAgentsBoot />
          <AuthProvider>
            <WorkspaceProvider>
              <ImageHistoryProvider>
                <BattleHistoryProvider>
                  <LenisProvider>{children}</LenisProvider>
                </BattleHistoryProvider>
              </ImageHistoryProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </CatalogProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
