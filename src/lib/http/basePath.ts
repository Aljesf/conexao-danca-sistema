export function getBasePath(): string {
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
  if (!bp) return "";
  return bp.startsWith("/") ? bp.replace(/\/+$/, "") : `/${bp.replace(/\/+$/, "")}`;
}

export function withBasePath(path: string): string {
  const bp = getBasePath();
  if (!path.startsWith("/")) return `${bp}/${path}`;
  return `${bp}${path}`;
}
