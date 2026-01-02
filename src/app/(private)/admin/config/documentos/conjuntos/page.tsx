"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useEffect } from "react";
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

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [gruposByConjunto, setGruposByConjunto] = useState<Record<number, Grupo[]>>({});

  const [cCodigo, setCCodigo] = useState("");
  const [cNome, setCNome] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cSaving, setCSaving] = useState(false);

  const [gDraft, setGDraft] = useState<Record<number, GrupoDraft>>({});
  const [gSaving, setGSaving] = useState<Record<number, boolean>>({});

  const fetchConjuntos = useCallback(async (): Promise<Conjunto[]> => {
    const res = await fetch("/api/documentos/conjuntos");
    const json = (await res.json()) as { ok?: boolean; data?: Conjunto[]; message?: string };
    if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao carregar conjuntos.");
    return json.data ?? [];
  }, []);

  const fetchGrupos = useCallback(async (conjuntoId: number): Promise<Grupo[]> => {
    const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`);
    const json = (await res.json()) as { ok?: boolean; data?: Grupo[]; message?: string };
    if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao carregar grupos.");
    return json.data ?? [];
  }, []);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const cs = await fetchConjuntos();
      setConjuntos(cs);

      const map: Record<number, Grupo[]> = {};
      await Promise.all(
        cs.map(async (c) => {
          map[c.id] = await fetchGrupos(c.id);
        })
      );
      setGruposByConjunto(map);

      const draft: Record<number, GrupoDraft> = {};
      for (const c of cs) {
        draft[c.id] = gDraft[c.id] ?? buildGrupoDraft();
      }
      setGDraft(draft);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [fetchConjuntos, fetchGrupos, gDraft]);

  const criarConjunto = useCallback(async () => {
    setCSaving(true);
    setErro(null);
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
      await carregarTudo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar conjunto.");
    } finally {
      setCSaving(false);
    }
  }, [cCodigo, cDesc, cNome, carregarTudo]);

  const criarGrupo = useCallback(
    async (conjuntoId: number) => {
      setGSaving((p) => ({ ...p, [conjuntoId]: true }));
      setErro(null);
      setOkMsg(null);

      try {
        const d = gDraft[conjuntoId] ?? buildGrupoDraft();
        const ordemNum = Number(d.ordem);

        const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: normCodigo(d.codigo),
            nome: d.nome,
            descricao: d.descricao.trim() ? d.descricao.trim() : null,
            obrigatorio: d.obrigatorio,
            ordem: Number.isFinite(ordemNum) ? ordemNum : 1,
            papel: d.papel ?? (d.obrigatorio ? "OBRIGATORIO" : "OPCIONAL"),
          }),
        });

        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao criar grupo.");

        setGDraft((p) => ({
          ...p,
          [conjuntoId]: buildGrupoDraft(),
        }));

        setOkMsg("Grupo criado com sucesso.");
        await carregarTudo();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar grupo.");
      } finally {
        setGSaving((p) => ({ ...p, [conjuntoId]: false }));
      }
    },
    [carregarTudo, gDraft]
  );

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

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
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : conjuntos.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum conjunto cadastrado.</div>
        ) : (
          <div className="grid gap-6">
            {conjuntos.map((c) => {
              const grupos = gruposByConjunto[c.id] ?? [];
              const d = gDraft[c.id] ?? buildGrupoDraft();
              const savingThis = Boolean(gSaving[c.id]);

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
                    <div className="text-sm text-slate-600">
                      <Link className="underline" href={`/admin/config/documentos/conjuntos/${c.id}`}>
                        Abrir detalhe (opcional)
                      </Link>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="text-sm font-semibold mb-2">Grupos</div>

                    {grupos.length === 0 ? (
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
                            value={d.codigo}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: { ...d, codigo: e.target.value },
                              }))
                            }
                            placeholder="Ex.: DOCUMENTO_PRINCIPAL"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Nome</label>
                          <Input
                            value={d.nome}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: { ...d, nome: e.target.value },
                              }))
                            }
                            placeholder="Ex.: Documento principal"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Descricao</label>
                          <Input
                            value={d.descricao}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: { ...d, descricao: e.target.value },
                              }))
                            }
                            placeholder="Opcional (uso interno)."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={d.obrigatorio}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: {
                                  ...d,
                                  obrigatorio: e.target.checked,
                                  papel:
                                    d.papel === "OBRIGATORIO" || d.papel === "OPCIONAL"
                                      ? e.target.checked
                                        ? "OBRIGATORIO"
                                        : "OPCIONAL"
                                      : d.papel,
                                },
                              }))
                            }
                          />
                          <span className="text-sm">Obrigatorio</span>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Ordem</label>
                          <Input
                            value={d.ordem}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: { ...d, ordem: e.target.value },
                              }))
                            }
                            placeholder="Ex.: 1"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Papel do grupo</label>
                          <select
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            value={d.papel}
                            onChange={(e) =>
                              setGDraft((p) => ({
                                ...p,
                                [c.id]: { ...d, papel: e.target.value as GrupoPapel },
                              }))
                            }
                          >
                            <option value="PRINCIPAL">PRINCIPAL</option>
                            <option value="OBRIGATORIO">OBRIGATORIO</option>
                            <option value="OPCIONAL">OPCIONAL</option>
                            <option value="ADICIONAL">ADICIONAL</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button
                          onClick={() => void criarGrupo(c.id)}
                          disabled={savingThis || !d.codigo.trim() || !d.nome.trim()}
                        >
                          {savingThis ? "Salvando..." : "Adicionar grupo"}
                        </Button>
                      </div>
                    </div>
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
