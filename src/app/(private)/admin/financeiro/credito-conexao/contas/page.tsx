"use client";

import { useEffect, useState } from "react";

type ContaConexao = {
  id?: number;
  pessoa_titular_id: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  descricao_exibicao?: string | null;
  dia_fechamento: number;
  dia_vencimento?: number | null;
  centro_custo_principal_id?: number | null;
  conta_financeira_origem_id?: number | null;
  conta_financeira_destino_id?: number | null;
  limite_maximo_centavos?: number | null;
  limite_autorizado_centavos?: number | null;
  ativo: boolean;
  pessoas?: { id?: number; nome?: string | null } | null;
};

export default function ContasCreditoConexaoPage() {
  const [contas, setContas] = useState<ContaConexao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [form, setForm] = useState<ContaConexao>({
    pessoa_titular_id: 0,
    tipo_conta: "ALUNO",
    descricao_exibicao: "",
    dia_fechamento: 10,
    dia_vencimento: 15,
    centro_custo_principal_id: undefined,
    conta_financeira_origem_id: undefined,
    conta_financeira_destino_id: undefined,
    limite_maximo_centavos: null,
    limite_autorizado_centavos: null,
    ativo: true,
  });

  async function carregarContas() {
    try {
      setLoading(true);
      setErro(null);
      const res = await fetch("/api/financeiro/credito-conexao/contas");
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setContas(json.contas ?? []);
    } catch (e: unknown) {
      console.error("Erro ao carregar contas de Crédito Conexão", e);
      setErro("Erro ao carregar contas de Crédito Conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarContas();
  }, []);

  function resetForm() {
    setForm({
      pessoa_titular_id: 0,
      tipo_conta: "ALUNO",
      descricao_exibicao: "",
      dia_fechamento: 10,
      dia_vencimento: 15,
      centro_custo_principal_id: undefined,
      conta_financeira_origem_id: undefined,
      conta_financeira_destino_id: undefined,
      limite_maximo_centavos: null,
      limite_autorizado_centavos: null,
      ativo: true,
    });
    setEditandoId(null);
  }

  function editarConta(conta: ContaConexao) {
    setEditandoId(conta.id ?? null);
    setForm({
      id: conta.id,
      pessoa_titular_id: conta.pessoa_titular_id,
      tipo_conta: conta.tipo_conta,
      descricao_exibicao: conta.descricao_exibicao ?? "",
      dia_fechamento: conta.dia_fechamento,
      dia_vencimento: conta.dia_vencimento ?? undefined,
      centro_custo_principal_id: conta.centro_custo_principal_id ?? undefined,
      conta_financeira_origem_id: conta.conta_financeira_origem_id ?? undefined,
      conta_financeira_destino_id: conta.conta_financeira_destino_id ?? undefined,
      limite_maximo_centavos: conta.limite_maximo_centavos ?? null,
      limite_autorizado_centavos: conta.limite_autorizado_centavos ?? null,
      ativo: conta.ativo,
    });
  }

  async function salvarConta(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErro(null);

      if (!form.pessoa_titular_id || form.pessoa_titular_id <= 0) {
        setErro("Informe o ID da pessoa titular.");
        return;
      }

      const payload = {
        id: editandoId ?? undefined,
        pessoa_titular_id: Number(form.pessoa_titular_id),
        tipo_conta: form.tipo_conta,
        descricao_exibicao: form.descricao_exibicao?.trim() || null,
        dia_fechamento: form.dia_fechamento,
        dia_vencimento: form.dia_vencimento ?? null,
        centro_custo_principal_id: form.centro_custo_principal_id ?? null,
        conta_financeira_origem_id: form.conta_financeira_origem_id ?? null,
        conta_financeira_destino_id: form.conta_financeira_destino_id ?? null,
        limite_maximo_centavos:
          form.limite_maximo_centavos != null ? Number(form.limite_maximo_centavos) : null,
        limite_autorizado_centavos:
          form.limite_autorizado_centavos != null
            ? Number(form.limite_autorizado_centavos)
            : null,
        ativo: form.ativo,
      };

      const res = await fetch("/api/financeiro/credito-conexao/contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Erro ao salvar conta Crédito Conexão", await res.text());
        setErro("Erro ao salvar conta de Crédito Conexão.");
        return;
      }

      await carregarContas();
      resetForm();
    } catch (e: unknown) {
      console.error("Erro ao salvar conta Crédito Conexão", e);
      setErro("Erro ao salvar conta de Crédito Conexão.");
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(centavos?: number | null) {
    if (centavos == null) return "—";
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crédito Conexão — Contas</h1>
        <p className="text-sm text-gray-600">
          Cadastre aqui as contas de Cartão Conexão Aluno/Colaborador. Cada conta representa um
          titular (responsável ou colaborador) com limites e datas de fatura.
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
            <div className="p-4 text-sm text-gray-600">Nenhuma conta cadastrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Titular</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Fechamento</th>
                    <th className="px-3 py-2 text-left">Vencimento</th>
                    <th className="px-3 py-2 text-left">Limite máx.</th>
                    <th className="px-3 py-2 text-left">Limite aut.</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">{c.id}</td>
                      <td className="px-3 py-2">
                        {c.pessoas?.nome ?? `Pessoa #${c.pessoa_titular_id}`}
                      </td>
                      <td className="px-3 py-2">{c.tipo_conta}</td>
                      <td className="px-3 py-2">dia {c.dia_fechamento}</td>
                      <td className="px-3 py-2">
                        {c.dia_vencimento ? `dia ${c.dia_vencimento}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(c.limite_maximo_centavos ?? null)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(c.limite_autorizado_centavos ?? null)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.ativo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => editarConta(c)}
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
              {editandoId ? `Editar conta #${editandoId}` : "Nova conta de Crédito Conexão"}
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
            <div>
              <label className="block text-xs font-medium text-gray-700">
                ID da pessoa titular *
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                value={form.pessoa_titular_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pessoa_titular_id: Number(e.target.value || 0),
                  }))
                }
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Por enquanto, informe o ID da pessoa (responsável ou colaborador). Em uma etapa
                futura vamos integrar este formulário direto à ficha da pessoa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Tipo de conta *</label>
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.tipo_conta}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      tipo_conta: e.target.value as "ALUNO" | "COLABORADOR",
                    }))
                  }
                >
                  <option value="ALUNO">Cartão Conexão Aluno</option>
                  <option value="COLABORADOR">Cartão Conexão Colaborador</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Descrição exibida (opcional)
                </label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.descricao_exibicao ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      descricao_exibicao: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Dia de fechamento *
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.dia_fechamento}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dia_fechamento: Number(e.target.value || 1),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Dia de vencimento (Aluno)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={form.dia_vencimento ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dia_vencimento: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Limite máximo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={
                    form.limite_maximo_centavos != null
                      ? form.limite_maximo_centavos / 100
                      : ""
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      limite_maximo_centavos: e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : null,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Limite autorizado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={
                    form.limite_autorizado_centavos != null
                      ? form.limite_autorizado_centavos / 100
                      : ""
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      limite_autorizado_centavos: e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : null,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="conta-ativa"
                type="checkbox"
                className="h-4 w-4"
                checked={form.ativo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ativo: e.target.checked,
                  }))
                }
              />
              <label htmlFor="conta-ativa" className="text-xs text-gray-700">
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
