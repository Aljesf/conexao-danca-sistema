"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Modelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
};

type MatriculaBuscaItem = {
  matricula_id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
  label: string;
  aluno_nome: string | null;
  responsavel_nome: string | null;
  tipo_matricula: string | null;
  ano_referencia: number | null;
  status: string | null;
};

export default function AdminContratosEmitirPage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modelosLoading, setModelosLoading] = useState(true);

  const [q, setQ] = useState("");
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [matriculas, setMatriculas] = useState<MatriculaBuscaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [matriculaSel, setMatriculaSel] = useState<MatriculaBuscaItem | null>(null);
  const [modeloId, setModeloId] = useState<number | null>(null);

  const [valorTotalCentavos, setValorTotalCentavos] = useState<string>("");
  const [variaveisManuaisJson, setVariaveisManuaisJson] = useState<string>(
    JSON.stringify({ OBS_ADICIONAIS: "" }, null, 2)
  );

  const modelosAtivos = useMemo(() => modelos.filter((m) => m.ativo), [modelos]);

  async function carregarModelos() {
    setModelosLoading(true);
    try {
      const res = await fetch("/api/contratos/modelos");
      const json = (await res.json()) as { data?: Modelo[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setModelos(json.data ?? []);
    } finally {
      setModelosLoading(false);
    }
  }

  async function buscar() {
    setBuscaLoading(true);
    setErro(null);
    setOkMsg(null);
    setMatriculaSel(null);
    try {
      const res = await fetch(`/api/contratos/buscar-matriculas?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { data?: MatriculaBuscaItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao buscar matriculas.");
      setMatriculas(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar.");
    } finally {
      setBuscaLoading(false);
    }
  }

  async function emitir() {
    setErro(null);
    setOkMsg(null);

    if (!matriculaSel) {
      setErro("Selecione uma matricula.");
      return;
    }
    if (!modeloId) {
      setErro("Selecione um modelo.");
      return;
    }

    let variaveis_manuais: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(variaveisManuaisJson) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error();
      variaveis_manuais = parsed as Record<string, unknown>;
    } catch {
      setErro("JSON de variaveis manuais invalido.");
      return;
    }

    const snapshot_financeiro: Record<string, unknown> = {};
    const v = valorTotalCentavos.trim();
    if (v.length > 0) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        setErro("Valor total contratado (centavos) invalido.");
        return;
      }
      snapshot_financeiro.valor_total_contratado_centavos = n;
    }

    const res = await fetch("/api/contratos/emitir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricula_id: matriculaSel.matricula_id,
        contrato_modelo_id: modeloId,
        snapshot_financeiro,
        variaveis_manuais,
      }),
    });

    const json = (await res.json()) as { data?: { id?: number }; error?: string; missing?: string[] };
    if (!res.ok) {
      const missing = Array.isArray((json as Record<string, unknown>).missing)
        ? (json as { missing: string[] }).missing
        : null;
      setErro(missing ? `Placeholders obrigatorios ausentes: ${missing.join(", ")}` : json.error ?? "Falha ao emitir.");
      return;
    }

    setOkMsg(`Contrato emitido com sucesso. ID: ${json.data?.id ?? "?"}`);
  }

  useEffect(() => {
    void carregarModelos();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Emitir contrato"
        subtitle="Busque a matricula pelo nome do aluno ou do responsavel, selecione o modelo e emita."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/contratos">
          Voltar ao hub de Contratos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Busque a matricula e selecione o modelo ativo.",
          "Preencha snapshot e variaveis manuais antes de emitir.",
          "A emissao gera um contrato com status PENDENTE.",
        ]}
      />

      <SystemSectionCard
        title="Selecionar matricula"
        description="Digite nome, CPF, telefone ou email do aluno ou responsavel."
        footer={
          <Button onClick={() => void buscar()} disabled={buscaLoading || q.trim().length < 2}>
            {buscaLoading ? "Buscando..." : "Buscar"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite nome, CPF, telefone ou e-mail (aluno ou responsavel)..."
          className="min-w-[280px]"
        />

        <div>
          {matriculas.length === 0 ? (
            <div className="text-sm text-slate-600">Nenhum resultado ainda.</div>
          ) : (
            <div className="grid gap-3">
              {matriculas.map((m) => (
                <label key={m.matricula_id} className="flex items-start gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="matricula"
                    checked={matriculaSel?.matricula_id === m.matricula_id}
                    onChange={() => setMatriculaSel(m)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Tipo: {m.tipo_matricula ?? "-"} | Ano: {m.ano_referencia ?? "-"} | Status: {m.status ?? "-"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Selecionar modelo de contrato" description="Use apenas modelos ativos.">
        {modelosLoading ? (
          <p className="text-sm text-slate-600">Carregando modelos...</p>
        ) : modelosAtivos.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum modelo ativo encontrado.</p>
        ) : (
          <select
            value={modeloId ?? ""}
            onChange={(e) => setModeloId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {modelosAtivos.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.tipo_contrato}] {m.titulo} (ID: {m.id})
              </option>
            ))}
          </select>
        )}
      </SystemSectionCard>

      <SystemSectionCard
        title="Snapshot contratual"
        description="Informe o valor total contratado em centavos. Depois iremos ligar ao motor de precificacao."
      >
        <label className="text-sm font-medium">Valor total contratado (centavos)</label>
        <div className="mt-1 max-w-xs">
          <Input
            value={valorTotalCentavos}
            onChange={(e) => setValorTotalCentavos(e.target.value)}
            placeholder="Ex.: 120000"
          />
        </div>
      </SystemSectionCard>

      <SystemSectionCard
        title="Variaveis manuais"
        description="Coloque campos como OBS_ADICIONAIS, clausulas especificas e observacoes negociadas."
        footer={
          <Button onClick={() => void emitir()} disabled={!matriculaSel || !modeloId}>
            Emitir contrato
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {okMsg}
          </div>
        ) : null}
        <Textarea value={variaveisManuaisJson} onChange={(e) => setVariaveisManuaisJson(e.target.value)} rows={10} />
      </SystemSectionCard>
    </SystemPage>
  );
}
