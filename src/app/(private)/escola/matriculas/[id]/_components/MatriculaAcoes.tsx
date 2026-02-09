/* [INÍCIO DO BLOCO] src/app/(private)/escola/matriculas/[id]/_components/MatriculaAcoes.tsx (novo) */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { matriculaId: number };

async function post(url: string, motivo: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    if (!data || typeof data !== "object") throw new Error(`HTTP ${res.status}`);
    const rec = data as Record<string, unknown>;
    throw new Error(
      (typeof rec.message === "string" && rec.message) ||
        (typeof rec.error === "string" && rec.error) ||
        `HTTP ${res.status}`,
    );
  }

  return data;
}

export function MatriculaAcoes({ matriculaId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "concluir" | "cancelar">(null);

  async function concluirPeriodo() {
    const motivo = window.prompt(
      "CONCLUIR PERÍODO (use somente no fim do período letivo).\n\nInforme o motivo/observação:",
    );
    if (!motivo || motivo.trim().length < 5) {
      window.alert("Motivo obrigatório (mín. 5 caracteres).");
      return;
    }

    const ok = window.confirm(
      "Confirma CONCLUIR o período letivo desta matrícula?\n\nIsso deve ser usado apenas no fim do período.",
    );
    if (!ok) return;

    try {
      setLoading("concluir");
      await post(`/api/matriculas/${matriculaId}/concluir`, motivo.trim());
      window.alert("Matrícula concluída. Recarregando...");
      router.refresh();
    } catch (e) {
      window.alert(`Falha ao concluir: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    } finally {
      setLoading(null);
    }
  }

  async function cancelarMatricula() {
    const motivo = window.prompt(
      "CANCELAR MATRÍCULA (aluno saiu / interrompeu vínculo).\n\nInforme o motivo:",
    );
    if (!motivo || motivo.trim().length < 5) {
      window.alert("Motivo obrigatório (mín. 5 caracteres).");
      return;
    }

    const ok = window.confirm(
      "Confirma CANCELAR esta matrícula?\n\nUse quando o aluno saiu antes do fim do período.",
    );
    if (!ok) return;

    try {
      setLoading("cancelar");
      await post(`/api/matriculas/${matriculaId}/cancelar`, motivo.trim());
      window.alert("Matrícula cancelada. Recarregando...");
      router.refresh();
    } catch (e) {
      window.alert(`Falha ao cancelar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="px-4 py-2 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        onClick={() => void concluirPeriodo()}
        disabled={loading !== null}
        title="Concluir período letivo"
      >
        {loading === "concluir" ? "Concluindo..." : "Concluir período"}
      </button>

      <button
        type="button"
        className="px-4 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
        onClick={() => void cancelarMatricula()}
        disabled={loading !== null}
        title="Cancelar matrícula (aluno saiu)"
      >
        {loading === "cancelar" ? "Cancelando..." : "Cancelar matrícula"}
      </button>
    </div>
  );
}
/* [FIM DO BLOCO] */
