"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ServicoItem = {
  id: number;
  label: string;
};

type UnidadeExecucaoItem = {
  id: number;
  label: string;
};

type Props = {
  tabelaId: number;
  titulo: string;
  anoReferencia: number | null;
  ativo: boolean;
  servicoTipo: ServicoTipo;
  servicoId: number | null;
  unidadeExecucaoIds: number[];
  variant?: "card" | "plain";
  className?: string;
};

export default function TabelaMatriculaEditForm({
  tabelaId,
  titulo: tituloInicial,
  anoReferencia,
  ativo: ativoInicial,
  servicoTipo,
  servicoId: servicoIdInicial,
  unidadeExecucaoIds,
  variant = "card",
  className,
}: Props) {
  const router = useRouter();

  const [titulo, setTitulo] = useState(tituloInicial);
  const [anoRef, setAnoRef] = useState(anoReferencia ? String(anoReferencia) : "");
  const [ativo, setAtivo] = useState(ativoInicial);

  const [categoria, setCategoria] = useState<ServicoTipo>(servicoTipo);
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [servicosLoading, setServicosLoading] = useState(false);
  const [servicosErro, setServicosErro] = useState<string | null>(null);
  const [servicoId, setServicoId] = useState<number | null>(servicoIdInicial);

  const [unidades, setUnidades] = useState<UnidadeExecucaoItem[]>([]);
  const [unidadesLoading, setUnidadesLoading] = useState(false);
  const [unidadesErro, setUnidadesErro] = useState<string | null>(null);
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<number[]>(unidadeExecucaoIds);
  const [aplicarTodas, setAplicarTodas] = useState(unidadeExecucaoIds.length === 0);

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
    if (categoria === "CURSO_REGULAR" && !anoParsed) return "Ano de referencia e obrigatorio.";
    if (!servicoId) return "Selecione o servico.";
    if (!aplicarTodas && unidades.length > 0 && unidadesSelecionadas.length === 0) {
      return "Selecione ao menos 1 unidade de execucao.";
    }
    return null;
  }, [titulo, categoria, anoParsed, servicoId, aplicarTodas, unidades, unidadesSelecionadas]);

  useEffect(() => {
    let ativoFlag = true;
    (async () => {
      try {
        setServicosErro(null);
        setServicosLoading(true);
        const res = await fetch(`/api/matriculas/tabelas/servicos?tipo=${categoria}`);
        const json = (await res.json()) as { ok?: boolean; data?: ServicoItem[]; message?: string };
        if (!ativoFlag) return;
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Falha ao carregar servicos.");
        }
        const items = (json.data ?? []).map((row) => ({
          id: Number(row.id),
          label: String(row.label),
        }));
        setServicos(items);
        if (!items.some((s) => s.id === servicoId)) {
          setServicoId(null);
          setUnidadesSelecionadas([]);
          setAplicarTodas(false);
        }
      } catch (e: unknown) {
        if (ativoFlag) setServicosErro(e instanceof Error ? e.message : "Falha ao carregar servicos.");
      } finally {
        if (ativoFlag) setServicosLoading(false);
      }
    })();
    return () => {
      ativoFlag = false;
    };
  }, [categoria, servicoId]);

  useEffect(() => {
    let ativoFlag = true;
    (async () => {
      if (!servicoId) {
        setUnidades([]);
        setUnidadesSelecionadas([]);
        setUnidadesLoading(false);
        return;
      }
      try {
        setUnidadesErro(null);
        setUnidadesLoading(true);
        const res = await fetch(`/api/matriculas/tabelas/unidades-execucao?servico_id=${servicoId}`);
        const json = (await res.json()) as { ok?: boolean; data?: UnidadeExecucaoItem[]; message?: string };
        if (!ativoFlag) return;
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Falha ao carregar unidades de execucao.");
        }
        const items = (json.data ?? []).map((row) => ({
          id: Number(row.id),
          label: String(row.label),
        }));
        setUnidades(items);
        setUnidadesSelecionadas((old) => old.filter((id) => items.some((u) => u.id === id)));
      } catch (e: unknown) {
        if (ativoFlag) setUnidadesErro(e instanceof Error ? e.message : "Falha ao carregar unidades de execucao.");
      } finally {
        if (ativoFlag) setUnidadesLoading(false);
      }
    })();
    return () => {
      ativoFlag = false;
    };
  }, [servicoId]);

  function toggleUnidade(id: number) {
    setUnidadesSelecionadas((old) => {
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
          servico_tipo: categoria,
          servico_id: servicoId,
          unidade_execucao_ids: aplicarTodas ? [] : unidadesSelecionadas,
        }),
      });

      const resClone = res.clone();
      let payload: { ok?: boolean; message?: string; details?: unknown } | null = null;
      let rawText: string | null = null;

      try {
        payload = (await res.json()) as { ok?: boolean; message?: string; details?: unknown };
      } catch {
        try {
          rawText = await resClone.text();
        } catch {
          rawText = null;
        }
      }

      if (!res.ok || !payload?.ok) {
        const msg =
          (payload?.message && String(payload.message)) ||
          (rawText
            ? `Falha ao atualizar (HTTP ${res.status}). Resposta: ${rawText.slice(0, 300)}`
            : `Falha ao atualizar (HTTP ${res.status}).`);
        const finalMsg = res.status === 409 ? `Conflito de regra: ${msg}` : msg;
        setErro(finalMsg);
        return;
      }

      setOkMsg("Tabela atualizada com sucesso.");
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao atualizar tabela.");
    } finally {
      setSaving(false);
    }
  }

  const wrapperClass =
    variant === "plain"
      ? `space-y-4 ${className ?? ""}`.trim()
      : `rounded-md border p-4 space-y-4 max-w-4xl ${className ?? ""}`.trim();

  return (
    <div className={wrapperClass}>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Categoria do servico</label>
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value as ServicoTipo);
            setServicoId(null);
            setUnidadesSelecionadas([]);
            setAplicarTodas(false);
          }}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="CURSO_REGULAR">Curso regular</option>
          <option value="CURSO_LIVRE">Curso livre</option>
          <option value="PROJETO_ARTISTICO">Projeto artistico</option>
        </select>
        <p className="text-xs text-muted-foreground">Use a categoria correta para buscar o servico.</p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Servico</label>
        <select
          value={servicoId ?? ""}
          onChange={(e) => setServicoId(e.target.value ? Number(e.target.value) : null)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {servicos.map((servico) => (
            <option key={servico.id} value={servico.id}>
              {servico.label}
            </option>
          ))}
        </select>
        {servicosLoading ? <p className="text-xs text-muted-foreground">Carregando servicos...</p> : null}
        {servicosErro ? <p className="text-xs text-red-600">{servicosErro}</p> : null}
      </div>

      <div className="grid gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aplicarTodas}
            onChange={(e) => {
              setAplicarTodas(e.target.checked);
              if (e.target.checked) setUnidadesSelecionadas([]);
            }}
          />
          Aplicar a todas as unidades de execucao deste servico
        </label>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Unidades de execucao</label>
        <div className="max-h-56 overflow-y-auto rounded-md border bg-white p-3 space-y-2">
          {!servicoId ? (
            <div className="text-sm text-muted-foreground">Selecione um servico para listar unidades.</div>
          ) : unidadesLoading ? (
            <div className="text-sm text-muted-foreground">Carregando unidades...</div>
          ) : unidadesErro ? (
            <div className="text-sm text-red-600">{unidadesErro}</div>
          ) : aplicarTodas ? (
            <div className="text-sm text-muted-foreground">Aplicacao global (todas as unidades).</div>
          ) : unidades.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma unidade de execucao cadastrada.</div>
          ) : (
            unidades.map((unidade) => (
              <label key={unidade.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={unidadesSelecionadas.includes(unidade.id)}
                  onChange={() => toggleUnidade(unidade.id)}
                  disabled={aplicarTodas}
                />
                <span className={aplicarTodas ? "text-slate-400" : undefined}>{unidade.label}</span>
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {aplicarTodas
            ? "Aplicacao global (todas as unidades)."
            : "Selecione uma ou mais unidades para vincular."}
        </p>
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
          <label className="text-sm font-medium">Ano (CURSO REGULAR)</label>
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
