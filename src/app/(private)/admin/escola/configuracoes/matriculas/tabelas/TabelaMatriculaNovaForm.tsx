"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldHelp } from "@/components/FieldHelp";

type TurmaOption = {
  id: number;
  label: string;
  anoRef: number | null;
};

export function TabelaMatriculaNovaForm({
  turmas,
  action,
}: {
  turmas: TurmaOption[];
  action: (formData: FormData) => void;
}) {
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [ano, setAno] = useState<string>("");
  const [titulo, setTitulo] = useState<string>("");
  const [touchedTitulo, setTouchedTitulo] = useState(false);

  const turma = useMemo(() => turmas.find((t) => t.id === turmaId) ?? null, [turmas, turmaId]);

  useEffect(() => {
    if (turma?.anoRef && !ano) setAno(String(turma.anoRef));
  }, [turma, ano]);

  useEffect(() => {
    if (!touchedTitulo && turma) {
      const y = ano || (turma.anoRef ? String(turma.anoRef) : "");
      const base = turma.label.replace(/\s*\(ID\s+\d+\)\s*$/i, "");
      setTitulo(y ? `${base} / ${y}` : base);
    }
  }, [turma, ano, touchedTitulo]);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Titulo
          <FieldHelp text="Sugestao automatica: 'Turma / Ano'. Ex.: 'Ballet Infantil / 2026'." />
        </label>
        <input
          name="titulo"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          value={titulo}
          onChange={(e) => {
            setTouchedTitulo(true);
            setTitulo(e.target.value);
          }}
          placeholder="Ex.: Ballet Infantil / 2026"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Produto
            <FieldHelp text="Tipo de matricula. REGULAR exige ano de referencia." />
          </label>
          <select
            name="produto_tipo"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            defaultValue="REGULAR"
          >
            <option value="REGULAR">REGULAR</option>
            <option value="CURSO_LIVRE">CURSO_LIVRE</option>
            <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
          </select>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">
            Turma
            <FieldHelp text="A tabela vale para esta turma (e ano se REGULAR). O ID aparece no final." />
          </label>
          <select
            name="turma_id"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            defaultValue=""
            onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-600">Dica: selecione a turma pelo nome. O sistema sugere ano e titulo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Ano (REGULAR)
            <FieldHelp text="Evita perder historico de valores. Se a turma ja tem ano, ele e sugerido automaticamente." />
          </label>
          <input
            name="ano_referencia"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder="Ex.: 2026"
            inputMode="numeric"
          />
        </div>

        <label className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input name="ativo" type="checkbox" defaultChecked />
          Ativa
          <FieldHelp text="Somente tabelas ativas sao usadas na matricula. Se desativar, matricula falha com 409." />
        </label>
      </div>

      <div className="flex justify-end">
        <button className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow" type="submit">
          Criar tabela
        </button>
      </div>
    </form>
  );
}
