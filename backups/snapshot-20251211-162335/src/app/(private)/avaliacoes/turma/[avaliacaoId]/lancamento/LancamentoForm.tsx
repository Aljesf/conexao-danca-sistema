"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { STATUS_AVALIACAO_LABEL, type StatusAvaliacao } from "@/types/avaliacoes";
import { salvarLancamentoAction, type LancamentoInput } from "./actions";

type Aluno = {
  pessoa_id: number;
  nome: string;
  foto_url: string | null;
};

type Grupo = {
  nome: string;
  descricao?: string | null;
  itens: string[];
};

type Conceito = {
  id: number;
  rotulo: string | null;
  cor_hex: string | null;
};

type LancamentoFormProps = {
  avaliacaoId: number;
  avaliacao: {
    titulo: string;
    status: StatusAvaliacao | null;
    data_prevista: string | null;
    data_realizada: string | null;
    obrigatoria: boolean | null;
    turma_id: number;
  };
  turma: {
    nome: string;
    curso: string | null;
    nivel: string | null;
    ano_referencia: number | null;
  };
  modelo: {
    nome: string | null;
    tipo_avaliacao: string | null;
    grupos: Grupo[] | null;
  } | null;
  conceitos: Conceito[];
  alunos: Aluno[];
  resultados: {
    pessoa_id: number;
    conceito_final_id: number | null;
    conceitos_por_grupo: Record<string, number | null> | null;
    observacoes_professor: string | null;
    data_avaliacao: string | null;
  }[];
  status: StatusAvaliacao;
};

const alunoSchema = z.object({
  pessoaId: z.number().int(),
  conceitoFinalId: z.number().int().nullable(),
  observacoes: z.string().optional(),
  conceitosPorGrupo: z.record(z.string(), z.number().int().nullable()),
});

const formSchema = z.object({
  data_avaliacao: z.string().min(1, "Informe a data da avaliação"),
  alunos: z.array(alunoSchema),
});

export default function LancamentoForm(props: LancamentoFormProps) {
  const {
    avaliacaoId,
    avaliacao,
    modelo,
    conceitos,
    alunos,
    resultados,
    status,
  } = props;

  const isConcluida = status === "CONCLUIDA";

  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const conceitosOptions = useMemo(
    () => [...conceitos].sort((a, b) => (a.rotulo ?? "").localeCompare(b.rotulo ?? "")),
    [conceitos]
  );
  const grupos = modelo?.grupos ?? [];

  const defaultDate =
    resultados[0]?.data_avaliacao ??
    avaliacao.data_realizada ??
    new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, getValues, setValue, formState } =
    useForm<LancamentoInput>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        data_avaliacao: defaultDate,
        alunos: alunos.map((aluno) => {
          const existente = resultados.find((r) => r.pessoa_id === aluno.pessoa_id);
          return {
            pessoaId: aluno.pessoa_id,
            conceitoFinalId: existente?.conceito_final_id ?? null,
            observacoes: existente?.observacoes_professor ?? "",
            conceitosPorGrupo: existente?.conceitos_por_grupo ?? {},
          };
        }),
      },
    });

  const onSubmit = (data: LancamentoInput) => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await salvarLancamentoAction(avaliacaoId, data);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Data da avaliação
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={isConcluida}
              {...register("data_avaliacao")}
            />
            {formState.errors.data_avaliacao && (
              <p className="text-xs text-rose-600">
                {formState.errors.data_avaliacao.message}
              </p>
            )}
          </div>
          <div className="text-xs text-slate-500 pt-6">
            Modelo: {modelo?.nome ?? "—"} · Obrigatória: {avaliacao.obrigatoria ? "Sim" : "Não"} ·{" "}
            Status: {STATUS_AVALIACAO_LABEL[status]}
            {isConcluida && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Avaliação concluída (somente leitura)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {alunos.map((aluno, index) => {
            const alunoField = `alunos.${index}` as const;
            const gruposPorAluno = getValues(`${alunoField}.conceitosPorGrupo`) ?? {};
            return (
              <div
                key={aluno.pessoa_id}
                className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {aluno.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={aluno.foto_url}
                      alt={aluno.nome}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {aluno.nome
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{aluno.nome}</span>
                    <span className="text-xs text-slate-500">Conceito final</span>
                  </div>
                  <select
                    className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
                    value={getValues(`${alunoField}.conceitoFinalId`) ?? ""}
                    disabled={isConcluida}
                    onChange={(e) =>
                      setValue(
                        `${alunoField}.conceitoFinalId`,
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">—</option>
                    {conceitosOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.rotulo ?? c.id}
                      </option>
                    ))}
                  </select>
                </div>

                {grupos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Conceitos por grupo
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {grupos.map((g) => (
                        <div
                          key={g.nome}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">{g.nome}</span>
                            <select
                              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
                              value={gruposPorAluno[g.nome] ?? ""}
                              disabled={isConcluida}
                              onChange={(e) => {
                                const current =
                                  getValues(`${alunoField}.conceitosPorGrupo`) ?? {};
                                setValue(`${alunoField}.conceitosPorGrupo`, {
                                  ...current,
                                  [g.nome]: e.target.value ? Number(e.target.value) : null,
                                });
                              }}
                            >
                              <option value="">—</option>
                              {conceitosOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.rotulo ?? c.id}
                                </option>
                              ))}
                            </select>
                          </div>
                          {g.descricao && (
                            <p className="mt-1 text-[11px] text-slate-500">{g.descricao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Observações
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    rows={2}
                    value={getValues(`${alunoField}.observacoes`) ?? ""}
                    disabled={isConcluida}
                    onChange={(e) =>
                      setValue(`${alunoField}.observacoes`, e.target.value)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href={`/academico/turmas/${avaliacao.turma_id}#avaliacoes`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
        {isConcluida ? (
          <p className="text-sm text-slate-500">
            Esta avaliação está <strong>concluída</strong>. As notas podem ser consultadas, mas não
            podem mais ser alteradas.
          </p>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar resultados"}
          </button>
        )}
      </div>
    </form>
  );
}
