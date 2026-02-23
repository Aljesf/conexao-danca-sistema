import { ENV } from "../config/env";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${ENV.API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}
