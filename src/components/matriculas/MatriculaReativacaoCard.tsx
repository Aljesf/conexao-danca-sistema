"use client";

import type { ReactNode } from "react";
import { SectionCard } from "@/components/ui/conexao-cards";
import { Button } from "@/shadcn/ui";
import type {
  MatriculaCanceladaResumo,
  MatriculaReativacaoEligibilidade,
  ReativacaoPlano,
} from "@/lib/matriculas/reativacao";

type ModoReativacao = "MESMOS_MODULOS" | "NOVOS_MODULOS";

type Props = {
  contexto: MatriculaReativacaoEligibilidade;
  matriculaSelecionadaId: number | null;
  expanded: boolean;
  modoSelecionado: ModoReativacao | null;
  processandoReativacao: boolean;
  criandoNovaMesmoAssim: boolean;
  planoMesmosModulos: ReativacaoPlano | null;
  planoNovosModulos: ReativacaoPlano | null;
  haModulosEncerrados: boolean;
  showTriggerButtons?: boolean;
  novosModulosConfigurador?: ReactNode;
  onSelecionarMatricula: (matriculaId: number) => void;
  onExpandedChange: (open: boolean) => void;
  onSelecionarModo: (modo: ModoReativacao) => void;
  onCriarNovaMesmoAssim: () => void;
  onConfirmarReativacao: (modo: ModoReativacao) => void;
};

