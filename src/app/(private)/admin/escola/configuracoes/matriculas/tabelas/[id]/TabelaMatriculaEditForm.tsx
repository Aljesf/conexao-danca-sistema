"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TurmaOption = {
  id: number;
  label: string;
};

type Props = {
  tabelaId: number;
  titulo: string;
  anoReferencia: number | null;
  ativo: boolean;
  produtoTipo: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  turmas: TurmaOption[];
  turmasSelecionadas: number[];
};

export default function TabelaMatriculaEditForm({
  tabelaId,
  titulo: tituloInicial,
  anoReferencia,
  ativo: ativoInicial,
  produtoTipo,
  turmas,
  turmasSelecionadas: turmasSelecionadasInicial,
}: Props) {
  const router = useRouter();

  const [titulo, setTitulo] = useState(tituloInicial);
  const [anoRef, setAnoRef] = useState(anoReferencia ? String(anoReferencia) : "");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>(turmasSelecionadasInicial);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const anoParsed = useMemo(() => {
    if (!anoRef.trim()) return null;
    const n = Number(anoRef);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2000 || n > 2100) return null;
    return n;
  }, [anoRef]);

  const validacao = useMemo(() => {
    if (!titulo.trim()) return "Informe o titulo da tabela.";
    if (turmasSelecionadas.length === 0) return "Selecione ao menos 1 turma.";
    if (produtoTipo === "REGULAR" && !anoParsed) return "Ano de referencia e obrigatorio para REGULAR.";
    return null;
  }, [titulo, turmasSelecionadas, produtoTipo, anoParsed]);

  function toggleTurma(id: number) {
    setTurmasSelecionadas((old) => {
      const set = new Set(old);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  async function handleSalvar() {
    setErro(null);
    setOkMsg(null);

    const msg = validacao;
    if (msg) {
      setErro(msg);
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/matriculas/tabelas/${tabelaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          ano_referencia: anoParsed,
          ativo,
          turma_ids: turmasSelecionadas,
        }),
      });

      let payload: { ok?: boolean; message?: string } | null = null;
      try {
        payload = (await res.json()) as { ok?: boolean; message?: string };
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || "Falha ao atualizar tabela.");
      }

      setOkMsg("Tabela atualizada com sucesso.");
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao atualizar tabela.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border p-4 space-y-4 max-w-4xl">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Titulo</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">Sugestao: inclua curso/turma/ano para facilitar busca.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Ano (REGULAR)</label>
          <input
            value={anoRef}
            onChange={(e) => setAnoRef(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
            type="number"
          />
        </div>

        <label className="flex items-center gap-2 text-sm mt-7">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativa
        </label>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Turmas vinculadas</label>
        <div className="max-h-56 overflow-y-auto rounded-md border bg-white p-3 space-y-2">
          {turmas.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</div>
          ) : (
            turmas.map((turma) => (
              <label key={turma.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={turmasSelecionadas.includes(turma.id)}
                  onChange={() => toggleTurma(turma.id)}
                />
                <span>{turma.label}</span>
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">Selecione uma ou mais turmas para vincular a tabela.</p>
      </div>

      {erro ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div> : null}
      {okMsg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{okMsg}</div>
      ) : null}

      <div className="flex justify-end">
        <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="button" onClick={handleSalvar}>
          {saving ? "Salvando..." : "Salvar tabela"}
        </button>
      </div>
    </div>
  );
}
