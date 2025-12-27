"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TurmaOption = {
  id: number;
  label: string;
  anoRef: number | null;
};

type Props = {
  turmas: TurmaOption[];
};

type NovoItem = {
  idTemp: string;
  codigo: string;
  descricao: string;
  tipo: "RECORRENTE" | "UNICO";
  valorReais: string;
  ativo: boolean;
  ordem: number;
};

function toCents(input: string): number | null {
  const raw = input.replace(/\s/g, "").replace(".", "").replace(",", ".");
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function TabelaMatriculaNovaForm({ turmas }: Props) {
  const router = useRouter();

  const [titulo, setTitulo] = useState("");
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [ativo, setAtivo] = useState(true);
  const [observacoes, setObservacoes] = useState("");
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<number[]>([]);

  const [itens, setItens] = useState<NovoItem[]>([
    {
      idTemp: uid(),
      codigo: "MENSALIDADE",
      descricao: "Mensalidade",
      tipo: "RECORRENTE",
      valorReais: "",
      ativo: true,
      ordem: 1,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const produtoTipo: "REGULAR" = "REGULAR";

  const anoParsed = useMemo(() => {
    if (!anoReferencia.trim()) return null;
    const n = Number(anoReferencia);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2000 || n > 2100) return null;
    return n;
  }, [anoReferencia]);

  const validacao = useMemo(() => {
    if (!titulo.trim()) return "Informe o titulo da tabela.";
    if (turmasSelecionadas.length === 0) return "Selecione ao menos 1 turma.";
    if (produtoTipo === "REGULAR" && !anoParsed) return "Ano de referencia e obrigatorio para REGULAR.";
    if (itens.length === 0) return "Inclua pelo menos 1 item.";
    for (const item of itens) {
      if (!item.codigo.trim()) return "Todo item precisa de codigo (ex.: MENSALIDADE).";
      const cents = toCents(item.valorReais);
      if (cents === null) return `Valor invalido para o item ${item.codigo}.`;
    }
    return null;
  }, [titulo, turmasSelecionadas, produtoTipo, anoParsed, itens]);

  function toggleTurma(id: number) {
    setTurmasSelecionadas((old) => {
      const set = new Set(old);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function addItem() {
    setItens((old) => [
      ...old,
      {
        idTemp: uid(),
        codigo: "",
        descricao: "",
        tipo: "RECORRENTE",
        valorReais: "",
        ativo: true,
        ordem: old.length + 1,
      },
    ]);
  }

  function removeItem(idTemp: string) {
    setItens((old) => old.filter((i) => i.idTemp !== idTemp));
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

      const itemsPayload = itens.map((i) => ({
        codigo: i.codigo.trim().toUpperCase(),
        tipo: i.tipo,
        descricao: i.descricao.trim() || null,
        valor_centavos: toCents(i.valorReais) ?? 0,
        ordem: i.ordem,
        ativo: i.ativo,
      }));

      const res = await fetch("/api/matriculas/tabelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          ano_referencia: anoParsed,
          produto_tipo: produtoTipo,
          ativo,
          observacoes: observacoes || null,
          turma_ids: turmasSelecionadas,
          itens: itemsPayload,
        }),
      });

      let payload: { ok?: boolean; data?: { id: number }; message?: string } | null = null;
      try {
        payload = (await res.json()) as { ok?: boolean; data?: { id: number }; message?: string };
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || "Falha ao criar tabela.");
      }

      setOkMsg(`Tabela criada com sucesso (ID ${payload.data?.id}).`);
      if (payload?.data?.id) {
        router.push(`/admin/escola/configuracoes/matriculas/tabelas/${payload.data.id}`);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro inesperado ao criar tabela.";
      setErro(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-violet-100/70 bg-white/95 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Tabela de precos (Escola)</h2>
        <p className="text-sm text-slate-600">
          Define apenas itens e valores. Nao define parcelamento, pro-rata, forma de liquidacao ou regras de pagamento.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Titulo</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Ex.: Ballet Regular 2026 - Infantil"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Ano de referencia</label>
          <input
            value={anoReferencia}
            onChange={(e) => setAnoReferencia(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Ex.: 2026"
          />
          <p className="text-xs text-slate-500">Obrigatorio para tabelas REGULAR.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Tabela ativa
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Turmas vinculadas</label>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
            {turmas.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma turma cadastrada.</div>
            ) : (
              turmas.map((turma) => (
                <label key={turma.id} className="flex items-start gap-2 text-sm text-slate-700">
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
          <p className="text-xs text-slate-500">Selecione uma ou mais turmas para reutilizar a tabela.</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Observacoes</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Itens</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
          >
            Adicionar item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {itens.map((item) => (
            <div key={item.idTemp} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Codigo</label>
                <input
                  value={item.codigo}
                  onChange={(e) =>
                    setItens((old) =>
                      old.map((x) => (x.idTemp === item.idTemp ? { ...x, codigo: e.target.value } : x)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  placeholder="MENSALIDADE"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo</label>
                <select
                  value={item.tipo}
                  onChange={(e) =>
                    setItens((old) =>
                      old.map((x) =>
                        x.idTemp === item.idTemp ? { ...x, tipo: e.target.value as "RECORRENTE" | "UNICO" } : x,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                >
                  <option value="RECORRENTE">RECORRENTE</option>
                  <option value="UNICO">UNICO</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Descricao</label>
                <input
                  value={item.descricao}
                  onChange={(e) =>
                    setItens((old) =>
                      old.map((x) => (x.idTemp === item.idTemp ? { ...x, descricao: e.target.value } : x)),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  placeholder="Mensalidade"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Valor (R$)</label>
                <input
                  value={item.valorReais}
                  onChange={(e) =>
                    setItens((old) =>
                      old.map((x) => (x.idTemp === item.idTemp ? { ...x, valorReais: e.target.value } : x)),
                    )
                  }
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  placeholder="150,00"
                />
              </div>

              <div className="md:col-span-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Ordem</label>
                <input
                  value={String(item.ordem)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setItens((old) =>
                      old.map((x) =>
                        x.idTemp === item.idTemp ? { ...x, ordem: Number.isFinite(n) ? n : x.ordem } : x,
                      ),
                    );
                  }}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                />
              </div>

              <div className="flex items-end justify-between gap-3 md:col-span-12">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.ativo}
                    onChange={(e) =>
                      setItens((old) =>
                        old.map((x) => (x.idTemp === item.idTemp ? { ...x, ativo: e.target.checked } : x)),
                      )
                    }
                  />
                  Ativo
                </label>

                <button type="button" onClick={() => removeItem(item.idTemp)} className="text-xs font-medium text-rose-600">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {erro && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {erro}
        </div>
      )}
      {okMsg && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {okMsg}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSalvar}
          disabled={saving}
          className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
        >
          {saving ? "Salvando..." : "Criar tabela"}
        </button>
      </div>
    </div>
  );
}
