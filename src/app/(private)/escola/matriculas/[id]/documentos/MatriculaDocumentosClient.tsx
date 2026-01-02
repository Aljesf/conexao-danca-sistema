"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";

type Conjunto = { id: number; codigo: string; nome: string; ativo: boolean };
type GrupoPapel = "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL";
type Grupo = {
  id: number;
  conjunto_id: number;
  nome: string;
  codigo: string;
  obrigatorio: boolean;
  ordem: number;
  papel: GrupoPapel | null;
};
type Modelo = {
  id: number;
  titulo: string;
  versao: string;
  ativo: boolean;
  tipo_documento?: string | null;
};

type MatriculaConjuntoResponse = {
  ok?: boolean;
  data?: { documento_conjunto_id: number | null };
  message?: string;
};

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

export default function MatriculaDocumentosClient(props: { id: string }) {
  const matriculaId = Number(props.id);

  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [conjuntoId, setConjuntoId] = useState<number | null>(null);

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modelosPorGrupo, setModelosPorGrupo] = useState<Record<number, number[]>>({});

  const [incluirGrupo, setIncluirGrupo] = useState<Record<number, boolean>>({});
  const [modeloEscolhido, setModeloEscolhido] = useState<Record<number, number>>({});
  const [salvando, setSalvando] = useState(false);

  const helpItems = useMemo(
    () => [
      "Fluxo manual: Conjunto -> Grupos -> Modelo por Grupo -> Emissao.",
      "Grupos OBRIGATORIO ficam sempre incluidos.",
      "E obrigatorio selecionar exatamente 1 grupo com papel PRINCIPAL por emissao.",
      "Ano (2024/2026) nao e grupo: e escolha de MODELO dentro do grupo PRINCIPAL.",
    ],
    []
  );

  const carregarBase = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resC = await fetch("/api/documentos/conjuntos");
      const jsonC = (await resC.json()) as ApiResponse<Conjunto[]>;
      if (!resC.ok || !jsonC.ok) throw new Error(jsonC.message ?? "Falha ao carregar conjuntos.");
      setConjuntos((jsonC.data ?? []).filter((c) => c.ativo));

      const resM = await fetch(`/api/documentos/matriculas/${matriculaId}/conjunto`);
      const jsonM = (await resM.json()) as MatriculaConjuntoResponse;
      if (!resM.ok || !jsonM.ok) throw new Error(jsonM.message ?? "Falha ao carregar matricula.");
      setConjuntoId(jsonM.data?.documento_conjunto_id ?? null);

      const resMod = await fetch("/api/documentos/modelos");
      const jsonMod = (await resMod.json()) as ApiResponse<Modelo[]>;
      if (!resMod.ok || !jsonMod.ok) throw new Error(jsonMod.message ?? "Falha ao carregar modelos.");
      setModelos(jsonMod.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [matriculaId]);

  const carregarGruposEModelos = useCallback(async (conjId: number) => {
    setErro(null);
    setOkMsg(null);

    const resG = await fetch(`/api/documentos/conjuntos/${conjId}/grupos`);
    const jsonG = (await resG.json()) as ApiResponse<Grupo[]>;
    if (!resG.ok || !jsonG.ok) throw new Error(jsonG.message ?? "Falha ao carregar grupos.");

    const gs = (jsonG.data ?? []).slice().sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    setGrupos(gs);

    const map: Record<number, number[]> = {};
    await Promise.all(
      gs.map(async (g) => {
        const res = await fetch(`/api/documentos/grupos/${g.id}/modelos`);
        const json = (await res.json()) as ApiResponse<number[]>;
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao carregar modelos do grupo.");
        map[g.id] = json.data ?? [];
      })
    );
    setModelosPorGrupo(map);

    const inc: Record<number, boolean> = {};
    const sel: Record<number, number> = {};
    for (const g of gs) {
      const papel = (g.papel ?? "").toUpperCase();
      const isObrig = papel === "OBRIGATORIO" || g.obrigatorio === true;
      inc[g.id] = isObrig ? true : false;

      const opts = map[g.id] ?? [];
      if (opts.length === 1) sel[g.id] = opts[0];
    }
    setIncluirGrupo(inc);
    setModeloEscolhido(sel);
  }, []);

  const salvarConjuntoNaMatricula = useCallback(async () => {
    if (!conjuntoId) return;
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/documentos/matriculas/${matriculaId}/conjunto`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_conjunto_id: conjuntoId }),
      });
      const json = (await res.json()) as ApiResponse<{ documento_conjunto_id: number | null }>;
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao salvar conjunto.");
      setOkMsg("Conjunto salvo na matricula.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar conjunto.");
    }
  }, [conjuntoId, matriculaId]);

  async function emitir() {
    if (!conjuntoId) {
      setErro("Selecione um conjunto.");
      return;
    }

    const principaisIncluidos = grupos.filter(
      (g) => (g.papel ?? "").toUpperCase() === "PRINCIPAL" && (incluirGrupo[g.id] ?? false)
    );
    if (principaisIncluidos.length === 0) {
      setErro("Selecione 1 grupo PRINCIPAL para emissao.");
      return;
    }
    if (principaisIncluidos.length > 1) {
      setErro("Selecione apenas 1 grupo PRINCIPAL para emissao.");
      return;
    }

    const itens = grupos.map((g) => ({
      grupo_id: g.id,
      incluir: incluirGrupo[g.id] ?? false,
      documento_modelo_id: Number(modeloEscolhido[g.id] ?? 0),
    }));

    const faltandoModelo = itens.filter(
      (i) => i.incluir && (!Number.isFinite(i.documento_modelo_id) || i.documento_modelo_id <= 0)
    );
    if (faltandoModelo.length > 0) {
      setErro("Selecione um modelo para todos os grupos incluidos.");
      return;
    }

    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/documentos/matriculas/${matriculaId}/emitir-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_conjunto_id: conjuntoId, itens }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; data?: { emitidos?: unknown[] } };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao emitir documentos.");
      setOkMsg(`Documentos emitidos: ${(json.data?.emitidos ?? []).length}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao emitir.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(matriculaId)) {
      setErro("ID invalido.");
      setLoading(false);
      return;
    }
    void carregarBase();
  }, [carregarBase, matriculaId]);

  useEffect(() => {
    if (!conjuntoId || !Number.isFinite(conjuntoId)) {
      setGrupos([]);
      setModelosPorGrupo({});
      return;
    }
    void carregarGruposEModelos(conjuntoId);
  }, [carregarGruposEModelos, conjuntoId]);

  return (
    <SystemPage>
      <SystemContextCard title="Matricula - Documentos" subtitle="Selecao manual: Conjunto -> Grupos -> Modelo por Grupo -> Emissao.">
        <div className="mt-2 flex gap-4">
          <Link className="text-sm underline text-slate-600" href={`/escola/matriculas/${matriculaId}`}>
            Voltar a matricula
          </Link>
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos/conjuntos">
            Conjuntos (Admin)
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard items={helpItems} />

      {erro ? (
        <SystemSectionCard title="Erro" description="Corrija antes de continuar.">
          <div className="text-sm text-red-700">{erro}</div>
        </SystemSectionCard>
      ) : null}

      {okMsg ? (
        <SystemSectionCard title="Sucesso" description="Operacao concluida.">
          <div className="text-sm text-green-700">{okMsg}</div>
        </SystemSectionCard>
      ) : null}

      <SystemSectionCard title="1) Selecionar conjunto" description="Escolha manualmente qual conjunto se aplica a esta matricula.">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={conjuntoId ?? ""}
              onChange={(e) => setConjuntoId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione...</option>
              {conjuntos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} (ID: {c.id})
                </option>
              ))}
            </select>

            <div className="flex justify-end">
              <Button onClick={() => void salvarConjuntoNaMatricula()} disabled={!conjuntoId}>
                Salvar conjunto na matricula
              </Button>
            </div>
          </div>
        )}
      </SystemSectionCard>

      <SystemSectionCard title="2) Selecionar grupos e modelos" description="Marque os grupos e selecione um modelo por grupo.">
        {conjuntoId ? (
          grupos.length === 0 ? (
            <div className="text-sm text-slate-600">Este conjunto nao possui grupos cadastrados.</div>
          ) : (
            <div className="grid gap-3">
              {grupos.map((g) => {
                const opts = modelosPorGrupo[g.id] ?? [];
                const papel = (g.papel ?? "").toUpperCase();
                const isObrig = papel === "OBRIGATORIO" || g.obrigatorio === true;
                const checked = incluirGrupo[g.id] ?? isObrig;

                return (
                  <div key={g.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">
                          {g.ordem}. {g.nome} <span className="text-xs text-slate-600">({papel || "OPCIONAL"})</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Codigo: {g.codigo} | Obrigatorio: {isObrig ? "Sim" : "Nao"}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isObrig}
                          onChange={(e) =>
                            setIncluirGrupo((p) => ({
                              ...p,
                              [g.id]: e.target.checked,
                            }))
                          }
                        />
                        Incluir
                      </label>
                    </div>

                    <div className="mt-3">
                      <label className="text-sm font-medium">Modelo do grupo</label>
                      <select
                        className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                        value={modeloEscolhido[g.id] ?? ""}
                        onChange={(e) =>
                          setModeloEscolhido((p) => ({
                            ...p,
                            [g.id]: Number(e.target.value),
                          }))
                        }
                        disabled={!checked}
                      >
                        <option value="">Selecione...</option>
                        {opts.map((mid) => {
                          const m = modelos.find((x) => x.id === mid);
                          const label = m ? `${m.titulo} (${m.versao})` : `Modelo #${mid}`;
                          return (
                            <option key={mid} value={mid}>
                              {label}
                            </option>
                          );
                        })}
                      </select>

                      <div className="mt-2 text-xs text-slate-600">
                        Se a lista estiver vazia, vincule modelos no Admin: Conjuntos, Grupos, depois Vincular modelos.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-sm text-slate-600">Selecione um conjunto para carregar os grupos.</div>
        )}

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={() => void emitir()} disabled={salvando || !conjuntoId}>
            {salvando ? "Emitindo..." : "Emitir documentos"}
          </Button>
        </div>
      </SystemSectionCard>
    </SystemPage>
  );
}
