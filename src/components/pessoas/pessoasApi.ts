export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const data = (await res.json()) as unknown;

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as Record<string, unknown>).error)
        : "Erro na requisicao";
    throw new Error(msg);
  }

  return data as T;
}
