"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionCard from "@/components/layout/SectionCard";

type AseRow = {
  id: string;
  pessoa_id: number;
  responsavel_legal_pessoa_id: number | null;
  data_analise: string;
  contexto: "ASE_18_PLUS" | "ASE_MENOR";
  status: "RASCUNHO" | "CONCLUIDA" | "REVISADA";
  resultado_status: "NECESSITA_APOIO" | "APOIO_PARCIAL" | "SEM_APOIO" | null;
  created_at: string;
};

export default function AdminMovimentoAnalisesPage() {
  const [rows, setRows] = useState<AseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetch("/api/admin/movimento/analises", { cache: "no-store" })
      .then(async (res) => ({ ok: res.ok, json: await res.json() }))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok || json.ok === false) {
          setErr(json?.codigo || json?.error || "Falha ao carregar analises.");
          return;
        }
        setRows((json.data ?? []) as AseRow[]);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setErr(error instanceof Error ? error.message : "Erro desconhecido");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const total = useMemo(() => rows.length, [rows]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <SectionCard
          title="Movimento - Analises Socioeconomicas (ASE)"
          description="Registro historico datado, vinculado a pessoa (aluno) e, quando aplicavel, ao responsavel legal."
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Total: <b>{total}</b>
            </div>
            <Link
              className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
              href="/admin/movimento/analises/nova"
            >
              Nova ASE
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Lista" description="Clique para abrir e editar/concluir a analise.">
          {loading ? (
            <div className="text-sm text-slate-600">Carregando...</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">Nenhuma analise encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Pessoa</th>
                    <th className="px-3 py-2 text-left">Contexto</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Resultado</th>
                    <th className="px-3 py-2 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2">{r.data_analise}</td>
                      <td className="px-3 py-2">#{r.pessoa_id}</td>
                      <td className="px-3 py-2">{r.contexto}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{r.resultado_status ?? "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <Link className="text-violet-700 hover:underline" href={`/admin/movimento/analises/${r.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
