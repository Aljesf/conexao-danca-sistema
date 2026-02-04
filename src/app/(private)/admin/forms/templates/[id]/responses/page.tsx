"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Pessoa = { id: number; nome: string | null; telefone?: string | null; email?: string | null };
type Item = {
  id: string;
  status: string;
  status_operacional: string;
  answered_count: number;
  submitted_at: string | null;
  created_at: string;
  pessoa_id: number | null;
  pessoas: Pessoa | null;
};

export default function TemplateResponsesPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");
  const [status, setStatus] = useState<string>("TODOS");

  const statusTabs = useMemo(
    () => [
      { value: "TODOS", label: "Todos" },
      { value: "ENVIADO", label: "Enviados" },
      { value: "EM_ANDAMENTO", label: "Em andamento" },
      { value: "CONCLUIDO", label: "Concluídos" },
    ],
    []
  );

  const statusLabel = useMemo(
    () => ({
      ENVIADO: "Enviado",
      EM_ANDAMENTO: "Em andamento",
      CONCLUIDO: "Concluído",
    }),
    []
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    const qq = q.trim();
    if (status && status !== "TODOS") params.set("status", status);
    if (qq) params.set("q", qq);
    const qs = params.toString();
    const url = qs
      ? `/api/forms/templates/${templateId}/responses?${qs}`
      : `/api/forms/templates/${templateId}/responses`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setItems((json?.items ?? []) as Item[]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [templateId, status, q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Respostas do FormulÃ¡rio</h1>
              <p className="text-sm text-slate-600">
                Veja quem respondeu e acesse cada resposta individual.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href={`/admin/forms/templates/${templateId}/analytics`}
              >
                Ver analytics
              </Link>
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href="/admin/forms/templates"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-medium">Total:</span>{" "}
              {loading ? "Carregando..." : items.length}
            </div>
            <div className="w-full md:w-80">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusTabs.map((tab) => {
              const active = status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Progresso</th>
                  <th className="px-3 py-2 text-left">Preenchido em</th>
                  <th className="px-3 py-2 text-left">AÃ§Ãµes</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={5}>
                      Nenhuma resposta encontrada.
                    </td>
                  </tr>
                )}

                {items.map((it) => {
                  const answered = it.answered_count ?? 0;
                  const submittedAtLabel = it.submitted_at
                    ? new Date(it.submitted_at).toLocaleString("pt-BR")
                    : null;
                  return (
                    <tr key={it.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">
                          {it.pessoas?.nome ?? (it.pessoa_id ? `Pessoa #${it.pessoa_id}` : "Pessoa")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {it.pessoas?.telefone ?? ""}
                          {it.pessoas?.telefone && it.pessoas?.email ? " â€¢ " : ""}
                          {it.pessoas?.email ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                            it.status_operacional === "CONCLUIDO"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : it.status_operacional === "EM_ANDAMENTO"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {statusLabel[it.status_operacional as keyof typeof statusLabel] ??
                            it.status_operacional}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="font-medium text-slate-800">
                          {`Respondidas: ${answered}`}
                        </div>
                        {submittedAtLabel ? (
                          <div className="text-[11px] text-slate-500">
                            {`Enviado em ${submittedAtLabel}`}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {submittedAtLabel ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="text-indigo-600 hover:underline"
                          href={`/admin/forms/submissions/${it.id}`}
                        >
                          Ver resposta
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {loading && (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={5}>
                      Carregando...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


