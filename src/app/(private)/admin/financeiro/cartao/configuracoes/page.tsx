"use client";

import { useEffect, useState, type FormEvent } from "react";

type Bandeira = {
  id?: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

type ContaFinanceiraOp = {
  id: number;
  nome: string;
  codigo?: string;
};

type CentroCustoOp = {
  id: number;
  nome: string;
};

type Maquina = {
  id?: number;
  nome: string;
  operadora?: string | null;
  conta_financeira_id?: number | null;
  centro_custo_id?: number | null;
  ativo: boolean;
  observacoes?: string | null;
  contas_financeiras?: { id?: number; nome?: string | null; codigo?: string | null } | null;
  centros_custo?: { id?: number; nome?: string | null } | null;
};

type Regra = {
  id?: number;
  maquina_id?: number | null;
  bandeira_id?: number | null;
  tipo_transacao: string;
  prazo_recebimento_dias: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  permitir_parcelado: boolean;
  max_parcelas: number;
  ativo: boolean;
  cartao_maquinas?: { id?: number; nome?: string | null } | null;
  cartao_bandeiras?: { id?: number; nome?: string | null } | null;
};

type MaquinaOpcao = {
  id: number;
  nome: string;
};

export default function ConfiguracoesCartaoPage() {
  // Bandeiras
  const [bandeiras, setBandeiras] = useState<Bandeira[]>([]);
  const [bandeiraForm, setBandeiraForm] = useState<Bandeira>({ nome: "", codigo: "", ativo: true });
  const [bandeiraEditId, setBandeiraEditId] = useState<number | null>(null);

  // Maquinas
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [maquinaForm, setMaquinaForm] = useState<Maquina>({
    nome: "",
    operadora: "",
    conta_financeira_id: undefined,
    centro_custo_id: undefined,
    ativo: true,
    observacoes: "",
  });
  const [maquinaEditId, setMaquinaEditId] = useState<number | null>(null);

  // Regras
  const [regras, setRegras] = useState<Regra[]>([]);
  const [regraForm, setRegraForm] = useState<Regra>({
    tipo_transacao: "CREDITO",
    prazo_recebimento_dias: 30,
    taxa_percentual: 0,
    taxa_fixa_centavos: 0,
    permitir_parcelado: true,
    max_parcelas: 12,
    ativo: true,
  });
  const [regraEditId, setRegraEditId] = useState<number | null>(null);

  // Apoio
  const [contasFinanceiras, setContasFinanceiras] = useState<ContaFinanceiraOp[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoOp[]>([]);
  const [maquinasOpcoes, setMaquinasOpcoes] = useState<MaquinaOpcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarTudo() {
    try {
      setLoading(true);
      setErro(null);

      const [bRes, mRes, rRes, contasRes, centrosRes, maqOpsRes] = await Promise.all([
        fetch("/api/financeiro/cartao/bandeiras"),
        fetch("/api/financeiro/cartao/maquinas"),
        fetch("/api/financeiro/cartao/regras"),
        fetch("/api/financeiro/contas-financeiras"),
        fetch("/api/financeiro/contas-financeiras/centros"),
        fetch("/api/financeiro/cartao/maquinas/opcoes"),
      ]);

      if (!bRes.ok || !mRes.ok || !rRes.ok || !contasRes.ok || !centrosRes.ok || !maqOpsRes.ok) {
        throw new Error("Erro ao carregar dados de configuração de cartão.");
      }

      const bJson = await bRes.json();
      const mJson = await mRes.json();
      const rJson = await rRes.json();
      const contasJson = await contasRes.json();
      const centrosJson = await centrosRes.json();
      const maqOpsJson = await maqOpsRes.json();

      setBandeiras(bJson.bandeiras ?? []);
      setMaquinas(mJson.maquinas ?? []);
      setRegras(rJson.regras ?? []);
      setContasFinanceiras(
        (contasJson.contas ?? []).map((c) => {
          if (!c || typeof c !== "object") {
            return { id: 0, nome: "Conta", codigo: undefined };
          }
          const conta = c as { id?: number; nome?: string; codigo?: string | null };
          return { id: conta.id ?? 0, nome: conta.nome ?? "Conta", codigo: conta.codigo ?? undefined };
        }),
      );
      setCentrosCusto(centrosJson.centros ?? []);
      setMaquinasOpcoes(maqOpsJson.maquinas ?? []);
    } catch (e: unknown) {
      console.error(e);
      setErro("Erro ao carregar configurações de cartão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // Helpers
  function resetBandeiraForm() {
    setBandeiraForm({ nome: "", codigo: "", ativo: true });
    setBandeiraEditId(null);
  }
  function resetMaquinaForm() {
    setMaquinaForm({
      nome: "",
      operadora: "",
      conta_financeira_id: undefined,
      centro_custo_id: undefined,
      ativo: true,
      observacoes: "",
    });
    setMaquinaEditId(null);
  }
  function resetRegraForm() {
    setRegraForm({
      tipo_transacao: "CREDITO",
      prazo_recebimento_dias: 30,
      taxa_percentual: 0,
      taxa_fixa_centavos: 0,
      permitir_parcelado: true,
      max_parcelas: 12,
      ativo: true,
    });
    setRegraEditId(null);
  }

  // Edit handlers
  function editarBandeira(b: Bandeira) {
    setBandeiraEditId(b.id ?? null);
    setBandeiraForm({
      id: b.id,
      nome: b.nome,
      codigo: b.codigo ?? "",
      ativo: b.ativo,
    });
  }

  function editarMaquina(m: Maquina) {
    setMaquinaEditId(m.id ?? null);
    setMaquinaForm({
      id: m.id,
      nome: m.nome,
      operadora: m.operadora ?? "",
      conta_financeira_id: m.conta_financeira_id ?? m.contas_financeiras?.id ?? undefined,
      centro_custo_id: m.centro_custo_id ?? m.centros_custo?.id ?? undefined,
      ativo: m.ativo,
      observacoes: m.observacoes ?? "",
    });
  }

  function editarRegra(r: Regra) {
    setRegraEditId(r.id ?? null);
    setRegraForm({
      id: r.id,
      maquina_id: r.maquina_id ?? r.cartao_maquinas?.id ?? undefined,
      bandeira_id: r.bandeira_id ?? r.cartao_bandeiras?.id ?? undefined,
      tipo_transacao: r.tipo_transacao,
      prazo_recebimento_dias: r.prazo_recebimento_dias,
      taxa_percentual: r.taxa_percentual,
      taxa_fixa_centavos: r.taxa_fixa_centavos,
      permitir_parcelado: r.permitir_parcelado,
      max_parcelas: r.max_parcelas,
      ativo: r.ativo,
    });
  }

  // Save handlers
  async function salvarBandeira(e: FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErro(null);

      const res = await fetch("/api/financeiro/cartao/bandeiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bandeiraEditId ?? undefined,
          nome: bandeiraForm.nome.trim(),
          codigo: bandeiraForm.codigo?.trim() || null,
          ativo: bandeiraForm.ativo,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setErro("Erro ao salvar bandeira.");
        return;
      }

      await carregarTudo();
      resetBandeiraForm();
    } catch (e: unknown) {
      console.error(e);
      setErro("Erro ao salvar bandeira.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarMaquina(e: FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErro(null);

      const res = await fetch("/api/financeiro/cartao/maquinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: maquinaEditId ?? undefined,
          nome: maquinaForm.nome.trim(),
          operadora: maquinaForm.operadora?.trim() || null,
          conta_financeira_id: maquinaForm.conta_financeira_id,
          centro_custo_id: maquinaForm.centro_custo_id,
          ativo: maquinaForm.ativo,
          observacoes: maquinaForm.observacoes?.trim() || null,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setErro("Erro ao salvar maquininha.");
        return;
      }

      await carregarTudo();
      resetMaquinaForm();
    } catch (e: unknown) {
      console.error(e);
      setErro("Erro ao salvar maquininha.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarRegra(e: FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErro(null);

      const res = await fetch("/api/financeiro/cartao/regras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: regraEditId ?? undefined,
          maquina_id: regraForm.maquina_id,
          bandeira_id: regraForm.bandeira_id,
          tipo_transacao: regraForm.tipo_transacao,
          prazo_recebimento_dias: regraForm.prazo_recebimento_dias,
          taxa_percentual: regraForm.taxa_percentual,
          taxa_fixa_centavos: regraForm.taxa_fixa_centavos,
          permitir_parcelado: regraForm.permitir_parcelado,
          max_parcelas: regraForm.max_parcelas,
          ativo: regraForm.ativo,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setErro("Erro ao salvar regra de cartão.");
        return;
      }

      await carregarTudo();
      resetRegraForm();
    } catch (e: unknown) {
      console.error(e);
      setErro("Erro ao salvar regra de cartão.");
    } finally {
      setSaving(false);
    }
  }

  function formatAtivo(ativo: boolean) {
    return ativo ? "Ativo" : "Inativo";
  }

  function formatPrazoDias(dias: number) {
    return `D+${dias}`;
  }

  function formatValorPercentual(v: number) {
    return `${v.toFixed(2)}%`;
  }

  function formatValorCentavos(c: number) {
    return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuração de cartões</h1>
        <p className="text-sm text-gray-600">
          Cadastre bandeiras, maquininhas e regras de operação (prazos e taxas) usadas nas vendas no cartão.
        </p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      {loading ? (
        <div className="text-sm text-gray-600">Carregando configurações...</div>
      ) : (
        <div className="space-y-8">
          {/* Bandeiras */}
          <section className="border rounded-xl bg-white shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bandeiras de cartão</h2>
              {bandeiraEditId && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={resetBandeiraForm}
                >
                  Limpar / Nova
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bandeiras.map((b) => (
                      <tr key={b.id} className="border-t">
                        <td className="px-3 py-2">{b.nome}</td>
                        <td className="px-3 py-2">{b.codigo || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              b.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatAtivo(b.ativo)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={() => editarBandeira(b)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {bandeiras.length === 0 && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-gray-600" colSpan={4}>
                          Nenhuma bandeira cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form className="space-y-3" onSubmit={salvarBandeira}>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nome *</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={bandeiraForm.nome}
                    onChange={(e) => setBandeiraForm((prev) => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Código (opcional)</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={bandeiraForm.codigo ?? ""}
                    onChange={(e) => setBandeiraForm((prev) => ({ ...prev, codigo: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="bandeira-ativo"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={bandeiraForm.ativo}
                    onChange={(e) => setBandeiraForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <label htmlFor="bandeira-ativo" className="text-xs text-gray-700">
                    Bandeira ativa
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar bandeira"}
                </button>
              </form>
            </div>
          </section>

          {/* Maquininhas */}
          <section className="border rounded-xl bg-white shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Maquininhas de cartão</h2>
              {maquinaEditId && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={resetMaquinaForm}
                >
                  Limpar / Nova
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Operadora</th>
                      <th className="px-3 py-2 text-left">Conta financeira</th>
                      <th className="px-3 py-2 text-left">Centro de custo</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maquinas.map((m) => (
                      <tr key={m.id} className="border-t">
                        <td className="px-3 py-2">{m.nome}</td>
                        <td className="px-3 py-2">{m.operadora || "—"}</td>
                        <td className="px-3 py-2">
                          {m.contas_financeiras ? `${m.contas_financeiras.nome} (${m.contas_financeiras.codigo})` : "—"}
                        </td>
                        <td className="px-3 py-2">{m.centros_custo?.nome ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatAtivo(m.ativo)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={() => editarMaquina(m)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {maquinas.length === 0 && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-gray-600" colSpan={6}>
                          Nenhuma maquininha cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form className="space-y-3" onSubmit={salvarMaquina}>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nome *</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={maquinaForm.nome ?? ""}
                    onChange={(e) => setMaquinaForm((prev) => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Operadora</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={maquinaForm.operadora ?? ""}
                    onChange={(e) => setMaquinaForm((prev) => ({ ...prev, operadora: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Conta financeira *</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={maquinaForm.conta_financeira_id ?? ""}
                    onChange={(e) =>
                      setMaquinaForm((prev) => ({
                        ...prev,
                        conta_financeira_id: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione...</option>
                    {contasFinanceiras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Centro de custo *</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={maquinaForm.centro_custo_id ?? ""}
                    onChange={(e) =>
                      setMaquinaForm((prev) => ({
                        ...prev,
                        centro_custo_id: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione...</option>
                    {centrosCusto.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Observações</label>
                  <textarea
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    rows={3}
                    value={maquinaForm.observacoes ?? ""}
                    onChange={(e) => setMaquinaForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="maquina-ativo"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={maquinaForm.ativo}
                    onChange={(e) => setMaquinaForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <label htmlFor="maquina-ativo" className="text-xs text-gray-700">
                    Maquininha ativa
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar maquininha"}
                </button>
              </form>
            </div>
          </section>

          {/* Regras */}
          <section className="border rounded-xl bg-white shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Regras de operação</h2>
              {regraEditId && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={resetRegraForm}
                >
                  Limpar / Nova
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Maquininha</th>
                      <th className="px-3 py-2 text-left">Bandeira</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Prazo</th>
                      <th className="px-3 py-2 text-left">Taxa</th>
                      <th className="px-3 py-2 text-left">Parcelamento</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regras.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">{r.cartao_maquinas?.nome ?? `#${r.maquina_id}`}</td>
                        <td className="px-3 py-2">{r.cartao_bandeiras?.nome ?? `#${r.bandeira_id}`}</td>
                        <td className="px-3 py-2">{r.tipo_transacao}</td>
                        <td className="px-3 py-2">{formatPrazoDias(r.prazo_recebimento_dias)}</td>
                        <td className="px-3 py-2">
                          {formatValorPercentual(r.taxa_percentual)} + {formatValorCentavos(r.taxa_fixa_centavos)}
                        </td>
                        <td className="px-3 py-2">
                          {r.permitir_parcelado ? `Até ${r.max_parcelas}x` : "Sem parcelado"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatAtivo(r.ativo)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={() => editarRegra(r)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {regras.length === 0 && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-gray-600" colSpan={8}>
                          Nenhuma regra cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form className="space-y-3" onSubmit={salvarRegra}>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Maquininha *</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={regraForm.maquina_id ?? ""}
                    onChange={(e) =>
                      setRegraForm((prev) => ({
                        ...prev,
                        maquina_id: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione...</option>
                    {maquinasOpcoes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Bandeira *</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={regraForm.bandeira_id ?? ""}
                    onChange={(e) =>
                      setRegraForm((prev) => ({
                        ...prev,
                        bandeira_id: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione...</option>
                    {bandeiras
                      .filter((b) => b.ativo)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Tipo de transação *</label>
                  <select
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={regraForm.tipo_transacao}
                    onChange={(e) =>
                      setRegraForm((prev) => ({
                        ...prev,
                        tipo_transacao: e.target.value,
                      }))
                    }
                  >
                    <option value="CREDITO">Crédito</option>
                    {/* Futuro: DEBITO, CREDITO_PARCELADO_LOJA etc. */}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Prazo (dias)</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                      value={regraForm.prazo_recebimento_dias}
                      onChange={(e) =>
                        setRegraForm((prev) => ({
                          ...prev,
                          prazo_recebimento_dias: Number(e.target.value || 0),
                        }))
                      }
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Taxa %</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                      value={regraForm.taxa_percentual}
                      onChange={(e) =>
                        setRegraForm((prev) => ({
                          ...prev,
                          taxa_percentual: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Taxa fixa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={regraForm.taxa_fixa_centavos / 100}
                    onChange={(e) =>
                      setRegraForm((prev) => ({
                        ...prev,
                        taxa_fixa_centavos: Math.round(Number(e.target.value || 0) * 100),
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      id="regra-permite-parcelado"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={regraForm.permitir_parcelado}
                      onChange={(e) =>
                        setRegraForm((prev) => ({
                          ...prev,
                          permitir_parcelado: e.target.checked,
                        }))
                      }
                    />
                    <label htmlFor="regra-permite-parcelado" className="text-xs text-gray-700">
                      Permite parcelado
                    </label>
                  </div>
                  {regraForm.permitir_parcelado && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Máx. parcelas</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                        value={regraForm.max_parcelas}
                        onChange={(e) =>
                          setRegraForm((prev) => ({
                            ...prev,
                            max_parcelas: Number(e.target.value || 1),
                          }))
                        }
                        min={1}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="regra-ativa"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={regraForm.ativo}
                    onChange={(e) =>
                      setRegraForm((prev) => ({
                        ...prev,
                        ativo: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="regra-ativa" className="text-xs text-gray-700">
                    Regra ativa
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar regra"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
