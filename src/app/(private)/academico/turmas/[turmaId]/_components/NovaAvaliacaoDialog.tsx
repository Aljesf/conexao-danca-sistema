"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type NovaAvaliacaoDialogProps = {
  turmaId: number;
  onCreated?: () => void;
};

type ModeloAvaliacao = {
  id: number;
  nome: string;
  tipo_avaliacao?: string | null;
  obrigatoria?: boolean;
};

export function NovaAvaliacaoDialog({ turmaId, onCreated }: NovaAvaliacaoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modelos, setModelos] = useState<ModeloAvaliacao[]>([]);
  const [modeloId, setModeloId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tituloEditado, setTituloEditado] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [obrigatoria, setObrigatoria] = useState(false);
  const [dataPrevista, setDataPrevista] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    async function carregarModelos() {
      const { data, error } = await supabase
        .from("avaliacoes_modelo")
        .select("id, nome, tipo_avaliacao, obrigatoria, ativo")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao carregar modelos de avaliacao:", error);
        return;
      }

      const lista = (data ?? []).map((m) => {
        if (!m || typeof m !== "object") {
          return { id: 0, nome: "Modelo", tipo_avaliacao: null, obrigatoria: false };
        }
        const modelo = m as { id?: number; nome?: string; tipo_avaliacao?: string | null; obrigatoria?: boolean };
        return {
          id: modelo.id ?? 0,
          nome: modelo.nome ?? "Modelo",
          tipo_avaliacao: modelo.tipo_avaliacao ?? null,
          obrigatoria: Boolean(modelo.obrigatoria),
        };
      });
      setModelos(lista);
      if (lista.length > 0) {
        setModeloId(String(lista[0].id));
        setTitulo(lista[0].nome);
        setObrigatoria(Boolean(lista[0].obrigatoria));
      }
    }
    void carregarModelos();
  }, []);

  function handleChangeModelo(id: string) {
    setModeloId(id);
    const modelo = modelos.find((m) => String(m.id) === id);
    if (modelo && !tituloEditado) {
      setTitulo(modelo.nome);
    }
    if (modelo) {
      setObrigatoria(Boolean(modelo.obrigatoria));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const modeloSelecionado = modelos.find((m) => String(m.id) === modeloId);
    if (!modeloSelecionado) {
      setErro("Escolha um modelo de avaliacao.");
      return;
    }
    if (!titulo.trim()) {
      setErro("Informe um titulo.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();

    const payload = {
      turma_id: turmaId,
      avaliacao_modelo_id: modeloSelecionado.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      obrigatoria,
      data_prevista: dataPrevista || null,
      status: "RASCUNHO",
    };

    const { error } = await supabase.from("turma_avaliacoes").insert(payload);
    if (error) {
      console.error("Erro ao criar avaliacao:", error);
      setErro(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setDescricao("");
    setTituloEditado(false);
    setDataPrevista("");
    onCreated?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Nova avaliacao
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <DialogTitle>Nova avaliacao da turma</DialogTitle>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modelo de avaliacao</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={modeloId}
              onChange={(e) => handleChangeModelo(e.target.value)}
            >
              <option value="">Selecione...</option>
              {modelos.map((m) => (
                <option key={`modelo-${m.id}`} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titulo</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTituloEditado(true);
              }}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descricao (opcional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={obrigatoria}
                onChange={(e) => setObrigatoria(e.target.checked)}
              />
              Obrigatoria
            </label>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data prevista</label>
              <input
                type="date"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar avaliacao"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
