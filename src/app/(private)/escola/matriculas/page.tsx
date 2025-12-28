"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MatriculaListaItem = {
  id: number;
  pessoa_id: number;
  responsavel_id: number | null;
  aluno_nome: string;
  responsavel_nome: string | null;
  ano_referencia: number | null;
  status: string | null;
  servico_id: number | null;
  servico_nome: string | null;
  unidade_execucao_id: number | null;
  unidade_execucao_label: string | null;
  created_at: string | null;
};

type MatriculasResp = {
  items: MatriculaListaItem[];
  error?: string;
  message?: string;
};

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
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

function formatDateTimePtBr(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function shortUnidadeExecucaoLabel(label?: string | null): string {
  if (!label) return "-";
  const base = label.split("[")[0]?.trim() ?? label.trim();
  const withoutPrefix = base.replace(/^Turma:\s*/i, "").replace(/^Grupo\/Coreografia:\s*/i, "").trim();
  const parts = withoutPrefix.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return withoutPrefix || label;
  const [curso, nivel, turno, dias] = parts;
  const turnoLabel = turno ? ` — ${turno}` : "";
  const diasLabel = dias ? ` (${dias})` : "";
  return `${curso} - ${nivel}${turnoLabel}${diasLabel}`;
}

function statusBadgeClasses(status?: string | null): string {
  const normalized = (status || "").toUpperCase();
  if (normalized === "ATIVA") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (normalized === "TRANCADA") return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized === "CANCELADA") return "bg-rose-100 text-rose-800 border-rose-200";
  if (normalized === "CONCLUIDA") return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export const dynamic = "force-dynamic";

export default function EscolaMatriculasPage() {
  const anoAtual = useMemo(() => new Date().getFullYear(), []);
  const [ano, setAno] = useState<number>(anoAtual);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [items, setItems] = useState<MatriculaListaItem[]>([]);

  useEffect(() => {
    let ativo = true;
    const controller = new AbortController();
    const debounceId = window.setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setErro(null);
          const params = new URLSearchParams({ ano: String(ano) });
          if (query.trim()) params.set("query", query.trim());
          const data = await fetchJSON<MatriculasResp>(`/api/escola/matriculas?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!ativo) return;
          setItems(data.items ?? []);
        } catch (e: unknown) {
          if (!ativo) return;
          const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
          if (name === "AbortError") return;
          setErro(e instanceof Error ? e.message : "Falha ao carregar matriculas.");
        } finally {
          if (ativo) setLoading(false);
        }
      })();
    }, 400);

    return () => {
      ativo = false;
      controller.abort();
      window.clearTimeout(debounceId);
    };
  }, [ano, query]);

  const resumoServicos = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const nome = item.servico_nome?.trim() || "-";
      map.set(nome, (map.get(nome) ?? 0) + 1);
    });
    const ordenado = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top = ordenado.slice(0, 5);
    const restantes = ordenado.length - top.length;
    return { total: items.length, top, restantes };
  }, [items]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Matriculas (Escola)</h1>
          <p className="text-sm text-muted-foreground">
            Lista operacional para validar servico, unidade de execucao e status da matricula.
          </p>
        </div>
        <Link
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
          href="/escola/matriculas/nova"
        >
          Nova matricula
        </Link>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Ano</label>
            <input
              type="number"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={ano}
              min={2000}
              max={2100}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Busca</label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Nome do aluno ou responsavel"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border px-3 py-1 text-xs">
            Total no ano: <span className="font-semibold">{resumoServicos.total}</span>
          </span>
          {resumoServicos.top.map(([nome, qtd]) => (
            <span key={nome} className="rounded-full border px-3 py-1 text-xs bg-slate-50">
              {nome}: <span className="font-semibold">{qtd}</span>
            </span>
          ))}
          {resumoServicos.restantes > 0 ? (
            <span className="rounded-full border px-3 py-1 text-xs bg-slate-50">
              +{resumoServicos.restantes} servicos
            </span>
          ) : null}
        </div>
        {erro ? <div className="text-sm text-red-600">{erro}</div> : null}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 text-sm border-b">
          <span className="font-medium">Matriculas encontradas</span>
          {loading ? <span className="text-muted-foreground">Carregando...</span> : null}
        </div>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {loading ? "Buscando matriculas..." : "Nenhuma matricula encontrada para os filtros atuais."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Aluno</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Responsavel</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Curso/Servico</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Turma/UE</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Ano</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Criada em</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{item.id}</td>
                    <td className="px-4 py-2">{item.aluno_nome}</td>
                    <td className="px-4 py-2">{item.responsavel_nome ?? "—"}</td>
                    <td className="px-4 py-2">{item.servico_nome ?? "—"}</td>
                    <td className="px-4 py-2" title={item.unidade_execucao_label ?? ""}>
                      {shortUnidadeExecucaoLabel(item.unidade_execucao_label)}
                    </td>
                    <td className="px-4 py-2">{item.ano_referencia ?? "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusBadgeClasses(item.status)}`}>
                        {item.status ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{formatDateTimePtBr(item.created_at)}</td>
                    <td className="px-4 py-2">
                      <Link className="text-sm text-indigo-600 hover:underline" href={`/escola/matriculas/${item.id}`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
