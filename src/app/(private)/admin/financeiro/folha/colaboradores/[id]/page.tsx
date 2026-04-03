"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FolhaNav = {
  id: number;
  competencia: string;
};

type Folha = {
  id: number;
  competencia: string;
  status: string;
  data_pagamento_prevista: string | null;
};

type ColaboradorResumo = {
  colaborador_id: number;
  nome: string;
  proventos_centavos: number;
  descontos_centavos: number;
  liquido_centavos: number;
};

type StatusOrigem = "VALIDA" | "CANCELADA" | "ORFA" | "MISTA";

type ItemOrigemDetalhe = {
  lancamento_id: number;
  competencia: string | null;
  descricao: string | null;
  origem_amigavel: string;
  origem_tecnica: string;
  referencia_item: string | null;
  status_origem: StatusOrigem;
  valor_centavos: number;
  motivos: string[];
};

type ItemOrigemResumo = {
  fatura_id: number;
  competencia: string | null;
  status_fatura: string | null;
  status_origem: StatusOrigem;
  pode_importar_folha: boolean;
  possui_inconsistencia: boolean;
  total_fatura_centavos: number;
  total_validos_centavos: number;
  total_invalidos_centavos: number;
  origem_amigavel: string;
  origem_tecnica: string;
  motivos: string[];
  itens_origem: ItemOrigemDetalhe[];
};

type Item = {
  id: number;
  folha_id: number;
  colaborador_id: number;
  colaborador_nome: string;
  tipo_item: string;
  descricao: string;
  valor_centavos: number;
  referencia_tipo: string | null;
  referencia_id: number | null;
  criado_automatico: boolean;
  created_at: string;
  origem_resumo?: ItemOrigemResumo | null;
};

