"use client";

import { useEffect, useState } from "react";

type CentroCustoResumo = {
  id: number;
  nome: string;
};

type FormaPagamentoDic = {
  id: number;
  codigo: string;
  nome: string;
  tipo_base: string;
  ativo: boolean;
};

type ContaFinanceiraOp = {
  id: number;
  codigo: string;
  nome: string;
};

type MaquinaCartaoOp = {
  id: number;
  nome: string;
};

type FormaPagamentoContexto = {
  id?: number;
  centro_custo_id: number;
  forma_pagamento_codigo: string;
  descricao_exibicao: string;
  ativo: boolean;
  ordem_exibicao: number;
  conta_financeira_id?: number | null;
  cartao_maquina_id?: number | null;
  carteira_tipo?: string | null;
  formas_pagamento?: {
    id?: number;
    nome?: string;
    tipo_base?: string;
    codigo?: string;
    ativo?: boolean;
  } | null;
  contas_financeiras?: {
    id?: number;
    codigo?: string;
    nome?: string;
  } | null;
  cartao_maquinas?: {
    id?: number;
    nome?: string;
  } | null;
};

export default function FormasPagamentoContextoPage() {
  const [centros, setCentros] = useState<CentroCustoResumo[]>([]);
  const [centroSelecionado, setCentroSelecionado] = useState<number | "">("");
  const [formasDic, setFormasDic] = useState<FormaPagamentoDic[]>([]);
  const [contas, setContas] = useState<ContaFinanceiraOp[]>([]);
  const [maquinasCartao, setMaquinasCartao] = useState<MaquinaCartaoOp[]>([]);
  const [formasContexto, setFormasContexto] = useState<FormaPagamentoContexto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormaPagamentoContexto>({
    centro_custo_id: 0,
    forma_pagamento_codigo: "",
    descricao_exibicao: "",
    ativo: true,
    ordem_exibicao: 0,
    conta_financeira_id: null,
    cartao_maquina_id: null,
    carteira_tipo: null,
  });

  async function carregarBases() {
    try {
      setCarregando(true);
      setErro(null);

      const [centrosRes, formasDicRes, contasRes, maquinasRes] = await Promise.all([
        fetch("/api/financeiro/contas-financeiras/centros"),
        fetch("/api/financeiro/formas-pagamento/dicionario"),
        fetch("/api/financeiro/contas-financeiras"),
        fetch("/api/financeiro/cartao/maquinas/opcoes"),
      ]);

      if (!centrosRes.ok) throw new Error(await centrosRes.text());
      if (!formasDicRes.ok) throw new Error(await formasDicRes.text());
      if (!contasRes.ok) throw new Error(await contasRes.text());
      if (!maquinasRes.ok) throw new Error(await maquinasRes.text());

      const centrosJson = await centrosRes.json();
      const formasDicJson = await formasDicRes.json();
      const contasJson = await contasRes.json();
      const maquinasJson = await maquinasRes.json();

      setCentros(centrosJson.centros ?? []);
      setFormasDic(formasDicJson.formas ?? []);
      setContas(
        (contasJson.contas ?? []).map((c: any) => ({
          id: c.id,
          codigo: c.codigo,
          nome: c.nome,
        }))
      );
      setMaquinasCartao(maquinasJson.maquinas ?? []);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar bases de formas de pagamento.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarContexto(centroId: number) {
    try {
      setCarregando(true);
      setErro(null);

      const res = await fetch(`/api/financeiro/formas-pagamento?centro_custo_id=${centroId}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setFormasContexto(json.formas ?? []);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar formas de pagamento para o centro selecionado.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarBases();
  }, []);

  useEffect(() => {
    if (centroSelecionado && typeof centroSelecionado === "number") {
      carregarContexto(centroSelecionado);
      resetForm(centroSelecionado);
    }
  }, [centroSelecionado]);

  function resetForm(centroId?: number) {
    setEditandoId(null);
    setForm({
      centro_custo_id: centroId || 0,
      forma_pagamento_codigo: "",
      descricao_exibicao: "",
      ativo: true,
      ordem_exibicao: 0,
      conta_financeira_id: null,
      cartao_maquina_id: null,
      carteira_tipo: null,
    });
  }

  function editarLinha(linha: FormaPagamentoContexto) {
    setEditandoId(linha.id ?? null);
    setForm({
      id: linha.id,
      centro_custo_id: linha.centro_custo_id,
      forma_pagamento_codigo: linha.forma_pagamento_codigo,
      descricao_exibicao: linha.descricao_exibicao,
      ativo: linha.ativo,
      ordem_exibicao: linha.ordem_exibicao,
      conta_financeira_id: linha.conta_financeira_id ?? linha.contas_financeiras?.id ?? null,
      cartao_maquina_id: linha.cartao_maquina_id ?? linha.cartao_maquinas?.id ?? null,
      carteira_tipo: linha.carteira_tipo ?? null,
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!centroSelecionado || typeof centroSelecionado !== "number") {
      setErro("Selecione um centro de custo antes de salvar.");
      return;
    }
    if (!form.forma_pagamento_codigo) {
      setErro("Selecione uma forma de pagamento.");
      return;
    }
    if (!form.descricao_exibicao.trim()) {
      setErro("Informe uma descrição para exibição.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        id: editandoId ?? undefined,
        centro_custo_id: centroSelecionado,
        forma_pagamento_codigo: form.forma_pagamento_codigo,
        descricao_exibicao: form.descricao_exibicao.trim(),
        ativo: form.ativo,
        ordem_exibicao: form.ordem_exibicao ?? 0,
        conta_financeira_id: form.conta_financeira_id || null,
        cartao_maquina_id: form.cartao_maquina_id || null,
        carteira_tipo: form.carteira_tipo || null,
      };

      const res = await fetch("/api/financeiro/formas-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(await res.text());
        setErro("Erro ao salvar forma de pagamento do contexto.");
        return;
      }

      await carregarContexto(centroSelecionado);
      resetForm(centroSelecionado);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao salvar forma de pagamento do contexto.");
    } finally {
      setSalvando(false);
    }
  }

  function formatTipoBase(codigo: string) {
    const fp = formasDic.find((f) => f.codigo === codigo);
    if (!fp) return codigo;
    return `${fp.nome} (${fp.tipo_base})`;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Formas de pagamento por contexto</h1>
        <p className="text-sm text-gray-600">
          Configure quais formas de pagamento estao disponiveis em cada centro de custo (Loja, Escola, Cafe)
          e como elas serao exibidas na frente de caixa.
        </p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Centro de custo</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={centroSelecionado ?? ""}
              onChange={(e) => setCentroSelecionado(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500 md:col-span-2">
            Escolha o centro de custo (por exemplo, Loja, Escola, Cafe) para gerenciar as formas de pagamento
            especificas daquele contexto (PIX Loja, Credito Loja, Crediario colaborador, etc.).
          </div>
        </div>
      </section>

      {centroSelecionado && typeof centroSelecionado === "number" && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          {/* Lista */}
          <section className="bg-white border rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Formas de pagamento deste centro</h2>
            </div>
            <div className="overflow-x-auto">
              {carregando ? (
                <div className="p-4 text-sm text-gray-600">Carregando formas...</div>
              ) : formasContexto.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  Nenhuma forma configurada para este centro. Adicione ao lado.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Forma base</th>
                      <th className="px-3 py-2 text-left">Descricao exibida</th>
                      <th className="px-3 py-2 text-left">Conta</th>
                      <th className="px-3 py-2 text-left">Maquininha</th>
                      <th className="px-3 py-2 text-left">Carteira</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-center">Ordem</th>
                      <th className="px-3 py-2 text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formasContexto.map((f) => (
                      <tr key={f.id} className="border-t">
                        <td className="px-3 py-2">{formatTipoBase(f.forma_pagamento_codigo)}</td>
                        <td className="px-3 py-2">{f.descricao_exibicao}</td>
                        <td className="px-3 py-2">
                          {f.contas_financeiras
                            ? `${f.contas_financeiras.nome} (${f.contas_financeiras.codigo})`
                            : "-"}
                        </td>
                        <td className="px-3 py-2">{f.cartao_maquinas?.nome ?? "-"}</td>
                        <td className="px-3 py-2">{f.carteira_tipo ?? "-"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              f.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {f.ativo ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">{f.ordem_exibicao}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={() => editarLinha(f)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Formulário */}
          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editandoId ? "Editar forma de pagamento" : "Nova forma de pagamento"}
              </h2>
              {editandoId && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700"
                  onClick={() =>
                    resetForm(typeof centroSelecionado === "number" ? centroSelecionado : undefined)
                  }
                >
                  Limpar / Nova
                </button>
              )}
            </div>

            <form className="space-y-3" onSubmit={salvar}>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Forma base *</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.forma_pagamento_codigo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      forma_pagamento_codigo: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {formasDic
                    .filter((f) => f.ativo)
                    .map((f) => (
                      <option key={f.codigo} value={f.codigo}>
                        {f.nome} ({f.tipo_base})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descricao exibida no caixa *
                </label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.descricao_exibicao}
                  onChange={(e) => setForm((prev) => ({ ...prev, descricao_exibicao: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Conta financeira (opcional)
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.conta_financeira_id ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      conta_financeira_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">(nenhuma)</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Maquininha padrao (para cartao) - opcional
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.cartao_maquina_id ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cartao_maquina_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">(nenhuma)</option>
                  {maquinasCartao.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Usado quando a forma base for de tipo CARTAO (ex.: CREDITO_AVISTA/CREDITO_PARCELADO).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo de carteira interna (para crediario/credito aluno) - opcional
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.carteira_tipo ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      carteira_tipo: e.target.value || null,
                    }))
                  }
                >
                  <option value="">(nenhum)</option>
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="ALUNO">Aluno</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ordem de exibicao</label>
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={form.ordem_exibicao}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ordem_exibicao: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center mt-6 gap-2">
                  <input
                    id="fp-ativo"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.ativo}
                    onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <label htmlFor="fp-ativo" className="text-xs text-gray-700">
                    Forma ativa
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar forma de pagamento"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
