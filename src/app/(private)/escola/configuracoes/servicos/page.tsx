"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Servico = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia: number | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
};

type NovoServicoInput = {
  tipo: string;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
};

type EditState = {
  titulo: string;
  ativo: boolean;
};

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `HTTP ${status}`;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error && typeof record.error === "object") {
    const errObj = record.error as Record<string, unknown>;
    if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message;
  }
  return `HTTP ${status}`;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data as T;
}

export default function EscolaConfiguracoesServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [edits, setEdits] = useState<Record<number, EditState>>({});
  const [novoServico, setNovoServico] = useState<NovoServicoInput>({
    tipo: "REGULAR",
    titulo: "",
    ano_referencia: null,
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  async function carregarServicos() {
    setErro(null);
    setLoading(true);
    try {
      const data = await fetchJSON<{ ok: boolean; servicos?: Servico[]; message?: string }>(
        "/api/admin/servicos",
      );
      if (!data.ok) throw new Error(data.message ?? "Falha ao carregar servicos.");
      const lista = data.servicos ?? [];
      setServicos(lista);
      const nextEdits: Record<number, EditState> = {};
      lista.forEach((s) => {
        nextEdits[s.id] = { titulo: s.titulo ?? "", ativo: s.ativo };
      });
      setEdits(nextEdits);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar servicos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarServicos();
  }, []);

  async function criarServico() {
    setErro(null);
    if (!novoServico.titulo.trim()) {
      setErro("Titulo e obrigatorio.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        tipo: novoServico.tipo,
        titulo: novoServico.titulo.trim(),
        ano_referencia: novoServico.ano_referencia,
        ativo: novoServico.ativo,
      };
      const data = await fetchJSON<{ ok: boolean; servico?: Servico; message?: string }>(
        "/api/admin/servicos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok || !data.servico) {
        throw new Error(data.message ?? "Falha ao criar servico.");
      }
      setServicos((prev) => [data.servico as Servico, ...prev]);
      setEdits((prev) => ({
        ...prev,
        [data.servico!.id]: { titulo: data.servico!.titulo ?? "", ativo: data.servico!.ativo },
      }));
      setNovoServico({ tipo: "REGULAR", titulo: "", ano_referencia: null, ativo: true });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar servico.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarServico(id: number) {
    const edit = edits[id];
    if (!edit) return;
    setErro(null);
    setSalvandoId(id);
    try {
      const payload = {
        titulo: edit.titulo.trim(),
        ativo: edit.ativo,
      };
      const data = await fetchJSON<{ ok: boolean; servico?: Servico; message?: string }>(
        `/api/admin/servicos/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok) throw new Error(data.message ?? "Falha ao atualizar servico.");
      if (data.servico) {
        setServicos((prev) => prev.map((s) => (s.id === id ? (data.servico as Servico) : s)));
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar servico.");
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Configuracoes da escola - Servicos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre servicos e mantenha itens e precos associados por turma.
          </p>
        </div>
        <Link className="text-sm text-violet-600 hover:underline" href="/escola/configuracoes/servicos/precos">
          Gerenciar precos
        </Link>
      </div>

      {erro ? <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{erro}</div> : null}

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Novo servico</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-medium">Tipo</label>
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoServico.tipo}
              onChange={(e) => setNovoServico((prev) => ({ ...prev, tipo: e.target.value }))}
              disabled={loading}
            >
              <option value="REGULAR">Regular</option>
              <option value="CURSO_LIVRE">Curso livre</option>
              <option value="PROJETO_ARTISTICO">Projeto artistico</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Titulo</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoServico.titulo}
              onChange={(e) => setNovoServico((prev) => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ex.: Ballet Regular 2026"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Ano referencia</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              type="number"
              min={2000}
              max={2100}
              value={novoServico.ano_referencia ?? ""}
              onChange={(e) =>
                setNovoServico((prev) => ({
                  ...prev,
                  ano_referencia: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={loading}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={novoServico.ativo}
              onChange={(e) => setNovoServico((prev) => ({ ...prev, ativo: e.target.checked }))}
              disabled={loading}
            />
            Ativo
          </label>
          <button
            type="button"
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void criarServico()}
            disabled={loading}
          >
            Criar servico
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => void carregarServicos()}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-semibold">Servicos cadastrados</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Servico</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Ano</th>
                <th className="px-3 py-2 text-left">Ativo</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => {
                const edit = edits[s.id] ?? { titulo: s.titulo ?? "", ativo: s.ativo };
                const vinculo = s.referencia_tipo === "TURMA" ? `Turma ${s.referencia_id ?? "-"}` : "-";
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={edit.titulo}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [s.id]: { ...edit, titulo: e.target.value } }))
                        }
                        disabled={salvandoId === s.id}
                      />
                      <div className="mt-1 text-[11px] text-muted-foreground">Vinculo: {vinculo}</div>
                    </td>
                    <td className="px-3 py-2">{s.tipo}</td>
                    <td className="px-3 py-2">{s.ano_referencia ?? "-"}</td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={edit.ativo}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [s.id]: { ...edit, ativo: e.target.checked } }))
                          }
                          disabled={salvandoId === s.id}
                        />
                        {edit.ativo ? "Sim" : "Nao"}
                      </label>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        onClick={() => void salvarServico(s.id)}
                        disabled={salvandoId === s.id}
                      >
                        {salvandoId === s.id ? "Salvando..." : "Salvar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {servicos.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={5}>
                    Nenhum servico cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {loading ? "Carregando..." : `Total: ${servicos.length}`}
      </div>
    </div>
  );
}
