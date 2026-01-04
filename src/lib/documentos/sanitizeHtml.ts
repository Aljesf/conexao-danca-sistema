function stripBackgroundDeclarations(styleValue: string): string {
  const cleaned = styleValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.split(":")[0]?.trim().toLowerCase();
      return key !== "background" && key !== "background-image";
    })
    .join("; ");

  return cleaned;
}

export function stripBackgroundStyles(html: string): string {
  if (!html) return html;

  let out = html.replace(/\sbackground\s*=\s*(".*?"|'.*?')/gi, "");

  out = out.replace(/\sstyle=(["'])(.*?)\1/gi, (_match, quote: string, styleValue: string) => {
    const cleaned = stripBackgroundDeclarations(styleValue);
    if (!cleaned) return "";
    return ` style=${quote}${cleaned}${quote}`;
  });

  return out;
}
