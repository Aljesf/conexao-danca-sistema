"use client";

import React, { FormEvent, useEffect, useState } from "react";

type CentroCustoResumo = {
  id: number;
  nome: string;
};

type ContaFinanceira = {
  id?: number;
  codigo: string;
  nome: string;
  tipo: string;
  banco?: string | null;
  agencia?: string | null;
  numero_conta?: string | null;
  centro_custo_id?: number | null;
  ativo: boolean;
  centros_custo?: { id?: number; nome?: string | null } | null;
  created_at?: string;
  updated_at?: string;
};

export default function ContasFinanceirasPage() {
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [centros, setCentros] = useState<CentroCustoResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<ContaFinanceira>({
    codigo: "",
    nome: "",
    tipo: "",
    banco: "",
    agencia: "",
    numero_conta: "",
    centro_custo_id: undefined,
    ativo: true,
  });

  const [editandoId, setEditandoId] = useState<number | null>(null);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro(null);

      const [contasRes, centrosRes] = await Promise.all([
        fetch("/api/financeiro/contas-financeiras"),
        fetch("/api/financeiro/contas-financeiras/centros"),
      ]);

      if (!contasRes.ok) {
        throw new Error(await contasRes.text());
      }
      if (!centrosRes.ok) {
        throw new Error(await centrosRes.text());
      }

      const contasJson = await contasRes.json();
      const centrosJson = await centrosRes.json();

      setContas(contasJson.contas ?? []);
      setCentros(centrosJson.centros ?? []);
    } catch (e: unknown) {
      console.error("Erro ao carregar contas financeiras", e);
      setErro("Erro ao carregar contas financeiras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function resetForm() {
    setForm({
      codigo: "",
      nome: "",
      tipo: "",
      banco: "",
      agencia: "",
      numero_conta: "",
      centro_custo_id: undefined,
      ativo: true,
    });
    setEditandoId(null);
  }

  function editarConta(conta: ContaFinanceira) {
    setEditandoId(conta.id ?? null);
    setForm({
      id: conta.id,
      codigo: conta.codigo,
      nome: conta.nome,
      tipo: conta.tipo,
      banco: conta.banco ?? "",
      agencia: conta.agencia ?? "",
      numero_conta: conta.numero_conta ?? "",
      centro_custo_id: conta.centro_custo_id ?? conta.centros_custo?.id ?? undefined,
      ativo: conta.ativo,
    });
  }

  async function salvarConta(e: FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErro(null);

      const payload = {
        id: editandoId ?? undefined,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        tipo: form.tipo.trim(),
        banco: form.banco?.trim() || null,
        agencia: form.agencia?.trim() || null,
        numero_conta: form.numero_conta?.trim() || null,
        centro_custo_id: form.centro_custo_id ?? null,
        ativo: form.ativo,
      };

      const res = await fetch("/api/financeiro/contas-financeiras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Erro ao salvar conta financeira", text);
        setErro("Erro ao salvar conta financeira.");
        return;
      }

      await carregarDados();
      resetForm();
    } catch (e: unknown) {
      console.error("Erro ao salvar conta financeira", e);
      setErro("Erro ao salvar conta financeira.");
    } finally {
      setSaving(false);
    }
  }

  function formatAtivo(ativo: boolean) {
    return ativo ? "Ativa" : "Inativa";
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contas financeiras</h1>
        <p className="text-sm text-gray-600">
          Cadastre aqui as contas bancárias e caixas usados no financeiro. Elas são usadas em repasses de cartão,
          pagamentos e recebimentos.
        </p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
        {/* Lista de contas */}
        <div className="border rounded-xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Contas cadastradas</h2>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Carregando...</div>
          ) : contas.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">Nenhuma conta financeira cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Código</th>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Banco</th>
                    <th className="px-4 py-2 text-left">Agência / Conta</th>
                    <th className="px-4 py-2 text-left">Centro de custo</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Criada em</th>
                    <th className="px-4 py-2 text-left">Atualizada em</th>
                    <th className="px-4 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((conta) => (
                    <tr key={conta.id} className="border-t">
                      <td className="px-4 py-2">{conta.codigo}</td>
                      <td className="px-4 py-2">{conta.nome}</td>
                      <td className="px-4 py-2">{conta.tipo}</td>
                      <td className="px-4 py-2">{conta.banco || "—"}</td>
                      <td className="px-4 py-2">
                        {conta.agencia || conta.numero_conta
                          ? `${conta.agencia || "—"} / ${conta.numero_conta || "—"}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{conta.centros_custo?.nome ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            conta.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {formatAtivo(conta.ativo)}
                        </span>
                      </td>
                      <td className="px-4 py-2">{formatDate(conta.created_at)}</td>
                      <td className="px-4 py-2">{formatDate(conta.updated_at)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => editarConta(conta)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="border rounded-xl bg-white shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {editandoId ? `Editar conta #${editandoId}` : "Nova conta financeira"}
            </h2>
            {editandoId && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={resetForm}
              >
                Limpar / Nova
              </button>
            )}
          </div>

          <form className="space-y-3" onSubmit={salvarConta}>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Código *</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.codigo}
                  onChange={(e) => setForm((prev) => ({ ...prev, codigo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Nome *</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Tipo *</label>
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="CAIXA">Caixa</option>
                  <option value="CONTA_CORRENTE">Conta corrente</option>
                  <option value="CONTA_PAGAMENTO">Conta de pagamento</option>
                  <option value="CARTEIRA_DIGITAL">Carteira digital</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Banco</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.banco ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, banco: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Agência</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={form.agencia ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, agencia: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Conta</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    value={form.numero_conta ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, numero_conta: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Centro de custo</label>
              <select
                className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                value={form.centro_custo_id ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    centro_custo_id: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              >
                <option value="">(opcional)</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="ativo"
                type="checkbox"
                className="h-4 w-4"
                checked={form.ativo}
                onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
              />
              <label htmlFor="ativo" className="text-xs text-gray-700">
                Conta ativa
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar conta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
