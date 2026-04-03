"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { TicketsDashboardCards } from "@/components/suporte/TicketsDashboardCards";
import { TicketsViewSwitch } from "@/components/suporte/TicketsViewSwitch";
import { CONTEXTOS_CONFIG } from "@/config/contextosConfig";
import {
  SUPORTE_BADGE_CLASS,
  SUPORTE_PRIORIDADE_LABEL,
  SUPORTE_STATUS_LABEL,
  SUPORTE_TICKET_PRIORIDADES,
  SUPORTE_TICKET_STATUS,
  SUPORTE_TICKET_TIPOS,
  SUPORTE_TIPO_LABEL,
  isSuporteTicketView,
  type SuporteTicketResumo,
  type SuporteTicketView,
  type SuporteTicketsMetricas,
} from "@/lib/suporte/constants";

type ApiListResponse = {
  ok: boolean;
  items?: SuporteTicketResumo[];
  metrics?: SuporteTicketsMetricas;
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

function formatarDataHora(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function obterResumoTemporal(item: SuporteTicketResumo) {
  if (item.esta_resolvido) {
    return {
      destaque: item.tempo_resolucao_formatado
        ? `Resolvido em ${item.tempo_resolucao_formatado}`
        : "Resolvido",
      detalhe: item.resolved_at
        ? `Encerrado em ${formatarDataHora(item.resolved_at)}`
        : "Sem data de resolucao registrada",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    destaque: item.tempo_aberto_formatado
      ? `Aberto ha ${item.tempo_aberto_formatado}`
      : "Em aberto",
    detalhe: `Criado em ${formatarDataHora(item.created_at)}`,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const view: SuporteTicketView = isSuporteTicketView(rawView) ? rawView : "abertos";

  const [items, setItems] = useState<SuporteTicketResumo[]>([]);
  const [metrics, setMetrics] = useState<SuporteTicketsMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [contextoSlug, setContextoSlug] = useState("");
  const [exporting, setExporting] = useState<"" | "csv" | "json">("");

  useEffect(() => {
    if (rawView && isSuporteTicketView(rawView)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "abertos");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, rawView, router, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
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

        return {
          items: json.items ?? [],
          metrics: json.metrics ?? null,
        };
      })
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setMetrics(data.metrics);
      })
      .catch((fetchError) => {
        if (!active) return;
        setItems([]);
        setMetrics(null);
        setError(fetchError instanceof Error ? fetchError.message : "falha_listar_tickets");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contextoSlug, prioridade, status, tipo, view]);

  async function exportarTickets(formato: "csv" | "json") {
    setExporting(formato);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      params.set("include_tecnicos", "1");
      params.set("view", view);
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
          JSON.stringify(
            {
              view,
              metrics: json.metrics ?? null,
              items: exportItems,
            },
            null,
            2,
          ),
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
          "esta_resolvido",
          "created_at",
          "resolved_at",
          "tempo_aberto_ms",
          "tempo_aberto_formatado",
          "tempo_resolucao_ms",
          "tempo_resolucao_formatado",
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
            escapeCsv(item.esta_resolvido),
            escapeCsv(item.created_at),
            escapeCsv(item.resolved_at ?? ""),
            escapeCsv(item.tempo_aberto_ms ?? ""),
            escapeCsv(item.tempo_aberto_formatado ?? ""),
            escapeCsv(item.tempo_resolucao_ms ?? ""),
            escapeCsv(item.tempo_resolucao_formatado ?? ""),
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
          <div className="space-y-6">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                <LifeBuoy className="h-3.5 w-3.5" />
                Suporte ao Usuario
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Tickets e acompanhamento operacional</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Painel institucional para separar a fila operacional dos tickets ainda em tratamento do historico resolvido, com leitura temporal calculada no backend.
                </p>
              </div>
            </div>

            <TicketsDashboardCards metrics={metrics} />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Fila operacional</div>
              <TicketsViewSwitch value={view} />
            </div>

            <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
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
                  <th className="px-4 py-4">Tempo operacional</th>
                  <th className="px-4 py-4">Criado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={8}>
                      Carregando tickets...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-8 text-rose-600" colSpan={8}>
                      {error}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={8}>
                      Nenhum ticket encontrado para a visao e filtros atuais.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const temporal = obterResumoTemporal(item);

                    return (
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
                        <td className="px-4 py-4">
                          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${temporal.className}`}>
                            {temporal.destaque}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">{temporal.detalhe}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatarDataHora(item.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
