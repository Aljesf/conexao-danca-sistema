"use client";

import Link from "next/link";
import { useMemo, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ConceitoAvaliacao, TipoAvaliacao } from "@/types/avaliacoes";
import {
  atualizarModeloAction,
  criarModeloAction,
  type ModeloFormInput,
} from "./actions";

const grupoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do grupo"),
  descricao: z.string().optional(),
  itens: z
    .array(z.string().min(1, "Item não pode ser vazio"))
    .min(1, "Adicione pelo menos um item"),
});

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo_avaliacao: z.enum(
    ["PRATICA", "TEORICA", "DESEMPENHO", "MISTA"] as [
      TipoAvaliacao,
      ...TipoAvaliacao[]
    ],
    { required_error: "Selecione o tipo de avaliação" }
  ),
  obrigatoria: z.boolean().default(false),
  grupos: z.array(grupoSchema).min(1, "Adicione pelo menos um grupo"),
  conceitos_ids: z.array(z.number().int()).min(1, "Selecione ao menos um conceito"),
  ativo: z.boolean().default(true),
});

export function ModeloForm({
  conceitos,
  defaultValues,
  modeloId,
}: {
  conceitos: ConceitoAvaliacao[];
  defaultValues?: Partial<ModeloFormInput>;
  modeloId?: number;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ModeloFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      descricao: defaultValues?.descricao ?? "",
      tipo_avaliacao: (defaultValues?.tipo_avaliacao as TipoAvaliacao | undefined) ?? "PRATICA",
      obrigatoria: defaultValues?.obrigatoria ?? false,
      grupos: defaultValues?.grupos ?? [],
      conceitos_ids: defaultValues?.conceitos_ids ?? [],
      ativo: defaultValues?.ativo ?? true,
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors } } = form;

  const gruposField = useFieldArray({ control, name: "grupos" });

  const grupos = useWatch({ control, name: "grupos" });

  const conceitoOptions = useMemo(
    () => conceitos.filter((c) => c.ativo ?? true),
    [conceitos]
  );

  const onSubmit = (data: ModeloFormInput) => {
    startTransition(async () => {
      const res = modeloId
        ? await atualizarModeloAction(modeloId, data)
        : await criarModeloAction(data);

      if (res?.error) {
        alert(res.error);
      }
    });
  };

  const addGrupo = () => {
    gruposField.append({ nome: "", descricao: "", itens: [""] });
  };

  const removeGrupo = (index: number) => {
    gruposField.remove(index);
  };

  const addItem = (groupIndex: number) => {
    const next = [...(grupos ?? [])];
    next[groupIndex] = {
      ...next[groupIndex],
      itens: [...(next[groupIndex]?.itens ?? []), ""],
    };
    setValue("grupos", next);
  };

  const removeItem = (groupIndex: number, itemIndex: number) => {
    const next = [...(grupos ?? [])];
    next[groupIndex] = {
      ...next[groupIndex],
      itens: (next[groupIndex]?.itens ?? []).filter((_, i) => i !== itemIndex),
    };
    setValue("grupos", next);
  };

  const updateItem = (groupIndex: number, itemIndex: number, value: string) => {
    const next = [...(grupos ?? [])];
    const itens = [...(next[groupIndex]?.itens ?? [])];
    itens[itemIndex] = value;
    next[groupIndex] = { ...next[groupIndex], itens };
    setValue("grupos", next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nome do modelo
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-xs text-rose-600 mt-1">{errors.nome.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tipo de avaliação
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              {...register("tipo_avaliacao")}
            >
              <option value="PRATICA">Prática</option>
              <option value="TEORICA">Teórica</option>
              <option value="DESEMPENHO">Desempenho</option>
              <option value="MISTA">Mista</option>
            </select>
            {errors.tipo_avaliacao && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.tipo_avaliacao.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" className="h-4 w-4" {...register("obrigatoria")} />
            <span className="text-sm text-slate-700">Avaliação obrigatória</span>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" className="h-4 w-4" {...register("ativo")} />
            <span className="text-sm text-slate-700">Modelo ativo</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descrição (opcional)
          </label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            {...register("descricao")}
          />
          {errors.descricao && (
            <p className="text-xs text-rose-600 mt-1">{errors.descricao.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Grupos</p>
              <p className="text-xs text-slate-500">
                Organize os critérios de avaliação em grupos e itens.
              </p>
            </div>
            <button
              type="button"
              onClick={addGrupo}
              className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              + Adicionar grupo
            </button>
          </div>

          {grupos?.length ? (
            <div className="space-y-3">
              {grupos.map((grupo, gIndex) => (
                <div
                  key={gIndex}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="Nome do grupo"
                      value={grupo.nome}
                      onChange={(e) => {
                        const next = [...grupos];
                        next[gIndex] = { ...next[gIndex], nome: e.target.value };
                        setValue("grupos", next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeGrupo(gIndex)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Descrição (opcional)"
                    value={grupo.descricao ?? ""}
                    onChange={(e) => {
                      const next = [...grupos];
                      next[gIndex] = { ...next[gIndex], descricao: e.target.value };
                      setValue("grupos", next);
                    }}
                  />

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Itens
                    </p>
                    {(grupo.itens ?? []).map((item, iIndex) => (
                      <div key={iIndex} className="flex items-center gap-2">
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="Nome do item"
                          value={item}
                          onChange={(e) => updateItem(gIndex, iIndex, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(gIndex, iIndex)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addItem(gIndex)}
                      className="text-xs font-semibold text-violet-700 hover:underline"
                    >
                      + Adicionar item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum grupo adicionado ainda.
            </p>
          )}
          {errors.grupos && (
            <p className="text-xs text-rose-600">{errors.grupos.message as string}</p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Conceitos permitidos</p>
          <p className="text-xs text-slate-500">
            Selecione os conceitos que poderão ser usados neste modelo.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {conceitoOptions.map((c) => {
              const checked = (form.getValues("conceitos_ids") ?? []).includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                    checked ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={(e) => {
                      const current = form.getValues("conceitos_ids") ?? [];
                      if (e.target.checked) {
                        setValue("conceitos_ids", [...current, c.id]);
                      } else {
                        setValue(
                          "conceitos_ids",
                          current.filter((id) => id !== c.id)
                        );
                      }
                    }}
                  />
                  <span>{c.rotulo ?? c.codigo}</span>
                </label>
              );
            })}
          </div>
          {errors.conceitos_ids && (
            <p className="text-xs text-rose-600 mt-1">
              {errors.conceitos_ids.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/escola/academico/avaliacoes/modelos"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar modelo"}
        </button>
      </div>
    </form>
  );
}
