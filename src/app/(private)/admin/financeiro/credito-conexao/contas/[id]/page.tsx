"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

function centavosToInput(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return (v / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toCentavos(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function CreditoConexaoContaDetailPage(): React.JSX.Element {
  const params = useParams();
  const rawId = params?.id;
  const contaId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conta, setConta] = React.useState<ContaConexaoRow | null>(null);

  const [tipoConta, setTipoConta] = React.useState<ContaTipo>("ALUNO");
  const [descricao, setDescricao] = React.useState<string>("");
  const [diaFechamento, setDiaFechamento] = React.useState<number>(10);
  const [diaVencimento, setDiaVencimento] = React.useState<number>(15);
  const [limiteMax, setLimiteMax] = React.useState<string>("");
  const [limiteAut, setLimiteAut] = React.useState<string>("");
  const [ativa, setAtiva] = React.useState<boolean>(true);

  const loadConta = React.useCallback(async (): Promise<void> => {
    if (!Number.isFinite(contaId)) {
      setError("Conta inv\u00e1lida.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/financeiro/credito-conexao/contas", { method: "GET" });
      const json = (await res.json()) as { ok?: boolean; contas?: ContaConexaoRow[]; error?: string };
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Erro ao carregar conta.");
      }

      const found = (json.contas ?? []).find((c) => c.id === contaId) ?? null;
      if (!found) {
        setConta(null);
        setError("Conta n\u00e3o encontrada.");
        return;
      }

      setConta(found);
      setTipoConta(found.tipo_conta);
      setDescricao(found.descricao_exibicao ?? "");
      setDiaFechamento(found.dia_fechamento ?? 10);
      setDiaVencimento(found.dia_vencimento ?? 15);
      setLimiteMax(centavosToInput(found.limite_maximo_centavos ?? null));
      setLimiteAut(centavosToInput(found.limite_autorizado_centavos ?? null));
      setAtiva(Boolean(found.ativo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao carregar conta.");
      setConta(null);
    } finally {
      setLoading(false);
    }
  }, [contaId]);

  React.useEffect(() => {
    void loadConta();
  }, [loadConta]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!conta) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        id: conta.id,
        pessoa_titular_id: conta.pessoa_titular_id,
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

      await loadConta();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  }

  const titularNome = conta?.titular?.nome?.trim() || "(Sem nome)";
  const cpfFmt = formatCpf(conta?.titular?.cpf ?? null);

  return (
    <FinancePageShell
      title={`Conta #${Number.isFinite(contaId) ? contaId : "-"}`}
      subtitle="Detalhes e ajustes da conta do Cart\u00e3o Conex\u00e3o."
      actions={
        <Link href="/admin/financeiro/credito-conexao/contas" className="text-sm font-medium text-purple-700 hover:underline">
          Voltar para contas
        </Link>
      }
    >
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Identifica\u00e7\u00e3o</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Carregando...</div>
          ) : conta ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Conta ID</p>
                <p className="text-sm font-semibold text-slate-800">{conta.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Criada em</p>
                <p className="text-sm text-slate-800">{formatDatePtBr(conta.created_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Titular</p>
                <p className="text-sm font-semibold text-slate-800">{titularNome}</p>
                <p className="text-xs text-slate-500">
                  Pessoa ID: {conta.pessoa_titular_id}
                  {cpfFmt ? ` \u2022 CPF: ${cpfFmt}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Tipo</p>
                <p className="text-sm text-slate-800">{conta.tipo_conta}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Configura\u00e7\u00f5es</CardTitle>
        </CardHeader>
        <CardContent>
          {conta ? (
            <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
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
                  <label className="text-sm font-medium text-slate-700">Descri\u00e7\u00e3o exibida</label>
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

              <CardFooter className="px-0">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar altera\u00e7\u00f5es"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void loadConta()} disabled={saving}>
                  Recarregar
                </Button>
              </CardFooter>
            </form>
          ) : (
            <div className="text-sm text-slate-600">Nenhuma conta para editar.</div>
          )}
        </CardContent>
      </Card>
    </FinancePageShell>
  );
}
