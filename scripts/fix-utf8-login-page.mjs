import fs from "node:fs";

const filePath = "src/app/login/page.tsx";

const buf = fs.readFileSync(filePath);

// Detecta BOM
const isUtf16LE = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
const isUtf16BE = buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff;
const isUtf8Bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;

let text;

if (isUtf16LE) {
  text = buf.subarray(2).toString("utf16le");
} else if (isUtf16BE) {
  const body = buf.subarray(2);
  const swapped = Buffer.allocUnsafe(body.length);
  for (let i = 0; i < body.length; i += 2) {
    swapped[i] = body[i + 1];
    swapped[i + 1] = body[i];
  }
  text = swapped.toString("utf16le");
} else if (isUtf8Bom) {
  text = buf.subarray(3).toString("utf8");
} else {
  // fallback: tenta ler como utf8
  text = buf.toString("utf8");
}

// Regrava em UTF-8 (sem BOM)
fs.writeFileSync(filePath, text, { encoding: "utf8" });

console.log(`[OK] Convertido para UTF-8: ${filePath}`);
console.log(
  `BOM detectado: ${
    isUtf16LE ? "UTF-16LE" : isUtf16BE ? "UTF-16BE" : isUtf8Bom ? "UTF-8 BOM" : "Nenhum"
  }`
);
