import Image from "next/image";

type Props = {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
};

export function SystemLogoImage({
  src,
  alt = "Conectarte - Sistema",
  width = 220,
  height = 120,
  className,
}: Props) {
  const fallback = "/branding/conectarte/logo-conectarte.png";
  const finalSrc = src && src.trim().length > 0 ? src : fallback;
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
