export type PlaceholderSource = "DB" | "CALC" | "MANUAL";

export type PlaceholderSchemaItem = {
  key: string;
  label?: string;
  source: PlaceholderSource;
  required?: boolean;
  db?: {
    path: string;
  };
  calc?: {
    type: "SNAPSHOT" | "FORMAT_MOEDA" | "STATIC";
    fromKey?: string;
    staticValue?: string;
  };
  defaultValue?: string;
};

export function isSchemaItem(x: unknown): x is PlaceholderSchemaItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.key === "string" && typeof o.source === "string";
}

export function safeParseSchema(raw: unknown): PlaceholderSchemaItem[] {
  if (!Array.isArray(raw)) return [];
  const items = raw.filter(isSchemaItem) as PlaceholderSchemaItem[];
  return items.map((item) => ({
    ...item,
    key: item.key.trim().toUpperCase(),
    source: item.source as PlaceholderSource,
  }));
}

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function formatCentavosBRL(centavos: number): string {
  const v = centavos / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
