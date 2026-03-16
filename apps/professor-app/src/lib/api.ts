import { ENV } from "../config/env";
import { getAccessToken } from "./supabase";

function isHtmlResponse(contentType: string, body: string): boolean {
  const normalizedType = contentType.toLowerCase();
  const normalizedBody = body.trimStart().toLowerCase();

  return normalizedType.includes("text/html")
    || normalizedBody.startsWith("<!doctype html")
    || normalizedBody.startsWith("<html");
}

function parseJsonSafe(body: string): unknown | null {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function extractApiMessage(payload: unknown): { error: string; details?: string } | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as { error?: unknown; details?: unknown; message?: unknown };
  const error = typeof candidate.error === "string"
    ? candidate.error
    : typeof candidate.message === "string"
      ? candidate.message
      : null;

  if (!error) return null;

  return {
    error,
    details: typeof candidate.details === "string" ? candidate.details : undefined,
  };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text().catch(() => "");

  if (isHtmlResponse(contentType, body)) {
    throw new Error("A API do app retornou HTML em vez de JSON. Verifique se a rota esta publicada no backend.");
  }

  const payload = parseJsonSafe(body);
  if (payload == null) {
    throw new Error("A API do app nao retornou JSON valido.");
  }

  if (!res.ok) {
    const apiMessage = extractApiMessage(payload);
    if (apiMessage) {
      throw new Error(apiMessage.details ? `${apiMessage.error} Detalhe: ${apiMessage.details}` : apiMessage.error);
    }

    throw new Error(`API ${res.status} ${res.statusText}`);
  }

  return payload as T;
}
