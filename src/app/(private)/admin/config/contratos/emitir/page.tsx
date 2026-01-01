"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Emitir Contrato</h1>
        <p className="text-sm opacity-80">
          Busque a matricula pelo nome do aluno ou do responsavel, selecione o modelo e emita.
        </p>
        <div className="mt-2">
          <Link className="text-sm underline opacity-80" href="/admin/config/contratos">
            Voltar ao hub de Contratos
          </Link>
        </div>
      </div>

      {erro ? (
        <Card className="border-red-300">
          <CardContent className="text-sm text-red-700">{erro}</CardContent>
        </Card>
      ) : null}

      {okMsg ? (
        <Card className="border-green-300 mt-3">
          <CardContent className="text-sm text-green-700">{okMsg}</CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>1) Buscar matricula</CardTitle>
          <CardDescription>Digite nome, CPF, telefone ou email do aluno ou responsavel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite nome, CPF, telefone ou e-mail (aluno ou responsavel)..."
              className="min-w-[280px] flex-1"
            />
            <Button onClick={() => void buscar()} disabled={buscaLoading || q.trim().length < 2}>
              {buscaLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="mt-3">
            {matriculas.length === 0 ? (
              <div className="text-sm opacity-75">Nenhum resultado ainda.</div>
            ) : (
              <div className="grid gap-3">
                {matriculas.map((m) => (
                  <label key={m.matricula_id} className="flex gap-3 items-start rounded-lg border p-3">
                    <input
                      type="radio"
                      name="matricula"
                      checked={matriculaSel?.matricula_id === m.matricula_id}
                      onChange={() => setMatriculaSel(m)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">{m.label}</div>
                      <div className="text-xs opacity-75 mt-1">
                        Tipo: {m.tipo_matricula ?? "-"} | Ano: {m.ano_referencia ?? "-"} | Status: {m.status ?? "-"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>2) Selecionar modelo</CardTitle>
          <CardDescription>Use apenas modelos ativos.</CardDescription>
        </CardHeader>
        <CardContent>
          {modelosLoading ? (
            <p className="text-sm opacity-80">Carregando modelos...</p>
          ) : modelosAtivos.length === 0 ? (
            <p className="text-sm opacity-80">Nenhum modelo ativo encontrado.</p>
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
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>3) Snapshot contratual (MVP)</CardTitle>
          <CardDescription>
            Informe o valor total contratado em centavos. Depois iremos ligar ao motor de precificacao.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="text-sm font-medium">Valor total contratado (centavos)</label>
          <div className="mt-1 max-w-xs">
            <Input
              value={valorTotalCentavos}
              onChange={(e) => setValorTotalCentavos(e.target.value)}
              placeholder="Ex.: 120000"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>4) Variaveis manuais (JSON)</CardTitle>
          <CardDescription>
            Coloque campos como OBS_ADICIONAIS, clausulas especificas, observacoes negociadas, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={variaveisManuaisJson}
            onChange={(e) => setVariaveisManuaisJson(e.target.value)}
            rows={10}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => void emitir()} disabled={!matriculaSel || !modeloId}>
            Emitir contrato
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
