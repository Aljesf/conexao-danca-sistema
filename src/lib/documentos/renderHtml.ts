export function decodeHtmlEntities(input: string): string {
  // Decode minimo para casos em que o HTML foi armazenado escapado.
  // Evita double-decoding agressivo.
  return input
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}
