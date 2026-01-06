"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  atualizarConceitoAction,
  criarConceitoAction,
} from "./actions";

const schema = z.object({
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  rotulo: z.string().min(1, "Rótulo é obrigatório").max(100),
  descricao: z.string().max(1000).optional().or(z.literal("")),
  ordem: z
    .number({ invalid_type_error: "Informe um número" })
    .int("Use apenas números inteiros")
    .min(1, "Ordem deve ser >= 1")
    .default(1),
  cor_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use o formato #RRGGBB")
    .optional()
    .or(z.literal("")),
  ativo: z.boolean().default(true),
});

export type ConceitoFormData = z.infer<typeof schema>;

export function ConceitoForm({
  defaultValues,
  conceitoId,
}: {
  defaultValues?: Partial<ConceitoFormData>;
  conceitoId?: number;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ConceitoFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      rotulo: defaultValues?.rotulo ?? "",
      descricao: defaultValues?.descricao ?? "",
      ordem: defaultValues?.ordem ?? 1,
      cor_hex: defaultValues?.cor_hex ?? "",
      ativo: defaultValues?.ativo ?? true,
    },
  });

  const onSubmit = (data: ConceitoFormData) => {
    startTransition(async () => {
      const payload = {
        ...data,
        codigo: data.codigo.trim().toUpperCase(),
        rotulo: data.rotulo.trim(),
        descricao: data.descricao?.trim() || null,
        cor_hex: data.cor_hex?.trim() || null,
      };

      const res = conceitoId
        ? await atualizarConceitoAction(conceitoId, payload)
        : await criarConceitoAction(payload);

      if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Código
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              {...register("codigo")}
              onBlur={(e) => setValue("codigo", e.target.value.toUpperCase())}
            />
            {errors.codigo && (
              <p className="text-xs text-rose-600 mt-1">{errors.codigo.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rótulo
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              {...register("rotulo")}
            />
            {errors.rotulo && (
              <p className="text-xs text-rose-600 mt-1">{errors.rotulo.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ordem
            </label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              {...register("ordem", { valueAsNumber: true })}
            />
            {errors.ordem && (
              <p className="text-xs text-rose-600 mt-1">{errors.ordem.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cor (hex)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              placeholder="#7c3aed"
              {...register("cor_hex")}
            />
            {errors.cor_hex && (
              <p className="text-xs text-rose-600 mt-1">{errors.cor_hex.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("ativo")}
              defaultChecked={defaultValues?.ativo ?? true}
            />
            <span className="text-sm text-slate-700">Ativo</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descrição
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
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/escola/academico/avaliacoes/conceitos"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
