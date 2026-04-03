import Image from "next/image";

type Props = {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
};

function normalizeLogoSrc(src: string | null | undefined): string {
  const fallback = "/branding/conectarte/logo-conectarte.png";

  if (typeof src !== "string") return fallback;

  const normalized = src.trim();
  if (!normalized) return fallback;

  const lowered = normalized.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return fallback;

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  return fallback;
}

export function SystemLogoImage({
  src,
  alt = "Conectarte - Sistema",
  width = 220,
  height = 120,
  className,
}: Props) {
  const finalSrc = normalizeLogoSrc(src);
  const classes = ["object-contain", className].filter(Boolean).join(" ");

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={classes}
      priority
    />
  );
}
