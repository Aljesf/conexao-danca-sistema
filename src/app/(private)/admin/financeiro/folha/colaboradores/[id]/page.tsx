"use client";

import Link from "next/link";
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

type Item = {
  id: number;
  folha_id: number;
  colaborador_id: number;
  colaborador_nome: string;
  tipo_item: string;
  descricao: string;
  valor_centavos: number;
  criado_automatico: boolean;
  created_at: string;
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

export default function FolhaDetalhePage({ params }: { params: { id: string } }) {
  const folhaId = Number(params.id);

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
        | { imported?: number; message?: string; error?: string }
        | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_importar_faturas");
        return;
      }
      setMessage(`Importacao concluida: ${json?.imported ?? 0} itens.`);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {folha ? `Folha — Competência ${folha.competencia}` : "Folha — Competência"}
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
                  Próxima
                </Link>
              ) : (
                <button className="rounded-md border px-3 py-2 text-sm opacity-50" disabled>
                  Próxima
                </button>
              )}

              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => void importarFaturas()}
                disabled={importing || folha?.status !== "ABERTA"}
              >
                {importing ? "Importando..." : "Importar faturas (Cartao Conexao)"}
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
            Observacao de negocio: descontos so entram se existir fatura ABERTA na mesma competencia.
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
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.descricao}</td>
                      <td className="px-3 py-2">{item.tipo_item}</td>
                      <td className="px-3 py-2 text-right">{brlFromCentavos(item.valor_centavos)}</td>
                      <td className="px-3 py-2">{item.criado_automatico ? "Automatico" : "Manual"}</td>
                      <td className="px-3 py-2">{item.created_at ? item.created_at.slice(0, 10) : "-"}</td>
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
