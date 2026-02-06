"use client";

import { useEffect, useMemo, useState } from "react";
import { PessoaAutocomplete, type PessoaSugestao } from "@/components/movimento/PessoaAutocomplete";

export type BeneficiarioItem = {
  id: string;
  pessoa_id: number | string;
  status: "EM_ANALISE" | "APROVADO" | "SUSPENSO" | "ENCERRADO";
  relatorio_socioeconomico: string;
  exercicio_ano?: number | null;
  valido_ate?: string | null;
  observacoes?: string | null;
  criado_em: string;
};

type PessoaDetalhe = {
  id: number;
  nome: string;
  email: string | null;
  cpf: string | null;
};

type Props = {
  onSuccess?: (data: BeneficiarioItem) => void;
  compact?: boolean;
  showTitle?: boolean;
};

function parsePessoaDetalhe(payload: unknown): PessoaDetalhe | null {
  const raw = payload as { data?: Record<string, unknown> } | null;
  const data = raw?.data as
    | {
        id?: number | string;
        nome?: string | null;
        email?: string | null;
        cpf?: string | null;
      }
    | undefined;

  if (!data) return null;

  return {
    id: Number(data.id ?? 0),
    nome: String(data.nome ?? ""),
    email: data.email ?? null,
    cpf: data.cpf ?? null,
  };
}

export function CadastrarBeneficiarioForm({ onSuccess, compact, showTitle }: Props) {
  const initialYear = new Date().getFullYear();
  const titleEnabled = showTitle ?? true;

  const [pessoaSel, setPessoaSel] = useState<PessoaSugestao | null>(null);
  const [pessoaDet, setPessoaDet] = useState<PessoaDetalhe | null>(null);

  const [exercicioAno, setExercicioAno] = useState(String(initialYear));
  const [validoAte, setValidoAte] = useState(`${initialYear}-12-31`);
  const [resumo, setResumo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pessoaIdNumber = pessoaSel?.id ? Number(pessoaSel.id) : NaN;
  const canSubmit = Number.isInteger(pessoaIdNumber) && pessoaIdNumber > 0 && !loading;

  const detailBox = useMemo(() => {
    if (!pessoaDet) return null;
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <div className="font-medium">{pessoaDet.nome}</div>
        <div>{pessoaDet.email ?? "-"}</div>
        <div>CPF: {pessoaDet.cpf ?? "-"}</div>
      </div>
    );
  }, [pessoaDet]);

  async function carregarDetalhePessoa(pessoaId: string) {
    const res = await fetch(`/api/pessoas/${pessoaId}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (json as { error?: string; message?: string } | null)?.message;
      throw new Error(message ?? "Falha ao carregar dados da pessoa.");
    }
    const parsed = parsePessoaDetalhe(json);
    if (!parsed) {
      throw new Error("Dados da pessoa indisponiveis.");
    }
    return parsed;
  }

  async function cadastrar() {
    setErro(null);
    setInfo(null);

    if (!pessoaSel?.id) {
      setErro("Selecione uma pessoa.");
      return;
    }

    const pessoaIdPayload = Number(pessoaSel.id);
    if (!Number.isInteger(pessoaIdPayload) || pessoaIdPayload <= 0) {
      setErro("Pessoa invalida.");
      return;
    }

    const exercicioAnoNum = Number(exercicioAno);
    const payload = {
      pessoa_id: pessoaIdPayload,
      resumo_institucional: resumo.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      exercicio_ano:
        exercicioAno.trim().length > 0 && Number.isFinite(exercicioAnoNum)
          ? Math.trunc(exercicioAnoNum)
          : undefined,
      valido_ate: validoAte.trim() || undefined,
    };

    setLoading(true);
    try {
      const res = await fetch("/api/admin/movimento/beneficiarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: BeneficiarioItem;
            message?: string;
            codigo?: string;
            error?: string;
            details?: unknown;
            hint?: unknown;
            code?: unknown;
          }
        | null;

      if (!res.ok || !json?.ok) {
        const details =
          typeof json?.details === "string"
            ? json.details
            : json?.details
              ? JSON.stringify(json.details)
              : null;
        const hint = typeof json?.hint === "string" ? json.hint : null;
        const code = typeof json?.code === "string" ? json.code : null;
        const extra = [details, hint, code].filter(Boolean).join(" | ");
        const msgBase =
          json?.message ??
          json?.error ??
          (json?.codigo ? `Erro: ${json.codigo}` : "Falha ao cadastrar.");
        const msg = extra ? `${msgBase} (${extra})` : msgBase;
        setErro(msg);
        return;
      }

      if (json.data) {
        onSuccess?.(json.data);
        setPessoaSel(null);
        setPessoaDet(null);
        setResumo("");
        setObservacoes("");
        setExercicioAno(String(initialYear));
        setValidoAte(`${initialYear}-12-31`);
      }
      setInfo("Beneficiario cadastrado com sucesso.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    if (!pessoaSel?.id) {
      setPessoaDet(null);
      return;
    }

    setErro(null);
    (async () => {
      try {
        const det = await carregarDetalhePessoa(pessoaSel.id);
        if (alive) setPessoaDet(det);
      } catch (e: unknown) {
        if (!alive) return;
        setPessoaDet(null);
        setErro(e instanceof Error ? e.message : "Falha ao carregar dados da pessoa.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [pessoaSel?.id]);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {titleEnabled ? (
        <div className="text-sm font-semibold text-slate-800">
          Cadastrar beneficiario do Movimento Conexao Banco
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {erro}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {info}
        </div>
      ) : null}

      <PessoaAutocomplete
        label="Pessoa"
        value={pessoaSel}
        onChange={setPessoaSel}
        placeholder="Digite nome, CPF ou email"
      />

      {detailBox}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm">Exercicio (ano)</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            type="number"
            value={exercicioAno}
            onChange={(e) => {
              const value = e.target.value;
              setExercicioAno(value);
              const num = Number(value);
              if (Number.isFinite(num) && String(Math.trunc(num)) === value.trim()) {
                setValidoAte(`${Math.trunc(num)}-12-31`);
              }
            }}
            placeholder={String(initialYear)}
          />
        </div>

        <div>
          <label className="text-sm">Valido ate</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            type="date"
            value={validoAte}
            onChange={(e) => setValidoAte(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm">Resumo institucional</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="text-sm">Observacoes</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setPessoaSel(null);
            setPessoaDet(null);
            setResumo("");
            setObservacoes("");
            setErro(null);
            setInfo(null);
            setExercicioAno(String(initialYear));
            setValidoAte(`${initialYear}-12-31`);
          }}
          disabled={loading}
        >
          Limpar
        </button>

        <button
          type="button"
          className="rounded-md border border-slate-200 bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={cadastrar}
          disabled={!canSubmit}
        >
          {loading ? "Salvando..." : "Cadastrar"}
        </button>
      </div>
    </div>
  );
}
