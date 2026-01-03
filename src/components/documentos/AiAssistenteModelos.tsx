"use client";

import React from "react";
import type { AiAnalyzeResp } from "@/lib/documentos/ai.types";

type Props = {
  onApplyTemplateHtml: (html: string) => void;
};

export function AiAssistenteModelos({ onApplyTemplateHtml }: Props) {
  const [texto, setTexto] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [data, setData] = React.useState<AiAnalyzeResp | null>(null);
  const [selecionadas, setSelecionadas] = React.useState<Record<string, boolean>>({});

  async function analisar() {
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch("/api/documentos/ai/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: AiAnalyzeResp; message?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Falha ao analisar.");
      }
      setData(json.data);
      const next: Record<string, boolean> = {};
      json.data.variaveis.forEach((v) => {
        if (v.codigo) next[v.codigo] = true;
      });
      setSelecionadas(next);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelecionada(codigo: string) {
    setSelecionadas((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  }

  async function aplicar() {
    if (!data) return;
    setErro(null);
    setLoading(true);
    try {
      const variaveis = data.variaveis.filter((v) => selecionadas[v.codigo] !== false);
      const sugestao = { ...data, variaveis };
      const res = await fetch("/api/documentos/ai/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sugestao,
          criar_variaveis: true,
          criar_modelo: false,
          source_text: texto,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao aplicar.");
      onApplyTemplateHtml(data.template_html);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Assistente IA</h2>
      <p className="mt-1 text-sm text-slate-600">
        Cole um contrato antigo ou briefing. A IA sugere variaveis e monta o template.
      </p>

      {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}

      <textarea
        className="mt-3 min-h-[140px] w-full rounded-md border p-3 text-sm"
        placeholder="Cole aqui o texto do contrato antigo..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={analisar}
          disabled={loading || !texto.trim()}
        >
          {loading ? "Analisando..." : "Analisar com IA"}
        </button>

        <button
          className="rounded-md border bg-white px-4 py-2 text-sm disabled:opacity-60"
          onClick={aplicar}
          disabled={loading || !data}
        >
          {loading ? "Aplicando..." : "Criar variaveis faltantes e aplicar no editor"}
        </button>
      </div>

      {data ? (
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <p className="text-sm font-semibold">Variaveis sugeridas</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {data.variaveis.map((v) => (
              <li key={v.codigo} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selecionadas[v.codigo] !== false}
                  onChange={() => toggleSelecionada(v.codigo)}
                />
                <span>
                  <strong>{v.codigo}</strong> — {v.descricao} ({v.tipo}
                  {v.formato ? `/${v.formato}` : ""})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
