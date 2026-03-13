type JsonPrimitive = string | number | boolean | null;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

export type SanitizeSupportPayloadOptions = {
  maxDepth?: number;
  maxEntries?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maxSerializedLength?: number;
};

export type SanitizeSupportPayloadResult = {
  sanitized: JsonLike;
  serialized: string;
  truncated: boolean;
};

const DEFAULT_OPTIONS: Required<SanitizeSupportPayloadOptions> = {
  maxDepth: 5,
  maxEntries: 40,
  maxArrayLength: 20,
  maxStringLength: 1200,
  maxSerializedLength: 12000,
};

function truncateString(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 16))}... [truncated]`;
}

function sanitizeUnknown(
  value: unknown,
  opts: Required<SanitizeSupportPayloadOptions>,
  depth: number,
  seen: WeakSet<object>,
): JsonLike | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return truncateString(value, opts.maxStringLength);
  if (typeof value === "bigint") return String(value);
  if (typeof value === "symbol" || typeof value === "function") return undefined;
  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: truncateString(value.name || "Error", 120),
      message: truncateString(value.message || "", opts.maxStringLength),
      stack: truncateString(value.stack || "", opts.maxStringLength),
    };
  }

  if (depth >= opts.maxDepth) return "[depth_limit]";

  if (Array.isArray(value)) {
    const items: JsonLike[] = [];
    for (const entry of value.slice(0, opts.maxArrayLength)) {
      const sanitized = sanitizeUnknown(entry, opts, depth + 1, seen);
      if (sanitized !== undefined) items.push(sanitized);
    }
    if (value.length > opts.maxArrayLength) {
      items.push(`[array_truncated:${value.length - opts.maxArrayLength}]`);
    }
    return items;
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);

    const output: Record<string, JsonLike> = {};
    const source = value as Record<string, unknown>;
    const entries = Object.entries(source).slice(0, opts.maxEntries);

    for (const [key, entryValue] of entries) {
      const sanitized = sanitizeUnknown(entryValue, opts, depth + 1, seen);
      if (sanitized !== undefined) {
        output[key] = sanitized;
      }
    }

    const totalEntries = Object.keys(source).length;
    if (totalEntries > opts.maxEntries) {
      output._truncated_entries = `[object_truncated:${totalEntries - opts.maxEntries}]`;
    }

    return output;
  }

  return String(value);
}

export function sanitizeSupportPayload(
  value: unknown,
  options: SanitizeSupportPayloadOptions = {},
): SanitizeSupportPayloadResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sanitized = sanitizeUnknown(value, opts, 0, new WeakSet<object>()) ?? {};
  let serialized = JSON.stringify(sanitized);
  let truncated = false;

  if (serialized.length > opts.maxSerializedLength) {
    truncated = true;
    const fallback = {
      _truncated: true,
      preview: truncateString(serialized, opts.maxSerializedLength - 64),
      size: serialized.length,
    };
    serialized = JSON.stringify(fallback);
    return { sanitized: fallback, serialized, truncated };
  }

  return { sanitized, serialized, truncated };
}