function formatDateLabel(value: string | null): string {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function buildResumoMatriculaLabel(matricula: MatriculaCanceladaResumo): string {
  const parts = [`#${matricula.id}`];
  if (matricula.ano_referencia) parts.push(String(matricula.ano_referencia));
  if (matricula.data_cancelamento) parts.push(formatDateLabel(matricula.data_cancelamento));
  return parts.join(" | ");
}

function renderPlanoResumo(plano: ReativacaoPlano | null) {
  if (!plano) {
    return (
      <div className="mt-3 text-sm text-slate-600">
        Complete a configuracao necessaria para visualizar o diff final da reativacao.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 text-sm text-slate-700">
      <div>
        <div className="font-medium text-slate-800">Manter modulo</div>
        <div>{plano.modulos_manter.length > 0 ? plano.modulos_manter.join(", ") : "Nenhum modulo reaproveitado."}</div>
      </div>
      <div>
        <div className="font-medium text-slate-800">Remover modulo do retorno</div>
        <div>{plano.modulos_remover.length > 0 ? plano.modulos_remover.join(", ") : "Nenhum modulo removido."}</div>
      </div>
      <div>
        <div className="font-medium text-slate-800">Adicionar novo modulo</div>
        <div>
          {plano.modulos_adicionar.length > 0
            ? plano.modulos_adicionar
                .map((item) => `${item.modulo_id}${item.turma_id ? ` -> turma ${item.turma_id}` : ""}`)
                .join(" | ")
            : "Nenhum modulo novo."}
        </div>
      </div>
      <div>
        <div className="font-medium text-slate-800">Trocar turma</div>
        <div>
          {plano.trocas_turma.length > 0
            ? plano.trocas_turma
                .map((troca) => `${troca.modulo_id}: ${troca.turma_origem_id ?? "-"} -> ${troca.turma_destino_id}`)
                .join(" | ")
            : "Sem troca de turma."}
        </div>
      </div>
      {plano.conflitos.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          {plano.conflitos.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

export function MatriculaReativacaoCard(props: Props) {
  const {
    contexto,
    matriculaSelecionadaId,
    expanded,
    modoSelecionado,
    processandoReativacao,
    criandoNovaMesmoAssim,
    planoMesmosModulos,
    planoNovosModulos,
    haModulosEncerrados,
    showTriggerButtons = true,
    novosModulosConfigurador,
    onSelecionarMatricula,
    onExpandedChange,
    onSelecionarModo,
    onCriarNovaMesmoAssim,
    onConfirmarReativacao,
  } = props;

  const matriculas = contexto.matriculas_canceladas_encontradas ?? [];
  const selecionada =
    matriculas.find((item) => item.id === matriculaSelecionadaId) ?? matriculas[0] ?? null;

  if (!contexto.possui_matricula_cancelada || !selecionada) {
    return null;
  }

  const anoLabel = selecionada.ano_referencia ? ` em ${selecionada.ano_referencia}` : "";

  return (
    <SectionCard
      title="Reativar matricula cancelada"
      subtitle="Retorno com historico"
      description={`Esta aluna ja possui matricula cancelada${anoLabel}. Voce pode reativar a matricula anterior e escolher como ela retorna.`}
      className="border-amber-200 bg-amber-50/80"
    >
      <div className="space-y-4 text-sm text-amber-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="font-medium">
              Matricula {buildResumoMatriculaLabel(selecionada)}
              {selecionada.status ? ` | ${selecionada.status}` : ""}
            </div>
            <div>
              Modulos anteriores: {selecionada.resumo_modulos.length > 0 ? selecionada.resumo_modulos.join(" | ") : "-"}
            </div>
            <div>
              Turmas anteriores: {selecionada.resumo_turmas.length > 0 ? selecionada.resumo_turmas.join(" | ") : "-"}
            </div>
            <div>
              Motivo do cancelamento: {selecionada.motivo_cancelamento ?? selecionada.cancelamento_tipo ?? "-"}
            </div>
            {criandoNovaMesmoAssim ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-800">
                O fluxo atual foi ajustado para criar nova matricula mesmo com historico cancelado.
              </div>
            ) : null}
          </div>

          {showTriggerButtons ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onExpandedChange(true)}
                disabled={processandoReativacao}
              >
                Reativar matricula
              </Button>
              <Button variant="outline" onClick={onCriarNovaMesmoAssim} disabled={processandoReativacao}>
                Criar nova matricula
              </Button>
            </div>
          ) : null}
        </div>

        {expanded ? (
          <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">Como deseja reativar esta matricula?</div>
                <div className="mt-1 text-sm text-slate-600">
                  Escolha se a aluna retornara com a configuracao anterior ou com uma nova composicao de modulos.
                </div>
              </div>
              <Button variant="outline" onClick={() => onExpandedChange(false)} disabled={processandoReativacao}>
                Fechar
              </Button>
            </div>

            {matriculas.length > 1 ? (
              <div className="mt-4 space-y-1">
                <label className="text-sm font-medium text-slate-700">Matricula cancelada</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selecionada.id}
                  onChange={(event) => onSelecionarMatricula(Number(event.target.value))}
                >
                  {matriculas.map((matricula) => (
                    <option key={matricula.id} value={matricula.id}>
                      {buildResumoMatriculaLabel(matricula)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  modoSelecionado === "MESMOS_MODULOS"
                    ? "border-violet-400 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-violet-200"
                }`}
                onClick={() => onSelecionarModo("MESMOS_MODULOS")}
                disabled={processandoReativacao}
              >
                <div className="font-semibold text-slate-900">Reativar com os mesmos modulos</div>
                <div className="mt-1 text-sm text-slate-600">
                  Reaproveita a configuracao anterior da matricula cancelada para um retorno rapido.
                </div>
              </button>

              <button
                type="button"
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  modoSelecionado === "NOVOS_MODULOS"
                    ? "border-violet-400 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-violet-200"
                }`}
                onClick={() => onSelecionarModo("NOVOS_MODULOS")}
                disabled={processandoReativacao}
              >
                <div className="font-semibold text-slate-900">Reativar com novos modulos</div>
                <div className="mt-1 text-sm text-slate-600">
                  Mantem a reativacao, mas usa a composicao configurada no formulario desta pagina.
                </div>
              </button>
            </div>

            {modoSelecionado === "MESMOS_MODULOS" ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Historico cancelado
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>Matricula: #{selecionada.id}</div>
                      <div>Ano: {selecionada.ano_referencia ?? "-"}</div>
                      <div>Data do cancelamento: {formatDateLabel(selecionada.data_cancelamento)}</div>
                      <div>Motivo: {selecionada.motivo_cancelamento ?? selecionada.cancelamento_tipo ?? "-"}</div>
                    </div>

                    {haModulosEncerrados ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Alguns modulos anteriores estavam encerrados. Revise antes de confirmar.
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-2">
                      {selecionada.itens.length > 0 ? (
                        selecionada.itens.map((item, index) => (
                          <div
                            key={`${item.item_id ?? "sem-item"}-${index}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                          >
                            <div className="font-medium text-slate-800">
                              {item.modulo_label ??
                                (item.modulo_id_resolvido ? `Modulo #${item.modulo_id_resolvido}` : "Modulo")}
                            </div>
                            <div className="text-xs text-slate-500">
                              Turma anterior: {item.turma_atual_nome ?? item.turma_inicial_nome ?? "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              Status historico: {item.status ?? "Nao informado"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                          Nenhum modulo elegivel foi encontrado nesta matricula cancelada.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                      Reativacao com os mesmos modulos
                    </div>
                    {renderPlanoResumo(planoMesmosModulos)}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => onConfirmarReativacao("MESMOS_MODULOS")}
                    disabled={processandoReativacao || !planoMesmosModulos || planoMesmosModulos.conflitos.length > 0}
                  >
                    {processandoReativacao ? "Reativando..." : "Confirmar reativacao"}
                  </Button>
                </div>
              </div>
            ) : null}

            {modoSelecionado === "NOVOS_MODULOS" ? (
              <div className="mt-5 space-y-4">
                {novosModulosConfigurador ? (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-4">
                    {novosModulosConfigurador}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-900">
                    A configuracao desta reativacao usa os campos do formulario da propria tela, logo abaixo deste alerta.
                    Ao ajustar cursos, turmas e niveis, o resumo abaixo e recalculado.
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Historico cancelado
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>Matricula: #{selecionada.id}</div>
                      <div>Ano: {selecionada.ano_referencia ?? "-"}</div>
                      <div>Data do cancelamento: {formatDateLabel(selecionada.data_cancelamento)}</div>
                      <div>Modulos anteriores: {selecionada.resumo_modulos.length > 0 ? selecionada.resumo_modulos.join(" | ") : "-"}</div>
                      <div>Turmas anteriores: {selecionada.resumo_turmas.length > 0 ? selecionada.resumo_turmas.join(" | ") : "-"}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                      Reativacao com novos modulos
                    </div>
                    {renderPlanoResumo(planoNovosModulos)}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => onConfirmarReativacao("NOVOS_MODULOS")}
                    disabled={processandoReativacao || !planoNovosModulos || planoNovosModulos.conflitos.length > 0}
                  >
                    {processandoReativacao ? "Reativando..." : "Confirmar reativacao"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
