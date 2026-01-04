import React from "react";

type ColecaoColuna = {
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
};

type ColecaoCatalogo = {
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  colunas: ColecaoColuna[];
};

async function fetchCatalogo(): Promise<ColecaoCatalogo[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${baseUrl}/api/documentos/colecoes/catalogo`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as { data?: ColecaoCatalogo[] };
  return json.data ?? [];
}

function buildExample(c: ColecaoCatalogo): string {
  const cols = c.colunas.map((x) => `  <td>{{${x.codigo}}}</td>`).join("\n");
  return `{{#${c.codigo}}}\n<tr>\n${cols}\n</tr>\n{{/${c.codigo}}}`;
}

export default async function Page() {
  const catalogo = await fetchCatalogo();

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Colecoes de Documento</h1>
      <p style={{ marginTop: 8 }}>
        Aqui voce encontra as listas repetitivas (parcelas/lancamentos/itens) que podem ser inseridas nos modelos.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {catalogo.map((c) => (
          <div key={c.codigo} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.nome}</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>{c.descricao ?? ""}</div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>{c.codigo}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Colunas disponiveis</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {c.colunas.map((col) => (
                  <li key={col.codigo}>
                    <span style={{ fontFamily: "monospace" }}>{col.codigo}</span> — {col.label} ({col.tipo}
                    {col.formato ? ` / ${col.formato}` : ""})
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Exemplo para copiar</div>
              <pre
                style={{
                  background: "#0b1020",
                  color: "#e5e7eb",
                  padding: 12,
                  borderRadius: 10,
                  overflowX: "auto",
                  fontSize: 12,
                }}
              >
                {buildExample(c)}
              </pre>
            </div>
          </div>
        ))}

        {catalogo.length === 0 && (
          <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 16 }}>
            Nenhuma colecao encontrada. Verifique se a migration foi aplicada e se o endpoint esta respondendo.
          </div>
        )}
      </div>
    </div>
  );
}
