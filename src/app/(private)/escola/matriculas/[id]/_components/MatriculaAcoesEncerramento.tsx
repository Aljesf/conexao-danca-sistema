"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matriculaId: number;
  disabled?: boolean;
};

async function postEncerramento(url: string, motivo: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const fallback = `HTTP ${res.status}`;
    if (!data || typeof data !== "object") throw new Error(fallback);
    const msg =
      (typeof (data as Record<string, unknown>).message === "string" &&
        (data as Record<string, unknown>).message) ||
      (typeof (data as Record<string, unknown>).error === "string" &&
        (data as Record<string, unknown>).error) ||
      fallback;
    throw new Error(msg);
  }
  return data;
}

export function MatriculaAcoesEncerramento({ matriculaId, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"encerrar" | "cancelar" | null>(null);

  async function onClick(tipo: "encerrar" | "cancelar") {
    if (disabled || loading) return;

    const motivo = window.prompt(
      tipo === "encerrar"
        ? "Informe o motivo para ENCERRAR a matricula (CONCLUIDA):"
        : "Informe o motivo para CANCELAR a matricula (CANCELADA):",
    );

    if (!motivo || motivo.trim().length < 5) {
      window.alert("Motivo obrigatorio (minimo 5 caracteres).");
      return;
    }

    try {
      setLoading(tipo);
      const url =
        tipo === "encerrar"
          ? `/api/matriculas/${matriculaId}/encerrar`
          : `/api/matriculas/${matriculaId}/cancelar`;

      await postEncerramento(url, motivo.trim());
      window.alert(
        tipo === "encerrar"
          ? "Matricula encerrada com sucesso."
          : "Matricula cancelada com sucesso.",
      );
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao executar a acao.";
      window.alert(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
        onClick={() => void onClick("encerrar")}
        disabled={!!disabled || loading !== null}
      >
        {loading === "encerrar" ? "Encerrando..." : "Encerrar"}
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
        onClick={() => void onClick("cancelar")}
        disabled={!!disabled || loading !== null}
      >
        {loading === "cancelar" ? "Cancelando..." : "Cancelar"}
      </button>
    </div>
  );
}
