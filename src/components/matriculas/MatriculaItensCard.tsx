"use client";

import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO } from "@/lib/formatters/date";

export type MatriculaItemCardItem = {
  id: number;
  descricao: string;
  origem_tipo: string;
  status: string;
  turma_id_inicial: number | null;
  turma_inicial_nome: string | null;
  turma_atual_id: number | null;
  turma_atual_nome: string | null;
  ue_label: string | null;
  valor_base_centavos: number;
  valor_liquido_centavos: number;
  data_inicio: string | null;
  data_fim: string | null;
  cancelamento_tipo: string | null;
};

type ActionKind = "trocar" | "cancelar";

type ResumoLegado = {
  turma_atual?: {
    turma_id?: number | null;
    nome?: string | null;
  } | null;
  pessoa?: {
    id?: number | null;
    nome?: string | null;
  } | null;
  responsavel?: {
    id?: number | null;
    nome?: string | null;
  } | null;
  status?: string | null;
} | null;

type Props = {
  items: MatriculaItemCardItem[];
  indisponivelTemporariamente?: boolean;
  diagnostico?: string | null;
  resumoLegado?: ResumoLegado;
  onTrocarTurma?: (item: MatriculaItemCardItem) => void;
  onCancelarModulo?: (item: MatriculaItemCardItem) => void;
  loadingAction?: {
    itemId: number;
    action: ActionKind;
  } | null;
  feedback?: {
    tipo: "sucesso" | "erro";
    mensagem: string;
  } | null;
};

function badgeClasses(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "CANCELADO") return "border border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "ENCERRADO") return "border border-amber-200 bg-amber-50 text-amber-700";
  return "border border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function MatriculaItensCard({
  items,
  indisponivelTemporariamente = false,
  diagnostico,
  resumoLegado,
  onTrocarTurma,
  onCancelarModulo,
  loadingAction,
  feedback,
}: Props) {
  const turmaLegadaLabel = resumoLegado?.turma_atual?.nome?.trim()
    || (resumoLegado?.turma_atual?.turma_id ? `Turma #${resumoLegado.turma_atual.turma_id}` : null);
  const pessoaLegadaLabel = resumoLegado?.pessoa?.nome?.trim()
    || (resumoLegado?.pessoa?.id ? `Pessoa #${resumoLegado.pessoa.id}` : null);
  const responsavelLegadoLabel = resumoLegado?.responsavel?.nome?.trim()
    || (resumoLegado?.responsavel?.id ? `Pessoa #${resumoLegado.responsavel.id}` : null);

  return (
    <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 md:text-lg">Modulos da matricula</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada item representa um modulo/produto operacional da matricula.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {items.length} item(ns)
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tipo === "erro"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.mensagem}
        </div>
      ) : null}

      {indisponivelTemporariamente ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900">
          <div className="font-medium">
            Itens granulares ainda nao disponiveis nesta matricula ou schema pendente de aplicacao.
          </div>
          {diagnostico ? (
            <div className="mt-2 text-xs text-amber-800">Diagnostico tecnico: {diagnostico}</div>
          ) : null}
          {resumoLegado ? (
            <div className="mt-3 grid gap-2 text-xs text-amber-900 md:grid-cols-2">
              <div>Turma atual: {turmaLegadaLabel ?? "-"}</div>
              <div>Status da matricula: {resumoLegado.status ?? "-"}</div>
              <div>Aluno: {pessoaLegadaLabel ?? "-"}</div>
              <div>Responsavel: {responsavelLegadoLabel ?? "-"}</div>
            </div>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-muted-foreground">
          Nenhum item granular encontrado para esta matricula.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const loadingTroca = loadingAction?.itemId === item.id && loadingAction.action === "trocar";
            const loadingCancelamento = loadingAction?.itemId === item.id && loadingAction.action === "cancelar";
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{item.descricao}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {item.origem_tipo.trim().toUpperCase() === "LEGADO" ? (
                        <div>Origem: legado</div>
                      ) : null}
                      <div>
                        Turma atual:{" "}
                        {item.turma_atual_nome?.trim() ||
                          (item.turma_atual_id ? `Turma #${item.turma_atual_id}` : "-")}
                      </div>
                      <div>
                        Turma inicial:{" "}
                        {item.turma_inicial_nome?.trim() ||
                          (item.turma_id_inicial ? `Turma #${item.turma_id_inicial}` : "-")}
                      </div>
                      <div>UE: {item.ue_label ?? "-"}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onTrocarTurma?.(item)}
                      disabled={!onTrocarTurma || loadingAction !== null || item.status.toUpperCase() !== "ATIVO"}
                    >
                      {loadingTroca ? "Trocando..." : "Trocar turma"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onCancelarModulo?.(item)}
                      disabled={!onCancelarModulo || loadingAction !== null || item.status.toUpperCase() !== "ATIVO"}
                    >
                      {loadingCancelamento ? "Cancelando..." : "Cancelar modulo"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-700 md:grid-cols-3">
                  <div>
                    <div className="font-semibold text-slate-500">Valor base</div>
                    <div>{formatBRLFromCents(item.valor_base_centavos)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">Valor liquido</div>
                    <div>{formatBRLFromCents(item.valor_liquido_centavos)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">Inicio</div>
                    <div>{item.data_inicio ? formatDateISO(item.data_inicio) : "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">Fim</div>
                    <div>{item.data_fim ? formatDateISO(item.data_fim) : "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">Cancelamento</div>
                    <div>{item.cancelamento_tipo ?? "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500">Item</div>
                    <div>#{item.id}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
