"use client";

import * as React from "react";
import Link from "next/link";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { PessoaAutocomplete } from "@/components/pessoas/PessoaAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContaTipo = "ALUNO" | "COLABORADOR";

type PessoaTitular = {
  id: number;
  nome: string | null;
  cpf: string | null;
};

type ContaConexaoRow = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: ContaTipo;
  descricao_exibicao?: string | null;
  dia_fechamento: number | null;
  dia_vencimento?: number | null;
  limite_maximo_centavos?: number | null;
  limite_autorizado_centavos?: number | null;
  ativo: boolean;
  created_at?: string | null;
  titular?: PessoaTitular | null;
};

function formatDatePtBr(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatMoneyFromCentavos(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toCentavos(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function CreditoConexaoContasPage(): React.JSX.Element {
  const [contas, setContas] = React.useState<ContaConexaoRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [pessoaTitularId, setPessoaTitularId] = React.useState<number | null>(null);
  const [tipoConta, setTipoConta] = React.useState<ContaTipo>("ALUNO");
  const [descricao, setDescricao] = React.useState<string>("");
  const [diaFechamento, setDiaFechamento] = React.useState<number>(10);
  const [diaVencimento, setDiaVencimento] = React.useState<number>(15);
  const [limiteMax, setLimiteMax] = React.useState<string>("");
  const [limiteAut, setLimiteAut] = React.useState<string>("");
  const [ativa, setAtiva] = React.useState<boolean>(true);

  const loadContas = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financeiro/credito-conexao/contas", { method: "GET" });
      const json = (await res.json()) as { ok?: boolean; contas?: ContaConexaoRow[]; error?: string };
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Erro ao carregar contas.");
      }
      setContas(Array.isArray(json.contas) ? json.contas : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao carregar contas.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadContas();
  }, [loadContas]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!pessoaTitularId) {
      setError("Selecione a pessoa titular.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        pessoa_titular_id: pessoaTitularId,
        tipo_conta: tipoConta,
        descricao_exibicao: descricao.trim() ? descricao.trim() : null,
        dia_fechamento: diaFechamento,
        dia_vencimento: tipoConta === "ALUNO" ? diaVencimento : null,
        limite_maximo_centavos: toCentavos(limiteMax),
        limite_autorizado_centavos: toCentavos(limiteAut),
        ativo: ativa,
      };

      const res = await fetch("/api/financeiro/credito-conexao/contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao salvar conta.");
      }

      setPessoaTitularId(null);
      setTipoConta("ALUNO");
      setDescricao("");
      setDiaFechamento(10);
      setDiaVencimento(15);
      setLimiteMax("");
      setLimiteAut("");
      setAtiva(true);

      await loadContas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinancePageShell
      title="Cr\u00e9dito Conex\u00e3o - Contas"
      subtitle="Cadastre e gerencie contas do Cart\u00e3o Conex\u00e3o (Aluno/Colaborador). Contas s\u00e3o criadas na matr\u00edcula ou manualmente."
      actions={
        <>
          <Button type="button" variant="secondary" onClick={() => void loadContas()} disabled={loading}>
            Atualizar
          </Button>
          <Link href="/admin/pessoas" className="text-sm font-medium text-purple-700 hover:underline">
            Pessoas
          </Link>
        </>
      }
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-800">Contas cadastradas</CardTitle>
              <p className="text-sm text-slate-600">
                {loading ? "Carregando..." : `${contas.length} conta(s)`}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Titular</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Fechamento</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Limite m\u00e1x.</th>
                  <th className="px-3 py-2 text-left">Limite aut.</th>
                  <th className="px-3 py-2 text-left">Criada em</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">A\u00e7\u00f5es</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : contas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma conta encontrada.
                    </td>
                  </tr>
                ) : (
                  contas.map((c) => {
                    const nome = c.titular?.nome?.trim() || "(Sem nome)";
                    const cpfFmt = formatCpf(c.titular?.cpf ?? null);

                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{c.id}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{nome}</span>
                            <span className="text-xs text-slate-500">
                              Pessoa ID: {c.pessoa_titular_id}
                              {cpfFmt ? ` \u2022 CPF: ${cpfFmt}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{c.tipo_conta}</td>
                        <td className="px-3 py-2">
                          {c.dia_fechamento ? `dia ${c.dia_fechamento}` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {c.dia_vencimento ? `dia ${c.dia_vencimento}` : "-"}
                        </td>
                        <td className="px-3 py-2">{formatMoneyFromCentavos(c.limite_maximo_centavos)}</td>
                        <td className="px-3 py-2">
                          {formatMoneyFromCentavos(c.limite_autorizado_centavos)}
                        </td>
                        <td className="px-3 py-2">{formatDatePtBr(c.created_at)}</td>
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
                        <td className="px-3 py-2 text-right">
                          <Link
                            className="text-sm font-medium text-purple-700 hover:underline"
                            href={`/admin/financeiro/credito-conexao/contas/${c.id}`}
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Nova conta de Cr\u00e9dito Conex\u00e3o</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Pessoa titular</label>
              <PessoaAutocomplete
                valuePessoaId={pessoaTitularId}
                onChangePessoaId={setPessoaTitularId}
                createHref="/admin/pessoas/nova"
              />
              <p className="text-xs text-slate-500">
                Busque pelo nome ou CPF. Se n\u00e3o existir, crie a pessoa antes de cadastrar a conta.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Tipo de conta</label>
                <select
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={tipoConta}
                  onChange={(e) => setTipoConta(e.target.value as ContaTipo)}
                >
                  <option value="ALUNO">Cart\u00e3o Conex\u00e3o Aluno</option>
                  <option value="COLABORADOR">Cart\u00e3o Conex\u00e3o Colaborador</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Descri\u00e7\u00e3o exibida (opcional)</label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Dia de fechamento</label>
                <Input
                  inputMode="numeric"
                  value={String(diaFechamento)}
                  onChange={(e) => setDiaFechamento(Number(e.target.value || "0"))}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Dia de vencimento (Aluno)</label>
                <Input
                  inputMode="numeric"
                  value={String(diaVencimento)}
                  onChange={(e) => setDiaVencimento(Number(e.target.value || "0"))}
                  disabled={tipoConta !== "ALUNO"}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Limite m\u00e1ximo (R$)</label>
                <Input value={limiteMax} onChange={(e) => setLimiteMax(e.target.value)} placeholder="Ex.: 500,00" />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Limite autorizado (R$)</label>
                <Input value={limiteAut} onChange={(e) => setLimiteAut(e.target.value)} placeholder="Ex.: 500,00" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
              Conta ativa
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar conta"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setPessoaTitularId(null);
                  setDescricao("");
                  setLimiteMax("");
                  setLimiteAut("");
                  setAtiva(true);
                }}
              >
                Limpar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </FinancePageShell>
  );
}
