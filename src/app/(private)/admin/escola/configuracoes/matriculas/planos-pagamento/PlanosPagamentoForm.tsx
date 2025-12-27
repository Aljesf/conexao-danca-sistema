"use client";

import { useEffect, useState } from "react";
import { FieldHelp } from "@/components/FieldHelp";

type Periodicidade = "MENSAL" | "AVISTA" | "PARCELADO";

function normalizeTitleFrom(periodicidade: Periodicidade, parcelas: number) {
  if (periodicidade === "MENSAL") return "Mensal (Cartao Conexao)";
  if (periodicidade === "AVISTA") return "A vista (Pagamento direto)";
  return `Parcelado ${parcelas}x (Cartao Conexao)`;
}

export function PlanosPagamentoForm({
  mode,
  initial,
  action,
  submitLabel,
}: {
  mode: "create" | "edit";
  initial?: {
    titulo?: string;
    descricao?: string | null;
    periodicidade?: Periodicidade;
    numero_parcelas?: number;
    permite_prorata?: boolean;
    ativo?: boolean;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(initial?.periodicidade ?? "MENSAL");
  const [parcelas, setParcelas] = useState<number>(initial?.numero_parcelas ?? 1);
  const [titulo, setTitulo] = useState<string>(initial?.titulo ?? "");
  const [touchedTitulo, setTouchedTitulo] = useState(false);

  useEffect(() => {
    if (periodicidade !== "PARCELADO") setParcelas(1);
  }, [periodicidade]);

  useEffect(() => {
    if (!touchedTitulo) {
      setTitulo(normalizeTitleFrom(periodicidade, periodicidade === "PARCELADO" ? parcelas : 1));
    }
  }, [periodicidade, parcelas, touchedTitulo]);

  const helpPeriodicidade =
    "Define o tipo do plano. Ex.: MENSAL = recorrencia mensal; AVISTA = pagamento unico; PARCELADO = uma cobranca dividida em N vezes (ex.: anuidade 12x).";
  const helpParcelas =
    "So aparece quando o plano e PARCELADO. Ex.: 12 = 12x. Para MENSAL e AVISTA, o sistema usa 1 automaticamente.";
  const helpProrata =
    "Se marcado, o plano permite pro-rata quando a matricula ocorre apos o corte. Ex.: aluno entra dia 20 -> cobra entrada proporcional.";
  const helpTitulo =
    "Nome para voce reconhecer rapidamente na lista. O sistema sugere automaticamente. Ex.: 'Mensal (Cartao Conexao)'.";

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Titulo
          <FieldHelp text={helpTitulo} />
        </label>
        <input
          name="titulo"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          value={titulo}
          onChange={(e) => {
            setTouchedTitulo(true);
            setTitulo(e.target.value);
          }}
          placeholder="Ex.: Mensal (Cartao Conexao)"
        />
        <p className="text-xs text-slate-600">Sugestao automatica: voce pode aceitar ou editar.</p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Descricao (opcional)
          <FieldHelp text="Use para regras internas curtas. Ex.: 'Padrao para alunos regulares'." />
        </label>
        <textarea
          name="descricao"
          defaultValue={initial?.descricao ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          rows={3}
          placeholder="Ex.: Plano padrao para mensalidade."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Periodicidade
            <FieldHelp text={helpPeriodicidade} />
          </label>
          <select
            name="periodicidade"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            value={periodicidade}
            onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}
          >
            <option value="MENSAL">MENSAL</option>
            <option value="AVISTA">AVISTA</option>
            <option value="PARCELADO">PARCELADO</option>
          </select>
        </div>

        {periodicidade === "PARCELADO" ? (
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Numero de parcelas
              <FieldHelp text={helpParcelas} />
            </label>
            <input
              name="numero_parcelas"
              type="number"
              min={1}
              max={36}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value || 1))}
            />
            <p className="text-xs text-slate-600">Ex.: 12 = 12x.</p>
          </div>
        ) : (
          <input type="hidden" name="numero_parcelas" value="1" />
        )}

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Permite pro-rata
            <FieldHelp text={helpProrata} />
          </label>
          <label className="mt-1 inline-flex items-center gap-2 text-sm text-slate-700">
            <input name="permite_prorata" type="checkbox" defaultChecked={initial?.permite_prorata ?? true} />
            Sim
          </label>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input name="ativo" type="checkbox" defaultChecked={initial?.ativo ?? true} />
        Plano ativo
        <FieldHelp text="Se desativado, nao aparece para selecao na matricula." />
      </label>

      <div className="flex justify-end">
        <button className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
