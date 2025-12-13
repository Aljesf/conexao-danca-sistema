"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FaturaConexao = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
  created_at: string;
  conta?: {
    id: number;
    descricao_exibicao?: string | null;
    tipo_conta?: string | null;
    pessoa_titular_id?: number | null;
    titular?: {
      id: number;
      nome: string | null;
      cpf: string | null;
    } | null;
  } | null;
};

type ContaConexao = {
  id: number;
  descricao_exibicao?: string | null;
};

export default function FaturasCreditoConexaoPage() {
  const [faturas, setFaturas] = useState<FaturaConexao[]>([]);
  const [contas, setContas] = useState<ContaConexao[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<number | "">("");
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [including, setIncluding] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function carregarFaturas() {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (periodo) params.set("periodo_referencia", periodo);
      if (contaSelecionada) params.set("conta_conexao_id", String(contaSelecionada));

      const res = await fetch(`/api/financeiro/credito-conexao/faturas?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setFaturas(json.faturas ?? []);
    } catch (e) {
      console.error("Erro ao carregar faturas Credito Conexao", e);
      setErro("Erro ao carregar faturas do Cartao Conexao.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarContas() {
    try {
      const res = await fetch("/api/financeiro/credito-conexao/contas");
      const json = await res.json();
      setContas(json.contas ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    carregarFaturas();
    carregarContas();
  }, []);

  useEffect(() => {
    carregarFaturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, contaSelecionada]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  }

  function formatCurrency(centavos: number) {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function ajustarPeriodo(deltaMes: number) {
    const [anoStr, mesStr] = periodo.split("-").map((v) => Number(v));
    if (!anoStr || !mesStr) return;
    const novaData = new Date(anoStr, mesStr - 1 + deltaMes, 1);
    setPeriodo(novaData.toISOString().slice(0, 7));
  }

  function formatStatus(status: string) {
    switch (status) {
      case "ABERTA":
        return "Aberta";
      case "PAGA":
        return "Paga";
      case "EM_ATRASO":
        return "Em atraso";
      case "CANCELADA":
        return "Cancelada";
      default:
        return status;
    }
  }

  async function incluirPendencias() {
    if (!contaSelecionada) {
      setErro("Selecione uma conta para incluir pendencias.");
      return;
    }
    try {
      setIncluding(true);
      setErro(null);
      const res = await fetch("/api/financeiro/credito-conexao/faturas/incluir-pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conta_conexao_id: Number(contaSelecionada),
          incluir_origens: ["LOJA"],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao incluir pendencias.");
        return;
      }
      await carregarFaturas();
      if (json.fatura_id) {
        router.push(`/admin/financeiro/credito-conexao/faturas/${json.fatura_id}`);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao incluir pendencias.");
    } finally {
      setIncluding(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credito Conexao â€” Faturas</h1>
        <p className="text-sm text-gray-600">
          Visualize as faturas geradas do Cartao Conexao (Aluno/Colaborador), com valores de
          compras, taxas e total consolidado.
        </p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      <div className="border rounded-xl bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Faturas</h2>
              <button
                type="button"
                onClick={carregarFaturas}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Atualizar
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                className="px-2 py-1 rounded-md border text-slate-700 hover:bg-slate-50"
                onClick={() => ajustarPeriodo(-1)}
              >
                ◀ mês anterior
              </button>
              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="border rounded-md px-2 py-1"
              />
              <button
                type="button"
                className="px-2 py-1 rounded-md border text-slate-700 hover:bg-slate-50"
                onClick={() => ajustarPeriodo(1)}
              >
                mês seguinte ▶
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value ? Number(e.target.value) : "")}
              className="text-xs border rounded-md px-2 py-1"
            >
              <option value="">Conta CrÃ©dito ConexÃ£o...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descricao_exibicao || `Conta #${c.id}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={incluirPendencias}
              disabled={including}
              className="text-xs px-3 py-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:opacity-60"
            >
              {including ? "Incluindo..." : "Incluir pendÃªncias (LOJA)"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-600">Carregando faturas...</div>
        ) : faturas.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">Nenhuma fatura cadastrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Conta</th>
                  <th className="px-3 py-2 text-left">PerÃ­odo</th>
                  <th className="px-3 py-2 text-left">Fechamento</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Compras</th>
                  <th className="px-3 py-2 text-right">Taxas</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => {
                  const valorTotal = f.valor_total_centavos;
                  const valorTaxas = f.valor_taxas_centavos ?? 0;
                  const valorCompras = valorTotal - valorTaxas;

                  return (
                    <tr key={f.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/financeiro/credito-conexao/faturas/${f.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {f.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {f.conta?.descricao_exibicao || `Conta #${f.conta_conexao_id}`}
                        </div>
                        {f.conta?.titular?.nome && (
                          <div className="text-xs text-gray-600">
                            {f.conta.titular.nome}
                            {f.conta.titular.cpf ? ` — CPF ${f.conta.titular.cpf}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{f.periodo_referencia}</td>
                      <td className="px-3 py-2">{formatDate(f.data_fechamento)}</td>
                      <td className="px-3 py-2">{formatDate(f.data_vencimento)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(valorCompras)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(valorTaxas)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(valorTotal)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            f.status === "ABERTA"
                              ? "bg-amber-50 text-amber-700"
                              : f.status === "PAGA"
                              ? "bg-emerald-50 text-emerald-700"
                              : f.status === "EM_ATRASO"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {formatStatus(f.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



