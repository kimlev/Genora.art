"use client";

import { cn } from "@/lib/utils";
import { remoteFileSizeLabel } from "@/lib/file-size";
import { Download } from "lucide-react";
import { useState } from "react";

export function DownloadSizeAction({
  label,
  url,
  onClick,
  iconClassName = "size-3.5",
  buttonClassName,
}: {
  label: string;
  url: string;
  onClick: () => void;
  iconClassName?: string;
  buttonClassName?: string;
}) {
  const [sizeLabel, setSizeLabel] = useState("");

  const loadSize = () => {
    if (sizeLabel || !url) return;
    void remoteFileSizeLabel(url).then((next) => {
      if (next) setSizeLabel(next);
    }).catch(() => undefined);
  };

  const title = sizeLabel ? `${label} · ${sizeLabel}` : label;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseEnter={loadSize}
      onFocus={loadSize}
      onClick={onClick}
      className={cn("grid size-7 place-items-center rounded-lg text-steel transition-colors hover:bg-mist hover:text-text", buttonClassName)}
    >
      <Download className={iconClassName} />
    </button>
  );
}
