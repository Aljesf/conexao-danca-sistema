"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  status: string;
};

export default function FolhaColaboradoresPage() {
  const router = useRouter();
  const [competencia, setCompetencia] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });
  const [colaboradorId, setColaboradorId] = useState<string>("");
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const qs = useMemo(() => new URLSearchParams({ competencia }).toString(), [competencia]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/folha/colaboradores?${qs}`);
      const j = await r.json();
      setRows(Array.isArray(j?.data) ? j.data : []);
    } finally {
      setLoading(false);
    }
  }

  async function abrirFolha() {
    const raw = colaboradorId.trim();
    const colaboradorIdNum = Number(raw);
    if (!raw || !Number.isFinite(colaboradorIdNum)) return;

    const res = await fetch("/api/admin/folha/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia_ano_mes: competencia, colaborador_id: colaboradorIdNum }),
    });

    const json = (await res.json().catch(() => null)) as { data?: { id?: number } } | null;
    const folhaId = json?.data?.id;

    setColaboradorId("");

    if (folhaId) {
      router.push(`/admin/financeiro/folha/colaboradores/${folhaId}`);
      return;
    }

    await load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Folha - Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Abra e feche a folha por competencia e aplique descontos do Cartao Conexao.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Competencia</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            placeholder="YYYY-MM"
          />
          <label className="text-sm">Colaborador ID</label>
          <input
            className="border rounded px-2 py-1 text-sm w-28"
            value={colaboradorId}
            onChange={(e) => setColaboradorId(e.target.value)}
            placeholder="ID"
          />
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void abrirFolha()}>
            Abrir folha
          </button>
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void load()}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="border rounded">
        <div className="p-3 text-sm border-b flex items-center justify-between">
          <span>{loading ? "Carregando..." : `Folhas encontradas: ${rows.length}`}</span>
        </div>

        <div className="p-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma folha nesta competencia.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <a
                  key={r.id}
                  href={`/admin/financeiro/folha/colaboradores/${r.id}`}
                  className="block border rounded p-3 hover:bg-muted/30"
                >
                  <div className="flex justify-between">
                    <div className="text-sm font-medium">Folha #{r.id}</div>
                    <div className="text-xs">{r.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    competencia: {r.competencia_ano_mes} - colaborador_id: {r.colaborador_id}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
