"use client";

import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CONTEXTOS_CONFIG } from "@/config/contextosConfig";
import {
  SUPORTE_BADGE_CLASS,
  SUPORTE_PRIORIDADE_LABEL,
  SUPORTE_STATUS_LABEL,
  SUPORTE_TICKET_PRIORIDADES,
  SUPORTE_TICKET_STATUS,
  SUPORTE_TICKET_TIPOS,
  SUPORTE_TIPO_LABEL,
  type SuporteTicketResumo,
} from "@/lib/suporte/constants";

type ApiListResponse = {
  ok: boolean;
  items?: SuporteTicketResumo[];
  error?: string;
};

function resumirUuid(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function escapeCsv(value: unknown) {
  const normalized =
    typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  const safe = normalized.replace(/"/g, '""');
  return `"${safe}"`;
}

function baixarArquivo(nome: string, conteudo: string, mimeType: string) {
  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = nome;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof SUPORTE_BADGE_CLASS;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SUPORTE_BADGE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

export default function SuporteUsuarioPageClient() {
  const [items, setItems] = useState<SuporteTicketResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [contextoSlug, setContextoSlug] = useState("");
  const [exporting, setExporting] = useState<"" | "csv" | "json">("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (status) params.set("status", status);
    if (prioridade) params.set("prioridade", prioridade);
    if (contextoSlug) params.set("contexto_slug", contextoSlug);

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/suporte/tickets?${params.toString()}`)
      .then(async (response) => {
        const json = (await response.json().catch(() => null)) as ApiListResponse | null;
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "falha_listar_tickets");
        }
        return json.items ?? [];
      })
      .then((data) => {
        if (!active) return;
        setItems(data);
      })
      .catch((fetchError) => {
        if (!active) return;
        setItems([]);
        setError(fetchError instanceof Error ? fetchError.message : "falha_listar_tickets");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tipo, status, prioridade, contextoSlug]);

  const resumo = useMemo(() => {
    const abertos = items.filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status)).length;
    const criticos = items.filter((item) => item.prioridade === "CRITICA").length;
    const erros = items.filter((item) => item.tipo === "ERRO_SISTEMA").length;
    return { total: items.length, abertos, criticos, erros };
  }, [items]);

  async function exportarTickets(formato: "csv" | "json") {
    setExporting(formato);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      params.set("include_tecnicos", "1");
      if (tipo) params.set("tipo", tipo);
      if (status) params.set("status", status);
      if (prioridade) params.set("prioridade", prioridade);
      if (contextoSlug) params.set("contexto_slug", contextoSlug);

      const response = await fetch(`/api/suporte/tickets?${params.toString()}`);
      const json = (await response.json().catch(() => null)) as ApiListResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "falha_exportar_tickets");
      }

      const exportItems = json.items ?? [];
      if (formato === "json") {
        baixarArquivo(
          `suporte-tickets-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(exportItems, null, 2),
          "application/json;charset=utf-8",
        );
        return;
      }

      const linhas = [
        [
          "codigo",
          "tipo",
          "status",
          "prioridade",
          "contexto",
          "descricao",
          "created_at",
          "resolved_at",
          "dados_tecnicos_json",
        ].join(","),
        ...exportItems.map((item) =>
          [
            escapeCsv(item.codigo ?? ""),
            escapeCsv(item.tipo),
            escapeCsv(item.status),
            escapeCsv(item.prioridade),
            escapeCsv(item.contexto_nome ?? item.contexto_slug ?? ""),
            escapeCsv(item.descricao),
            escapeCsv(item.created_at),
            escapeCsv(item.resolved_at ?? ""),
            escapeCsv(item.dados_tecnicos_json ?? {}),
          ].join(","),
        ),
      ];

      baixarArquivo(
        `suporte-tickets-${new Date().toISOString().slice(0, 10)}.csv`,
        linhas.join("\n"),
        "text/csv;charset=utf-8",
      );
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "falha_exportar_tickets");
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_35%),linear-gradient(180deg,#f8fffe_0%,#ffffff_100%)] px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                <LifeBuoy className="h-3.5 w-3.5" />
                Suporte ao Usuario
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Tickets e acompanhamento operacional</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Painel institucional para chamados abertos pelo botao flutuante de suporte. Aqui ficam listados erros do sistema e melhorias sugeridas, com filtro por contexto, prioridade e etapa de tratamento.
                </p>
              </div>
            </div>

            <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Tickets</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{resumo.total}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Em aberto</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{resumo.abertos}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Criticos</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{resumo.criticos}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Erros</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{resumo.erros}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
              >
                <option value="">Todos</option>
                {SUPORTE_TICKET_TIPOS.map((option) => (
                  <option key={option} value={option}>
                    {SUPORTE_TIPO_LABEL[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
              >
                <option value="">Todos</option>
                {SUPORTE_TICKET_STATUS.map((option) => (
                  <option key={option} value={option}>
                    {SUPORTE_STATUS_LABEL[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Prioridade</label>
              <select
                value={prioridade}
                onChange={(event) => setPrioridade(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
              >
                <option value="">Todas</option>
                {SUPORTE_TICKET_PRIORIDADES.map((option) => (
                  <option key={option} value={option}>
                    {SUPORTE_PRIORIDADE_LABEL[option]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Contexto</label>
              <select
                value={contextoSlug}
                onChange={(event) => setContextoSlug(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-300"
              >
                <option value="">Todos</option>
                {CONTEXTOS_CONFIG.map((contexto) => (
                  <option key={contexto.key} value={contexto.href.replace(/^\//, "")}>
                    {contexto.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportarTickets("csv")}
              disabled={Boolean(exporting)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "csv" ? "Exportando CSV..." : "Exportar tickets CSV"}
            </button>
            <button
              type="button"
              onClick={() => void exportarTickets("json")}
              disabled={Boolean(exporting)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "json" ? "Exportando JSON..." : "Exportar tickets JSON"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Ticket</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Prioridade</th>
                  <th className="px-4 py-4">Contexto</th>
                  <th className="px-4 py-4">Responsavel</th>
                  <th className="px-4 py-4">Criado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      Carregando tickets...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-8 text-rose-600" colSpan={7}>
                      {error}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      Nenhum ticket encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <Link href={`/suporte-usuario/ticket/${item.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
                          {item.codigo || `Ticket #${item.id}`}
                        </Link>
                        <div className="mt-1 max-w-xl text-slate-600">
                          {item.titulo || item.descricao.slice(0, 120)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={SUPORTE_TIPO_LABEL[item.tipo]} tone={item.tipo === "ERRO_SISTEMA" ? "CRITICA" : "MEDIA"} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={SUPORTE_STATUS_LABEL[item.status]} tone={item.status} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={SUPORTE_PRIORIDADE_LABEL[item.prioridade]} tone={item.prioridade} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{item.contexto_nome || "-"}</div>
                        <div className="text-xs text-slate-500">{item.contexto_slug || "-"}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {resumirUuid(item.responsavel_uuid)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