function brlFromCentavos(v: number): string {
  const n = v / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseReaisToCentavos(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function formatCompetencia(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value ?? "-";
  const [ano, mes] = value.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function origemBadgeClass(status: StatusOrigem | null | undefined) {
  if (status === "VALIDA") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELADA") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "ORFA") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function itemRowClass(item: Item) {
  if (item.origem_resumo?.status_origem === "ORFA") return "border-t bg-rose-50/70";
  if (item.origem_resumo?.status_origem === "CANCELADA" || item.origem_resumo?.possui_inconsistencia) {
    return "border-t bg-amber-50/70";
  }
  return "border-t";
}

export default function FolhaDetalhePage() {
  const params = useParams<{ id: string }>();
  const folhaId = Number(params?.id);

  const [folha, setFolha] = useState<Folha | null>(null);
  const [prevFolha, setPrevFolha] = useState<FolhaNav | null>(null);
  const [nextFolha, setNextFolha] = useState<FolhaNav | null>(null);
  const [colaboradores, setColaboradores] = useState<ColaboradorResumo[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [addingSalarioBase, setAddingSalarioBase] = useState(false);

  const [tipoItem, setTipoItem] = useState<"PROVENTO" | "DESCONTO" | "ADIANTAMENTO_SALARIAL">("PROVENTO");
  const [descricao, setDescricao] = useState("");
  const [valorReais, setValorReais] = useState("");

  const selectedColaborador = useMemo(
    () => colaboradores.find((c) => c.colaborador_id === selectedColaboradorId) ?? null,
    [colaboradores, selectedColaboradorId],
  );

  const itensFiltrados = useMemo(() => {
    if (!selectedColaboradorId) return [];
    return itens.filter((i) => i.colaborador_id === selectedColaboradorId);
  }, [itens, selectedColaboradorId]);

  async function loadDetalhes() {
    if (!Number.isFinite(folhaId) || folhaId <= 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/${folhaId}/detalhes`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | {
            folha?: Folha;
            prev_folha?: FolhaNav | null;
            next_folha?: FolhaNav | null;
            colaboradores?: ColaboradorResumo[];
            itens?: Item[];
            error?: string;
          }
        | null;

      if (!res.ok) {
        setMessage(json?.error ?? "falha_carregar_detalhes");
        setFolha(null);
        setPrevFolha(null);
        setNextFolha(null);
        setColaboradores([]);
        setItens([]);
        return;
      }

      const nextFolhaData = json?.folha ?? null;
      const nextColabs = Array.isArray(json?.colaboradores) ? json.colaboradores : [];
      const nextItensData = Array.isArray(json?.itens) ? json.itens : [];

      setFolha(nextFolhaData);
      setPrevFolha(json?.prev_folha ?? null);
      setNextFolha(json?.next_folha ?? null);
      setColaboradores(nextColabs);
      setItens(nextItensData);

      if (nextColabs.length === 0) {
        setSelectedColaboradorId(null);
      } else if (!selectedColaboradorId || !nextColabs.some((c) => c.colaborador_id === selectedColaboradorId)) {
        setSelectedColaboradorId(nextColabs[0].colaborador_id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function importarFaturas() {
    if (!Number.isFinite(folhaId) || folhaId <= 0) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/${folhaId}/importar-cartao-conexao`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | {
            imported?: number;
            skipped?: Array<{ fatura_id: number; motivos: string[] }>;
            message?: string;
            error?: string;
          }
        | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_importar_faturas");
        return;
      }
      const skipped = Array.isArray(json?.skipped) ? json.skipped.length : 0;
      setMessage(
        json?.message
          ? `${json.message}${skipped > 0 ? ` | faturas ignoradas: ${skipped}` : ""}`
          : `Importacao concluida: ${json?.imported ?? 0} itens.${skipped > 0 ? ` Ignoradas: ${skipped}.` : ""}`,
      );
      await loadDetalhes();
    } finally {
      setImporting(false);
    }
  }

  async function fecharFolha() {
    if (!Number.isFinite(folhaId) || folhaId <= 0) return;
    setFechando(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/${folhaId}/fechar`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_fechar_folha");
        return;
      }
      setMessage("Folha fechada com sucesso.");
      await loadDetalhes();
    } finally {
      setFechando(false);
    }
  }

  async function adicionarRubricaManual() {
    if (!selectedColaboradorId) {
      setMessage("Selecione um colaborador.");
      return;
    }

    const valorCentavos = parseReaisToCentavos(valorReais);
    if (!valorCentavos) {
      setMessage("Informe valor valido (R$).");
      return;
    }
    if (!descricao.trim()) {
      setMessage("Descricao obrigatoria.");
      return;
    }

    setAddingManual(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/financeiro/folha/${folhaId}/itens/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: selectedColaboradorId,
          tipo_item: tipoItem,
          descricao: descricao.trim(),
          valor_centavos: valorCentavos,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_adicionar_rubrica");
        return;
      }
      setDescricao("");
      setValorReais("");
      setMessage("Rubrica manual adicionada.");
      await loadDetalhes();
    } finally {
      setAddingManual(false);
    }
  }

  async function adicionarSalarioBaseCadastro() {
    if (!selectedColaboradorId) {
      setMessage("Selecione um colaborador.");
      return;
    }

    setAddingSalarioBase(true);
    setMessage(null);
    try {
      const resumoRes = await fetch(`/api/admin/colaboradores/${selectedColaboradorId}/resumo-financeiro`, {
        cache: "no-store",
      });
      const resumoJson = (await resumoRes.json().catch(() => null)) as
        | {
            config_financeira?: {
              tipo_remuneracao?: "MENSAL" | "HORISTA";
              salario_base_centavos?: number;
              valor_hora_centavos?: number;
            } | null;
            error?: string;
          }
        | null;

      if (!resumoRes.ok) {
        setMessage(resumoJson?.error ?? "falha_buscar_config_colaborador");
        return;
      }

      const tipoRem = resumoJson?.config_financeira?.tipo_remuneracao ?? "MENSAL";
      const valor =
        tipoRem === "HORISTA"
          ? Number(resumoJson?.config_financeira?.valor_hora_centavos ?? 0)
          : Number(resumoJson?.config_financeira?.salario_base_centavos ?? 0);

      if (!Number.isFinite(valor) || valor <= 0) {
        setMessage(
          tipoRem === "HORISTA"
            ? "Colaborador sem valor hora configurado."
            : "Colaborador sem salario base configurado.",
        );
        return;
      }

      const alreadyExists = itensFiltrados.some(
        (i) => i.tipo_item === "PROVENTO" && i.descricao.toLowerCase().includes("salario base do cadastro"),
      );
      if (alreadyExists) {
        setMessage("Ja existe rubrica de salario base do cadastro para este colaborador.");
        return;
      }

      const res = await fetch(`/api/financeiro/folha/${folhaId}/itens/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: selectedColaboradorId,
          tipo_item: "PROVENTO",
          descricao: tipoRem === "HORISTA" ? "Valor hora do cadastro" : "Salario base do cadastro",
          valor_centavos: valor,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_adicionar_salario_base");
        return;
      }

      setMessage("Rubrica de cadastro adicionada.");
      await loadDetalhes();
    } finally {
      setAddingSalarioBase(false);
    }
  }

  useEffect(() => {
    void loadDetalhes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folhaId]);

  if (!Number.isFinite(folhaId) || folhaId <= 0) {
    return <div className="p-6 text-sm text-red-600">ID de folha invalido.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {folha ? `Folha - Competencia ${folha.competencia}` : "Folha - Competencia"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Status: <span className="font-medium">{folha?.status ?? "-"}</span> | Pagamento previsto:{" "}
                <span className="font-medium">{folha?.data_pagamento_prevista ?? "-"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {prevFolha ? (
                <Link
                  href={`/admin/financeiro/folha/colaboradores/${prevFolha.id}`}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Anterior
                </Link>
              ) : (
                <button className="rounded-md border px-3 py-2 text-sm opacity-50" disabled>
                  Anterior
                </button>
              )}

              {nextFolha ? (
                <Link
                  href={`/admin/financeiro/folha/colaboradores/${nextFolha.id}`}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Proxima
                </Link>
              ) : (
                <button className="rounded-md border px-3 py-2 text-sm opacity-50" disabled>
                  Proxima
                </button>
              )}

              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => void importarFaturas()}
                disabled={importing || folha?.status !== "ABERTA"}
              >
                {importing ? "Reprocessando..." : "Reprocessar cartao"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => void fecharFolha()}
                disabled={fechando || folha?.status !== "ABERTA"}
              >
                {fechando ? "Fechando..." : "Fechar folha"}
              </button>
              <Link href="/admin/financeiro/folha/colaboradores" className="rounded-md border px-3 py-2 text-sm">
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Resumo por colaborador</h2>
          <div className="mt-4 overflow-x-auto">
            {colaboradores.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum item na folha ainda.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Colaborador</th>
                    <th className="px-3 py-2 text-right">Proventos</th>
                    <th className="px-3 py-2 text-right">Descontos</th>
                    <th className="px-3 py-2 text-right">Liquido</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((c) => (
                    <tr key={c.colaborador_id} className="border-t">
                      <td className="px-3 py-2">{c.nome}</td>
                      <td className="px-3 py-2 text-right">{brlFromCentavos(c.proventos_centavos)}</td>
                      <td className="px-3 py-2 text-right">{brlFromCentavos(c.descontos_centavos)}</td>
                      <td className="px-3 py-2 text-right">{brlFromCentavos(c.liquido_centavos)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded border px-3 py-1 text-xs"
                          onClick={() => setSelectedColaboradorId(c.colaborador_id)}
                        >
                          Ver itens
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Rubricas do colaborador</h2>

          <p className="mt-2 text-xs text-slate-600">
            Descontos automaticos do Cartao Conexao agora exibem a cadeia tecnica da origem para auditoria.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Colaborador</span>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={selectedColaboradorId ?? ""}
                onChange={(e) => setSelectedColaboradorId(Number(e.target.value) || null)}
              >
                <option value="">Selecione...</option>
                {colaboradores.map((c) => (
                  <option key={c.colaborador_id} value={c.colaborador_id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedColaborador ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">Proventos</div>
                <div className="font-medium">{brlFromCentavos(selectedColaborador.proventos_centavos)}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">Descontos</div>
                <div className="font-medium">{brlFromCentavos(selectedColaborador.descontos_centavos)}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">Liquido</div>
                <div className="font-medium">{brlFromCentavos(selectedColaborador.liquido_centavos)}</div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Descricao</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-600" colSpan={5}>
                      Nenhum item para o colaborador selecionado.
                    </td>
                  </tr>
                ) : (
                  itensFiltrados.map((item) => (
                    <tr key={item.id} className={itemRowClass(item)}>
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-slate-900">{item.descricao}</div>
                        {item.origem_resumo ? (
                          <div className="mt-2 space-y-1 text-xs text-slate-600">
                            <div>
                              Fatura #{item.origem_resumo.fatura_id} | Competencia{" "}
                              {formatCompetencia(item.origem_resumo.competencia)}
                            </div>
                            <div>Status da fatura: {item.origem_resumo.status_fatura ?? "-"}</div>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top">{item.tipo_item}</td>
                      <td className="px-3 py-3 text-right align-top">{brlFromCentavos(item.valor_centavos)}</td>
                      <td className="px-3 py-3 align-top">
                        {item.origem_resumo ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${origemBadgeClass(item.origem_resumo.status_origem)}`}
                              >
                                {item.origem_resumo.possui_inconsistencia
                                  ? `INCONSISTENTE (${item.origem_resumo.status_origem})`
                                  : item.origem_resumo.status_origem}
                              </span>
                              <span className="text-xs text-slate-600">{item.origem_resumo.origem_amigavel}</span>
                            </div>

                            <div className="rounded-lg border bg-white p-3 text-xs text-slate-700">
                              <div className="font-medium text-slate-900">Origem tecnica</div>
                              <div className="mt-1 break-all">{item.origem_resumo.origem_tecnica}</div>
                              <div className="mt-2 text-slate-600">
                                Validos: {brlFromCentavos(item.origem_resumo.total_validos_centavos)} | Invalidos:{" "}
                                {brlFromCentavos(item.origem_resumo.total_invalidos_centavos)}
                              </div>
                            </div>

                            {item.origem_resumo.motivos.length > 0 ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                {item.origem_resumo.motivos.join(" | ")}
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              {item.origem_resumo.itens_origem.map((origem) => (
                                <div key={origem.lancamento_id} className="rounded-lg border bg-slate-50 p-3 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${origemBadgeClass(origem.status_origem)}`}
                                    >
                                      {origem.status_origem}
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      Lancamento #{origem.lancamento_id}
                                    </span>
                                    <span className="text-slate-600">{brlFromCentavos(origem.valor_centavos)}</span>
                                  </div>
                                  <div className="mt-1 text-slate-700">
                                    {origem.descricao ?? origem.origem_amigavel} | {formatCompetencia(origem.competencia)}
                                  </div>
                                  <div className="mt-1 break-all text-slate-500">{origem.origem_tecnica}</div>
                                  {origem.referencia_item ? (
                                    <div className="mt-1 text-slate-500">Ref.: {origem.referencia_item}</div>
                                  ) : null}
                                  {origem.motivos.length > 0 ? (
                                    <div className="mt-2 text-amber-700">{origem.motivos.join(" | ")}</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span>{item.criado_automatico ? "Automatico" : "Manual"}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">{item.created_at ? item.created_at.slice(0, 10) : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Adicionar rubrica manual</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span>Tipo de rubrica</span>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={tipoItem}
                  onChange={(e) =>
                    setTipoItem(e.target.value as "PROVENTO" | "DESCONTO" | "ADIANTAMENTO_SALARIAL")
                  }
                >
                  <option value="PROVENTO">Provento</option>
                  <option value="DESCONTO">Desconto</option>
                  <option value="ADIANTAMENTO_SALARIAL">Adiantamento salarial</option>
                </select>
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span>Descricao</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Ajuste mensal"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Valor (R$)</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  placeholder="0,00"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                onClick={() => void adicionarRubricaManual()}
                disabled={addingManual || !selectedColaboradorId || folha?.status !== "ABERTA"}
              >
                {addingManual ? "Adicionando..." : "Adicionar"}
              </button>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm disabled:opacity-60"
                onClick={() => void adicionarSalarioBaseCadastro()}
                disabled={addingSalarioBase || !selectedColaboradorId || folha?.status !== "ABERTA"}
              >
                {addingSalarioBase ? "Adicionando..." : "Adicionar salario base do cadastro"}
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-600">{loading ? "Carregando detalhes..." : message ?? ""}</div>
        </div>
      </div>
    </div>
  );
}
