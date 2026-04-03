import { notFound } from "next/navigation";
import { SystemLogoImage } from "@/components/branding/SystemLogoImage";
import { InscricaoComprovanteActions } from "@/components/escola/eventos/InscricaoComprovanteActions";
import { buscarInscricaoEdicaoEvento } from "@/lib/eventos/service";
import { getSystemSettings } from "@/lib/systemSettings";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type EventoEdicaoInscricaoComprovantePageProps = {
  params: Promise<{
    edicaoId: string;
    inscricaoId: string;
  }>;
};

type EdicaoResumoRow = {
  id: string;
  titulo_exibicao: string | null;
  tema: string | null;
  evento:
    | {
        titulo: string | null;
      }[]
    | {
        titulo: string | null;
      }
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function currency(valueCentavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueCentavos / 100);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-";
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function formatCompetenciaLabel(value: string): string {
  const [yearRaw, monthRaw] = value.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatItemTipo(value: string | null | undefined): string {
  if (!value) return "Item";
  if (value === "EVENTO_GERAL") return "Inscricao geral";
  if (value === "ITEM_EDICAO") return "Item adicional";
  if (value === "COREOGRAFIA") return "Participacao artistica";
  return formatStatus(value);
}

function formatOrigemInscricao(value: string | null | undefined): string {
  if (value === "INSCRICAO_INTERNA") return "Aluno da escola";
  if (value === "INSCRICAO_EXTERNA") return "Participante externo";
  return "-";
}

function resolveParticipanteNome(
  inscricao: Awaited<ReturnType<typeof buscarInscricaoEdicaoEvento>>,
) {
  if (
    typeof inscricao.participante_nome_snapshot === "string" &&
    inscricao.participante_nome_snapshot.trim()
  ) {
    return inscricao.participante_nome_snapshot.trim();
  }

  if (typeof inscricao.aluno?.nome === "string" && inscricao.aluno.nome.trim()) {
    return inscricao.aluno.nome.trim();
  }

  if (
    typeof inscricao.participante_externo?.nome_exibicao === "string" &&
    inscricao.participante_externo.nome_exibicao.trim()
  ) {
    return inscricao.participante_externo.nome_exibicao.trim();
  }

  if (
    typeof inscricao.participante?.nome === "string" &&
    inscricao.participante.nome.trim()
  ) {
    return inscricao.participante.nome.trim();
  }

  return `Pessoa #${String(inscricao.pessoa_id)}`;
}

export default async function EventoEdicaoInscricaoComprovantePage({
  params,
}: EventoEdicaoInscricaoComprovantePageProps) {
  const { edicaoId, inscricaoId } = await params;
  const db = getSupabaseServiceRole();

  const [systemSettings, inscricao, edicaoResumoResponse] = await Promise.all([
    getSystemSettings(),
    buscarInscricaoEdicaoEvento(db, edicaoId, inscricaoId).catch(() => null),
    db
      .from("eventos_escola_edicoes")
      .select("id, titulo_exibicao, tema, evento:eventos_escola(titulo)")
      .eq("id", edicaoId)
      .maybeSingle(),
  ]);

  if (!inscricao || edicaoResumoResponse.error || !edicaoResumoResponse.data) {
    notFound();
  }

  const edicaoResumo = edicaoResumoResponse.data as EdicaoResumoRow;
  const eventoBase = firstRelation(edicaoResumo.evento);
  const participanteNome = resolveParticipanteNome(inscricao);

  return (
    <div className="comprovante-page-shell min-h-screen bg-zinc-100 px-4 py-6 md:px-6">
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          .sidebar,
          .app-header,
          .comprovante-print-actions,
          [data-suporte-fab="true"],
          .fixed {
            display: none !important;
          }

          .app-grid,
          .app-main,
          .app-content {
            display: block !important;
          }

          .app-main,
          .app-content,
          .comprovante-page-shell {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .comprovante-document {
            max-width: none !important;
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Comprovante operacional
            </p>
            <h1 className="text-2xl font-semibold text-zinc-950">
              Comprovante de inscricao
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Documento dedicado para conferencia e impressao da inscricao.
            </p>
          </div>
          <InscricaoComprovanteActions
            inscricoesHref={`/escola/eventos/edicoes/${edicaoId}/inscricoes`}
            inscritoHref={`/escola/eventos/edicoes/${edicaoId}/inscritos#inscricao-${inscricaoId}`}
          />
        </div>

        <article className="comprovante-document rounded-[28px] border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/60 md:p-8">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <SystemLogoImage
                  src={
                    systemSettings.logo_transparent_url ??
                    systemSettings.logo_color_url ??
                    null
                  }
                  width={120}
                  height={60}
                  className="h-12 w-auto"
                />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {systemSettings.system_name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Modulo de eventos
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Participante
                </p>
                <h2 className="text-2xl font-semibold text-zinc-950">
                  {participanteNome}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatOrigemInscricao(inscricao.origem_inscricao)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 md:min-w-[260px]">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Evento-base
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {eventoBase?.titulo?.trim() || "Evento da escola"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Edicao
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {edicaoResumo.titulo_exibicao?.trim() || "Edicao"}
                </p>
                {edicaoResumo.tema?.trim() ? (
                  <p className="text-xs text-zinc-500">Tema: {edicaoResumo.tema.trim()}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  Identificador
                </p>
                <p className="mt-1 font-medium text-zinc-900">{inscricao.id}</p>
                <p className="text-xs text-zinc-500">
                  Registrada em {formatDateTime(inscricao.data_inscricao)}
                </p>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Valor total
              </p>
              <p className="mt-2 text-xl font-semibold text-zinc-950">
                {currency(inscricao.valor_total_centavos)}
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Destino financeiro
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-950">
                {inscricao.destino_financeiro
                  ? formatStatus(inscricao.destino_financeiro)
                  : "-"}
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Status financeiro
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-950">
                {inscricao.status_financeiro
                  ? formatStatus(inscricao.status_financeiro)
                  : "-"}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Composicao da inscricao
                </p>
                <h3 className="text-lg font-semibold text-zinc-950">
                  Itens confirmados
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                {Array.isArray(inscricao.itens) ? inscricao.itens.length : 0} item(ns)
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {(inscricao.itens ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-950">
                      {item.descricao_snapshot ?? item.descricao ?? "Item da inscricao"}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {formatItemTipo(item.tipo_item)} · Quantidade {item.quantidade}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Status: {formatStatus(item.status)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {currency(item.valor_total_centavos)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Parcelamento e competencias
              </p>
              {(inscricao.parcelas_conta_interna ?? []).length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {inscricao.parcelas_conta_interna!.map((parcela) => (
                    <div
                      key={`${parcela.parcela_numero}-${parcela.competencia}`}
                      className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700"
                    >
                      <p className="font-medium text-zinc-950">
                        Parcela {parcela.parcela_numero}/{parcela.total_parcelas} ·{" "}
                        {formatCompetenciaLabel(parcela.competencia)}
                      </p>
                      <p>Valor: {currency(parcela.valor_centavos)}</p>
                      <p>Vencimento real: {formatDateOnly(parcela.data_vencimento)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-600">
                  Esta inscricao nao gerou parcelamento por competencias.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Observacoes
              </p>
              <div className="mt-4 space-y-3 text-sm text-zinc-700">
                <p>
                  Pagamento no ato:{" "}
                  <span className="font-medium text-zinc-950">
                    {inscricao.pagamento_no_ato ? "sim" : "nao"}
                  </span>
                </p>
                <p>
                  Conta interna:{" "}
                  <span className="font-medium text-zinc-950">
                    {typeof inscricao.conta_interna_id === "number"
                      ? `#${inscricao.conta_interna_id}`
                      : "-"}
                  </span>
                </p>
                <p>
                  Observacoes da inscricao:{" "}
                  <span className="font-medium text-zinc-950">
                    {inscricao.observacoes?.trim() || "Nenhuma observacao registrada."}
                  </span>
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
