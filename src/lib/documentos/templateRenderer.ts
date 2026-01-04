import Mustache from "mustache";

export type SimpleContext = Record<string, string>;
export type CollectionRow = Record<string, string>;
export type CollectionsContext = Record<string, CollectionRow[]>;
export type RenderContext = SimpleContext & CollectionsContext;

// Detecta colecoes no template com {{#CODIGO}} ... {{/CODIGO}}
export function extractCollectionCodes(templateHtml: string): string[] {
  const regex = /\{\{#([A-Z0-9_]+)\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(templateHtml)) !== null) {
    const code = match[1];
    if (code) found.add(code);
  }
  return Array.from(found);
}

export function renderTemplateHtml(templateHtml: string, context: RenderContext): string {
  const originalEscape = Mustache.escape;
  Mustache.escape = (value) => String(value ?? "");
  try {
    return Mustache.render(templateHtml, context);
  } finally {
    Mustache.escape = originalEscape;
  }
}
