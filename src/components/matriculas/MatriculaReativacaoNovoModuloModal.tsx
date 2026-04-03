"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjetoSocialAutocomplete } from "@/components/bolsas/ProjetoSocialAutocomplete";
import type { ReativacaoConfigItem } from "@/lib/matriculas/reativacao";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/ui";

type CursoOpcao = {
  id: number;
  nome: string;
};

type TurmaOpcao = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  unidade_execucao_id: number | null;
  servico_id: number | null;
};

type NivelOpcao = {
  id: number;
  nome: string;
};

type BolsaTipoOpcao = {
  id: number;
  nome: string;
};

type PeriodoLetivo = {
  id: number;
  titulo: string;
  ano_referencia: number;
};

export type MatriculaReativacaoNovoModuloResult = ReativacaoConfigItem & {
  id: string;
  modulo_label: string;
  turma_label: string;
  natureza_financeira: "PAGO" | "PROJETO";
  valor_label: string;
  projeto_social_label?: string | null;
  bolsa_tipo_label?: string | null;
};

type Props = {
  open: boolean;
  anoReferencia: number | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: MatriculaReativacaoNovoModuloResult) => void;
};

function parseMoneyToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

function formatCurrency(cents: number | null): string {
  if (!Number.isFinite(cents ?? NaN)) return "Tabela do sistema";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents ?? 0) / 100);
}

function labelTurma(turma: TurmaOpcao | null) {
  if (!turma) return "-";
  return [turma.nome, turma.nivel, turma.turno].filter((value) => value && value.trim()).join(" - ") || "Turma sem nome";
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      throw new Error(
        String(record.message ?? record.error ?? `HTTP ${response.status}`),
      );
    }
    throw new Error(`HTTP ${response.status}`);
  }
  return data as T;
}

function createDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `reativacao-modulo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MatriculaReativacaoNovoModuloModal({ open, anoReferencia, onOpenChange, onConfirm }: Props) {
  const [cursos, setCursos] = useState<CursoOpcao[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [niveis, setNiveis] = useState<NivelOpcao[]>([]);
  const [nivelId, setNivelId] = useState<number | null>(null);
  const [naturezaFinanceira, setNaturezaFinanceira] = useState<"PAGO" | "PROJETO">("PAGO");
  const [origemValor, setOrigemValor] = useState<"TABELA" | "MANUAL">("TABELA");
  const [valorManual, setValorManual] = useState("");
  const [dataInicioAulas, setDataInicioAulas] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [projetoSocialId, setProjetoSocialId] = useState<number | null>(null);
  const [projetoSocialLabel, setProjetoSocialLabel] = useState("");
  const [tiposBolsa, setTiposBolsa] = useState<BolsaTipoOpcao[]>([]);
  const [bolsaTipoId, setBolsaTipoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursosLoading, setCursosLoading] = useState(false);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [niveisLoading, setNiveisLoading] = useState(false);
  const [tiposBolsaLoading, setTiposBolsaLoading] = useState(false);

  const cursoSelecionado = useMemo(() => cursos.find((curso) => curso.id === cursoId) ?? null, [cursos, cursoId]);
  const turmaSelecionada = useMemo(() => turmas.find((turma) => turma.turma_id === turmaId) ?? null, [turmas, turmaId]);
  const nivelSelecionado = useMemo(() => niveis.find((nivel) => nivel.id === nivelId) ?? null, [niveis, nivelId]);
  const bolsaTipoSelecionado = useMemo(
    () => tiposBolsa.find((tipoBolsa) => tipoBolsa.id === bolsaTipoId) ?? null,
    [tiposBolsa, bolsaTipoId],
  );

  useEffect(() => {
    if (!open) return;

    let ativo = true;
    (async () => {
      try {
        setCursosLoading(true);
        const [cursosResp, periodosResp] = await Promise.all([
          fetchJSON<{ cursos?: CursoOpcao[] }>("/api/academico/cursos"),
          fetchJSON<{ items?: PeriodoLetivo[] }>("/api/academico/periodos-letivos"),
        ]);
        if (!ativo) return;

        const listaCursos = cursosResp.cursos ?? [];
        const listaPeriodos = periodosResp.items ?? [];
        setCursos(listaCursos);
        const periodoPadrao =
          (Number.isFinite(anoReferencia ?? NaN)
            ? listaPeriodos.find((periodo) => periodo.ano_referencia === anoReferencia)
            : null) ??
          listaPeriodos[0] ??
          null;
        setPeriodoId(periodoPadrao?.id ?? null);
      } catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : "Falha ao carregar cursos.");
      } finally {
        if (ativo) setCursosLoading(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [anoReferencia, open]);

  useEffect(() => {
    if (!open || !cursoSelecionado?.nome || !periodoId) {
      setTurmas([]);
      setTurmaId(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setTurmasLoading(true);
        const params = new URLSearchParams({
          periodo_letivo_id: String(periodoId),
          curso: cursoSelecionado.nome,
        });
        const response = await fetchJSON<{ turmas?: TurmaOpcao[] }>(`/api/academico/turmas?${params.toString()}`);
        if (!ativo) return;
        setTurmas(response.turmas ?? []);
      } catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : "Falha ao carregar turmas.");
      } finally {
        if (ativo) setTurmasLoading(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cursoSelecionado?.nome, open, periodoId]);

  useEffect(() => {
    if (!open || !turmaId) {
      setNiveis([]);
      setNivelId(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setNiveisLoading(true);
        const params = new URLSearchParams({ turma_id: String(turmaId), turmaId: String(turmaId) });
        const response = await fetchJSON<{ niveis?: NivelOpcao[]; items?: NivelOpcao[]; data?: NivelOpcao[] }>(
          `/api/academico/turmas/niveis?${params.toString()}`,
        );
        if (!ativo) return;
        const lista = response.niveis ?? response.items ?? response.data ?? [];
        setNiveis(lista);
      } catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : "Falha ao carregar niveis.");
      } finally {
        if (ativo) setNiveisLoading(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [open, turmaId]);

  useEffect(() => {
    if (!open || !projetoSocialId || naturezaFinanceira !== "PROJETO") {
      setTiposBolsa([]);
      setBolsaTipoId(null);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setTiposBolsaLoading(true);
        const response = await fetchJSON<{ data?: BolsaTipoOpcao[] }>(
          `/api/bolsas/tipos?projeto_social_id=${projetoSocialId}&ativo=true`,
        );
        if (!ativo) return;
        setTiposBolsa(response.data ?? []);
      } catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : "Falha ao carregar tipos de bolsa.");
      } finally {
        if (ativo) setTiposBolsaLoading(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [naturezaFinanceira, open, projetoSocialId]);

  useEffect(() => {
    if (!open) return;

    setErro(null);
    setCursoId(null);
    setTurmaId(null);
    setNivelId(null);
    setNaturezaFinanceira("PAGO");
    setOrigemValor("TABELA");
    setValorManual("");
    setProjetoSocialId(null);
    setProjetoSocialLabel("");
    setTiposBolsa([]);
    setBolsaTipoId(null);
    setDataInicioAulas(new Date().toISOString().slice(0, 10));
  }, [open]);

  function validar() {
    if (!cursoId) return "Selecione o modulo.";
    if (!turmaSelecionada?.servico_id) return "Selecione uma turma valida para este modulo.";
    if (!nivelSelecionado) return "Selecione o nivel desta execucao.";
    if (naturezaFinanceira === "PROJETO") {
      if (!projetoSocialId || !bolsaTipoId) {
        return "Selecione o projeto social e o tipo de bolsa.";
      }
      if (origemValor !== "MANUAL") {
        return "Para projeto / custeio institucional, o valor manual segue obrigatorio no fluxo atual.";
      }
    }
    if (origemValor === "MANUAL" && parseMoneyToCentavos(valorManual) === null) {
      return "Informe um valor manual valido.";
    }
    if (!dataInicioAulas) return "Informe a data de inicio das aulas.";
    return null;
  }

  async function confirmar() {
    const erroValidacao = validar();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (!cursoSelecionado || !turmaSelecionada || !nivelSelecionado || !turmaSelecionada.servico_id) {
      setErro("Nao foi possivel montar o novo modulo.");
      return;
    }

    setLoading(true);
    try {
      const valorManualCentavos = origemValor === "MANUAL" ? parseMoneyToCentavos(valorManual) : null;
      onConfirm({
        id: createDraftId(),
        modulo_id: turmaSelecionada.servico_id,
        turma_id: turmaSelecionada.turma_id,
        nivel: nivelSelecionado.nome,
        nivel_id: nivelSelecionado.id,
        liquidacao_tipo: naturezaFinanceira === "PROJETO" ? "BOLSA" : "FAMILIA",
        valor_mensal_centavos: valorManualCentavos,
        bolsa:
          naturezaFinanceira === "PROJETO" && projetoSocialId && bolsaTipoId
            ? {
                projeto_social_id: projetoSocialId,
                bolsa_tipo_id: bolsaTipoId,
              }
            : null,
        curso_id: cursoSelecionado.id,
        curso_nome: cursoSelecionado.nome,
        turma_label: labelTurma(turmaSelecionada),
        origem_valor: origemValor,
        data_inicio_aulas: dataInicioAulas,
        valor_manual_reais: origemValor === "MANUAL" ? valorManual : null,
        modulo_label: cursoSelecionado.nome,
        natureza_financeira: naturezaFinanceira,
        valor_label:
          origemValor === "MANUAL"
            ? formatCurrency(valorManualCentavos)
            : naturezaFinanceira === "PROJETO"
              ? "Custeio institucional"
              : "Tabela do sistema",
        projeto_social_label: naturezaFinanceira === "PROJETO" ? projetoSocialLabel || null : null,
        bolsa_tipo_label: naturezaFinanceira === "PROJETO" ? bolsaTipoSelecionado?.nome ?? null : null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div className="rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle>Adicionar novo modulo a reativacao</DialogTitle>
            <DialogDescription>
              Preencha este modulo como uma nova matricula complementar dentro do retorno da aluna.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Modulo</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={cursoId ?? ""}
                onChange={(event) => setCursoId(event.target.value ? Number(event.target.value) : null)}
                disabled={cursosLoading}
              >
                <option value="">Selecione...</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Turma</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={turmaId ?? ""}
                onChange={(event) => setTurmaId(event.target.value ? Number(event.target.value) : null)}
                disabled={!cursoId || turmasLoading}
              >
                <option value="">{cursoId ? "Selecione a turma" : "Selecione o modulo primeiro"}</option>
                {turmas.map((turma) => (
                  <option key={turma.turma_id} value={turma.turma_id}>
                    {labelTurma(turma)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Inicio das aulas</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                type="date"
                value={dataInicioAulas}
                onChange={(event) => setDataInicioAulas(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Nivel nesta execucao</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={nivelId ?? ""}
                onChange={(event) => setNivelId(event.target.value ? Number(event.target.value) : null)}
                disabled={!turmaId || niveisLoading}
              >
                <option value="">{turmaId ? "Selecione..." : "Selecione a turma primeiro"}</option>
                {niveis.map((nivel) => (
                  <option key={nivel.id} value={nivel.id}>
                    {nivel.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Natureza do vinculo</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={naturezaFinanceira}
                onChange={(event) => {
                  const proximo = event.target.value === "PROJETO" ? "PROJETO" : "PAGO";
                  setNaturezaFinanceira(proximo);
                  if (proximo === "PROJETO") {
                    setOrigemValor("MANUAL");
                  } else if (origemValor === "MANUAL") {
                    setOrigemValor("TABELA");
                  }
                }}
              >
                <option value="PAGO">Pago</option>
                <option value="PROJETO">Projeto / custeio institucional</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Forma do valor</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={origemValor}
                onChange={(event) => setOrigemValor(event.target.value === "MANUAL" ? "MANUAL" : "TABELA")}
                disabled={naturezaFinanceira === "PROJETO"}
              >
                <option value="TABELA">Tabela do sistema</option>
                <option value="MANUAL">Valor manual</option>
              </select>
              {naturezaFinanceira === "PROJETO" ? (
                <span className="text-xs text-slate-500">
                  O fluxo atual exige valor manual quando o modulo entra como projeto / custeio institucional.
                </span>
              ) : null}
            </label>

            {origemValor === "MANUAL" ? (
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-slate-700">Valor aplicado</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  inputMode="decimal"
                  placeholder="Ex.: 220,00"
                  value={valorManual}
                  onChange={(event) => setValorManual(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          {naturezaFinanceira === "PROJETO" ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ProjetoSocialAutocomplete
                  label="Projeto social"
                  valueId={projetoSocialId}
                  valueLabel={projetoSocialLabel}
                  initialQuery={projetoSocialLabel}
                  onChange={(projeto) => {
                    setProjetoSocialId(projeto?.id ?? null);
                    setProjetoSocialLabel(projeto?.nome ?? "");
                    setBolsaTipoId(null);
                  }}
                />

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Tipo de bolsa</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={bolsaTipoId ?? ""}
                    onChange={(event) => setBolsaTipoId(event.target.value ? Number(event.target.value) : null)}
                    disabled={!projetoSocialId || tiposBolsaLoading}
                  >
                    <option value="">Selecione...</option>
                    {tiposBolsa.map((tipoBolsa) => (
                      <option key={tipoBolsa.id} value={tipoBolsa.id}>
                        {tipoBolsa.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {erro ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {erro}
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={confirmar} disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar modulo"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
