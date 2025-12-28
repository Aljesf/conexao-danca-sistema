"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type AlvoItem = {
  id: number;
  label: string;
};

type Props = {
  tabelaId: number;
  titulo: string;
  anoReferencia: number | null;
  ativo: boolean;
  produtoTipo: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  alvoTipo: AlvoTipo;
  alvosSelecionados: number[];
};

function labelAlvo(tipo: AlvoTipo, row: Record<string, unknown>): AlvoItem {
  if (tipo === "TURMA") {
    const turmaId = Number((row.turma_id ?? row.id) as number);
    const nome = typeof row.nome === "string" && row.nome.trim() ? row.nome : `Turma ${turmaId}`;
    return { id: turmaId, label: `${nome} (ID ${turmaId})` };
  }

  const id = Number(row.id);
  const titulo =
    (typeof row.titulo === "string" && row.titulo.trim()) ||
    (typeof row.nome === "string" && row.nome.trim()) ||
    `Alvo ${id}`;
  return { id, label: `${titulo} (ID ${id})` };
}

export default function TabelaMatriculaEditForm({
  tabelaId,
  titulo: tituloInicial,
  anoReferencia,
  ativo: ativoInicial,
  produtoTipo,
  alvoTipo,
  alvosSelecionados: alvosSelecionadosInicial,
}: Props) {
  const router = useRouter();

  const [titulo, setTitulo] = useState(tituloInicial);
  const [anoRef, setAnoRef] = useState(anoReferencia ? String(anoReferencia) : "");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [alvos, setAlvos] = useState<AlvoItem[]>([]);
  const [alvosSelecionados, setAlvosSelecionados] = useState<number[]>(alvosSelecionadosInicial);
  const [alvosLoading, setAlvosLoading] = useState(false);
  const [alvosErro, setAlvosErro] = useState<string | null>(null);

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
    if (!anoParsed) return "Ano de referencia e obrigatorio.";
    if (alvosSelecionados.length === 0) return "Selecione ao menos 1 alvo.";
    return null;
  }, [titulo, anoParsed, alvosSelecionados]);

  useEffect(() => {
    let ativoFlag = true;
    (async () => {
      try {
        setAlvosErro(null);
        setAlvosLoading(true);
        const res = await fetch(`/api/matriculas/tabelas/alvos?tipo=${alvoTipo}`);
        const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>[]; message?: string };
        if (!ativoFlag) return;
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Falha ao carregar alvos.");
        }
        const items = (json.data ?? []).map((row) => labelAlvo(alvoTipo, row));
        setAlvos(items);
      } catch (e: unknown) {
        if (ativoFlag) setAlvosErro(e instanceof Error ? e.message : "Falha ao carregar alvos.");
      } finally {
        if (ativoFlag) setAlvosLoading(false);
      }
    })();
    return () => {
      ativoFlag = false;
    };
  }, [alvoTipo]);

  function toggleAlvo(id: number) {
    setAlvosSelecionados((old) => {
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
          alvo_tipo: alvoTipo,
          alvo_ids: alvosSelecionados.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
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
        <label className="text-sm font-medium">Aplica-se a</label>
        <select
          value={alvoTipo}
          disabled
          className="border rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500"
        >
          <option value="TURMA">Turma</option>
          <option value="CURSO_LIVRE">Curso livre</option>
          <option value="PROJETO">Projeto</option>
        </select>
        <p className="text-xs text-muted-foreground">Tipo definido no cadastro da tabela.</p>
      </div>

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

        <div className="flex items-center text-xs text-muted-foreground mt-7">Produto: {produtoTipo}</div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Alvos vinculados</label>
        <div className="max-h-56 overflow-y-auto rounded-md border bg-white p-3 space-y-2">
          {alvosLoading ? (
            <div className="text-sm text-muted-foreground">Carregando alvos...</div>
          ) : alvosErro ? (
            <div className="text-sm text-red-600">{alvosErro}</div>
          ) : alvos.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum alvo cadastrado.</div>
          ) : (
            alvos.map((alvo) => (
              <label key={alvo.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={alvosSelecionados.includes(alvo.id)}
                  onChange={() => toggleAlvo(alvo.id)}
                />
                <span>{alvo.label}</span>
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">Selecione um ou mais alvos para vincular a tabela.</p>
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
