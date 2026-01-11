"use client";

import { SystemLogoImage } from "@/components/branding/SystemLogoImage";
import { SystemWordmark, type WordmarkSegment } from "@/components/branding/SystemWordmark";

type SystemSettings = {
  system_name: string;
  logo_color_url: string | null;
  logo_white_url: string | null;
  logo_transparent_url: string | null;
  wordmark_segments: WordmarkSegment[];
};

type Props = {
  settings: SystemSettings;
  variant?: "color" | "white" | "transparent";
  showWordmark?: boolean;
  showSystemName?: boolean;
  className?: string;
};

export function SystemBranding({
  settings,
  variant = "color",
  showWordmark = true,
  showSystemName = false,
  className,
}: Props) {
  const src =
    variant === "transparent"
      ? settings.logo_transparent_url
      : variant === "white"
      ? settings.logo_white_url
      : settings.logo_color_url;

  const wrapperClass = ["flex items-center gap-3", className].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      <SystemLogoImage src={src} width={180} height={90} />
      <div className="flex flex-col leading-tight">
        {showWordmark ? <SystemWordmark segments={settings.wordmark_segments} className="text-xl" /> : null}
        {showSystemName ? <span className="text-xs text-slate-500">{settings.system_name}</span> : null}
      </div>
    </div>
  );
}
