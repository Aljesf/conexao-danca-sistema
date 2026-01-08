"use client";

import { useState } from "react";
import Link from "next/link";

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export default function MovimentoCreditosPage() {
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [permitirDeficit, setPermitirDeficit] = useState(false);
  const [tipo, setTipo] = useState<"CR_REGULAR" | "CR_LIVRE" | "CR_PROJETO">("CR_REGULAR");
  const [origem, setOrigem] = useState<"INSTITUCIONAL_AUTOMATICA" | "EXTERNA">("INSTITUCIONAL_AUTOMATICA");
  const [proposito, setProposito] = useState("");
  const [competenciaInicio, setCompetenciaInicio] = useState("");
  const [competenciaFim, setCompetenciaFim] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  async function conceder() {
    setMsg(null);
    const payload = {
      beneficiario_id: beneficiarioId.trim(),
      lote_id: loteId.trim() || undefined,
      permitir_deficit: permitirDeficit,
      tipo,
      origem,
      proposito: proposito.trim(),
      competencia_inicio: competenciaInicio.trim(),
      competencia_fim: competenciaFim.trim(),
      quantidade_total: quantidade,
    };

    const r = await apiPost<{ ok: boolean; codigo?: string; modo?: string }>(
      "/api/admin/movimento/creditos/conceder",
      payload
    );

    if (!r.ok) return setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
    setMsg(`Credito concedido com sucesso (modo: ${r.modo ?? "OK"}).`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Concessao de Creditos</h1>
          <p className="text-sm text-muted-foreground">
            Conceda creditos a beneficiario aprovado (com lote ou em deficit).
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento">
            Voltar ao painel
          </Link>
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/beneficiarios">
            Beneficiarios
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Beneficiario ID (uuid)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={beneficiarioId}
              onChange={(e) => setBeneficiarioId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Lote ID (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={permitirDeficit}
                onChange={(e) => setPermitirDeficit(e.target.checked)}
              />
              Permitir deficit
            </label>
          </div>

          <div>
            <label className="text-sm">Tipo</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
            >
              <option value="CR_REGULAR">CR_REGULAR</option>
              <option value="CR_LIVRE">CR_LIVRE</option>
              <option value="CR_PROJETO">CR_PROJETO</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Origem</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={origem}
              onChange={(e) => setOrigem(e.target.value as typeof origem)}
            >
              <option value="INSTITUCIONAL_AUTOMATICA">INSTITUCIONAL_AUTOMATICA</option>
              <option value="EXTERNA">EXTERNA</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Quantidade</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm">Proposito</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={proposito}
              onChange={(e) => setProposito(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Competencia inicio</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={competenciaInicio}
              onChange={(e) => setCompetenciaInicio(e.target.value)}
              placeholder="YYYY-MM"
            />
          </div>
          <div>
            <label className="text-sm">Competencia fim</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={competenciaFim}
              onChange={(e) => setCompetenciaFim(e.target.value)}
              placeholder="YYYY-MM"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-md border text-sm" onClick={conceder}>
            Conceder
          </button>
          {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
        </div>
      </section>
    </div>
  );
}
