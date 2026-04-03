import type { SuporteUploadOrigem } from "./constants";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildClipboardFileName(date: Date, index: number, mimeType: string) {
  const extension = MIME_TO_EXTENSION[mimeType] ?? "png";
  return [
    "print",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    String(index + 1).padStart(3, "0"),
  ].join("-") + `.${extension}`;
}

export type ClipboardImageFile = {
  file: File;
  origin: Extract<SuporteUploadOrigem, "clipboard">;
};

export async function extractClipboardImageFiles(
  clipboardData: DataTransfer | null,
): Promise<ClipboardImageFile[]> {
  if (!clipboardData) return [];

  const items = Array.from(clipboardData.items).filter((item) => item.type.startsWith("image/"));
  const timestamp = Date.now();
  const now = new Date(timestamp);

  return items
    .map((item, index) => {
      const blob = item.getAsFile();
      if (!blob) return null;

      const mimeType = blob.type || "image/png";
      const originalName = blob.name?.trim();
      const fileName = originalName || buildClipboardFileName(now, index, mimeType);
      const file = new File([blob], fileName, {
        type: mimeType,
        lastModified: timestamp + index,
      });

      return {
        file,
        origin: "clipboard" as const,
      };
    })
    .filter((entry): entry is ClipboardImageFile => entry !== null);
}
