"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conjunto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type GrupoPapel = "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL";

type Grupo = {
  id: number;
  conjunto_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
  papel: GrupoPapel | null;
};

type GrupoDraft = {
  codigo: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: string;
  papel: GrupoPapel;
};

function normCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "_");
}

function buildGrupoDraft(): GrupoDraft {
  return {
    codigo: "",
    nome: "",
    descricao: "",
    obrigatorio: false,
    ordem: "1",
    papel: "OPCIONAL",
  };
}

async function fetchConjuntos(): Promise<Conjunto[]> {
  const res = await fetch("/api/documentos/conjuntos", { cache: "no-store" });
  const json = (await res.json()) as { ok?: boolean; data?: Conjunto[]; message?: string };
  if (!res.ok || !json.ok) throw new Error(json.message ?? "Erro ao carregar conjuntos.");
  return json.data ?? [];
}

async function fetchGrupos(conjuntoId: number): Promise<Grupo[]> {
  const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`, { cache: "no-store" });
  const json = (await res.json()) as { ok?: boolean; data?: Grupo[]; message?: string };
  if (!res.ok || !json.ok) throw new Error(json.message ?? "Erro ao carregar grupos.");
  return json.data ?? [];
}

export default function DocumentosConjuntosUnificadoPage() {
  const helpItems = useMemo(
    () => [
      "Esta tela gerencia a estrutura: Conjuntos -> Grupos -> (vinculo com Modelos).",
      "Conjunto = bloco institucional (ex.: Matricula Regular, Bolsa Movimento).",
      "Grupo = secao interna (Documento principal, Termos obrigatorios, etc.).",
      "Para vincular modelos, use o botao 'Vincular modelos' em cada grupo.",
    ],
    []
  );

  const [loadingConjuntos, setLoadingConjuntos] = useState(false);
  const [erroConjuntos, setErroConjuntos] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [conjuntoSelecionadoId, setConjuntoSelecionadoId] = useState<number | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [erroGrupos, setErroGrupos] = useState<string | null>(null);

  const [cCodigo, setCCodigo] = useState("");
  const [cNome, setCNome] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cSaving, setCSaving] = useState(false);

  const [gDraft, setGDraft] = useState<GrupoDraft>(buildGrupoDraft());
  const [gSaving, setGSaving] = useState(false);

  const criarConjunto = async () => {
    setCSaving(true);
    setErroConjuntos(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/documentos/conjuntos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: normCodigo(cCodigo),
          nome: cNome,
          descricao: cDesc.trim() ? cDesc.trim() : null,
          ativo: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao criar conjunto.");
      setCCodigo("");
      setCNome("");
      setCDesc("");
      setOkMsg("Conjunto criado com sucesso.");
      const cs = await fetchConjuntos();
      setConjuntos(cs);
    } catch (e) {
      setErroConjuntos(e instanceof Error ? e.message : "Erro ao criar conjunto.");
    } finally {
      setCSaving(false);
    }
  };

  const criarGrupo = async () => {
    const conjuntoId = conjuntoSelecionadoId;
    if (!conjuntoId) {
      setErroConjuntos("Selecione um conjunto para criar grupo.");
      return;
    }

    setGSaving(true);
    setErroConjuntos(null);
    setOkMsg(null);

    try {
      const ordemNum = Number(gDraft.ordem);
      const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: normCodigo(gDraft.codigo),
          nome: gDraft.nome,
          descricao: gDraft.descricao.trim() ? gDraft.descricao.trim() : null,
          obrigatorio: gDraft.obrigatorio,
          ordem: Number.isFinite(ordemNum) ? ordemNum : 1,
          papel: gDraft.papel ?? (gDraft.obrigatorio ? "OBRIGATORIO" : "OPCIONAL"),
        }),
      });

      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao criar grupo.");

      setGDraft(buildGrupoDraft());
      setOkMsg("Grupo criado com sucesso.");

      const data = await fetchGrupos(conjuntoId);
      setGrupos(data);
    } catch (e) {
      setErroConjuntos(e instanceof Error ? e.message : "Erro ao criar grupo.");
    } finally {
      setGSaving(false);
    }
  };

  useEffect(() => {
    let ativo = true;

    async function carregarConjuntos() {
      setLoadingConjuntos(true);
      setErroConjuntos(null);

      try {
        const data = await fetchConjuntos();
        if (ativo) setConjuntos(data);
      } catch (e) {
        if (ativo) setErroConjuntos(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (ativo) setLoadingConjuntos(false);
      }
    }

    carregarConjuntos();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setGDraft(buildGrupoDraft());
  }, [conjuntoSelecionadoId]);

  useEffect(() => {
    if (!conjuntoSelecionadoId) {
      setGrupos([]);
      setErroGrupos(null);
      return;
    }

    let ativo = true;
    setGrupos([]);

    async function carregarGrupos() {
      setLoadingGrupos(true);
      setErroGrupos(null);

      try {
        const data = await fetchGrupos(conjuntoSelecionadoId);
        if (ativo) setGrupos(data);
      } catch (e) {
        if (ativo) setErroGrupos(e instanceof Error ? e.message : "Erro ao carregar grupos.");
      } finally {
        if (ativo) setLoadingGrupos(false);
      }
    }

    carregarGrupos();

    return () => {
      ativo = false;
    };
  }, [conjuntoSelecionadoId]);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Conjuntos e Grupos"
        subtitle="Gerencie a estrutura institucional: Conjuntos (blocos) e seus Grupos internos."
      >
        <div className="mt-2 flex gap-4">
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
            Voltar ao hub de Documentos
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard items={helpItems} />

      {erroConjuntos ? (
        <SystemSectionCard title="Erro" description="Corrija antes de continuar.">
          <div className="text-sm text-red-700">{erroConjuntos}</div>
        </SystemSectionCard>
      ) : null}

      {okMsg ? (
        <SystemSectionCard title="Sucesso" description="Operacao concluida.">
          <div className="text-sm text-green-700">{okMsg}</div>
        </SystemSectionCard>
      ) : null}

      <SystemSectionCard title="Criar conjunto" description="Crie um conjunto institucional (ex.: Matricula Regular).">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Codigo</label>
            <Input value={cCodigo} onChange={(e) => setCCodigo(e.target.value)} placeholder="Ex.: MATRICULA_REGULAR" />
            <p className="text-xs text-slate-500 mt-1">Caixa alta. Espacos viram underscore automaticamente.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={cNome} onChange={(e) => setCNome(e.target.value)} placeholder="Ex.: Matricula Regular" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <Input value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Opcional (uso interno)." />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={() => void criarConjunto()} disabled={cSaving || !cCodigo.trim() || !cNome.trim()}>
            {cSaving ? "Salvando..." : "Criar conjunto"}
          </Button>
        </div>
      </SystemSectionCard>

      <SystemSectionCard
        title="Conjuntos cadastrados"
        description="Cada card e um Conjunto. Dentro dele, voce cria e organiza os Grupos."
      >
        {loadingConjuntos ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : conjuntos.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum conjunto cadastrado.</div>
        ) : (
          <div className="grid gap-6">
            {conjuntos.map((c) => {
              const isSelected = conjuntoSelecionadoId === c.id;

              return (
                <div key={c.id} className="border border-slate-200 rounded-xl bg-white shadow-sm">
                  <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{c.nome}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Codigo: {c.codigo} | Ativo: {c.ativo ? "Sim" : "Nao"} | ID: {c.id}
                      </div>
                      {c.descricao ? <div className="text-sm text-slate-600 mt-2">{c.descricao}</div> : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Link className="underline" href={`/admin/config/documentos/conjuntos/${c.id}`}>
                        Abrir detalhe (opcional)
                      </Link>
                      <Button
                        variant={isSelected ? "secondary" : "ghost"}
                        onClick={() => setConjuntoSelecionadoId(isSelected ? null : c.id)}
                      >
                        {isSelected ? "Selecionado" : "Selecionar"}
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    {!isSelected ? (
                      <div className="text-sm text-slate-500">
                        Selecione este conjunto para carregar os grupos.
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold mb-2">Grupos</div>
                        {erroGrupos ? <div className="text-sm text-red-700 mb-2">{erroGrupos}</div> : null}

                        {loadingGrupos ? (
                          <div className="text-sm text-slate-600 mb-4">Carregando grupos...</div>
                        ) : grupos.length === 0 ? (
                          <div className="text-sm text-slate-600 mb-4">Nenhum grupo cadastrado.</div>
                        ) : (
                          <div className="grid gap-2 mb-4">
                            {grupos.map((g) => {
                              const papel = g.papel ?? (g.obrigatorio ? "OBRIGATORIO" : "OPCIONAL");
                              return (
                                <div key={g.id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-medium">
                                      {g.ordem}. {g.nome}
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                      Codigo: {g.codigo} | Papel: {papel} | Obrigatorio: {g.obrigatorio ? "Sim" : "Nao"} | ID: {g.id}
                                    </div>
                                    {g.descricao ? <div className="text-sm text-slate-600 mt-2">{g.descricao}</div> : null}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <Link className="text-sm underline text-slate-600" href={`/admin/config/documentos/grupos/${g.id}`}>
                                      Vincular modelos
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-4">
                          <div className="text-sm font-semibold mb-2">Adicionar grupo</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Codigo</label>
                              <Input
                                value={gDraft.codigo}
                                onChange={(e) => setGDraft((p) => ({ ...p, codigo: e.target.value }))}
                                placeholder="Ex.: DOCUMENTO_PRINCIPAL"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Nome</label>
                              <Input
                                value={gDraft.nome}
                                onChange={(e) => setGDraft((p) => ({ ...p, nome: e.target.value }))}
                                placeholder="Ex.: Documento principal"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-sm font-medium">Descricao</label>
                              <Input
                                value={gDraft.descricao}
                                onChange={(e) => setGDraft((p) => ({ ...p, descricao: e.target.value }))}
                                placeholder="Opcional (uso interno)."
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={gDraft.obrigatorio}
                                onChange={(e) =>
                                  setGDraft((p) => ({
                                    ...p,
                                    obrigatorio: e.target.checked,
                                    papel:
                                      p.papel === "OBRIGATORIO" || p.papel === "OPCIONAL"
                                        ? e.target.checked
                                          ? "OBRIGATORIO"
                                          : "OPCIONAL"
                                        : p.papel,
                                  }))
                                }
                              />
                              <span className="text-sm">Obrigatorio</span>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Ordem</label>
                              <Input
                                value={gDraft.ordem}
                                onChange={(e) => setGDraft((p) => ({ ...p, ordem: e.target.value }))}
                                placeholder="Ex.: 1"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">Papel do grupo</label>
                              <select
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                value={gDraft.papel}
                                onChange={(e) => setGDraft((p) => ({ ...p, papel: e.target.value as GrupoPapel }))}
                              >
                                <option value="PRINCIPAL">PRINCIPAL</option>
                                <option value="OBRIGATORIO">OBRIGATORIO</option>
                                <option value="OPCIONAL">OPCIONAL</option>
                                <option value="ADICIONAL">ADICIONAL</option>
                              </select>
                            </div>
                          </div>

                          <div className="pt-4 flex justify-end">
                            <Button onClick={() => void criarGrupo()} disabled={gSaving || !gDraft.codigo.trim() || !gDraft.nome.trim()}>
                              {gSaving ? "Salvando..." : "Adicionar grupo"}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
