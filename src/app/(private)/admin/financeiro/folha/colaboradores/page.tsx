"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  colaborador_nome?: string | null;
  status: string;
};

type ColaboradorOpcao = {
  id: number;
  pessoa_id: number | null;
  nome: string;
  ativo: boolean;
};

const STATUS_OPTIONS = ["", "ABERTA", "FECHADA", "PAGA"] as const;

export default function FolhaColaboradoresPage() {
  const router = useRouter();
  const [competencia, setCompetencia] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [colaboradorId, setColaboradorId] = useState<string>("");
  const [colaboradores, setColaboradores] = useState<ColaboradorOpcao[]>([]);
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingColaboradores, setLoadingColaboradores] = useState(false);

  const qs = useMemo(() => {
    const params = new URLSearchParams({ competencia });
    if (statusFiltro) params.set("status", statusFiltro);
    if (colaboradorId) params.set("colaborador_id", colaboradorId);
    return params.toString();
  }, [competencia, statusFiltro, colaboradorId]);

  const colaboradorSelecionado = useMemo(
    () => colaboradores.find((c) => String(c.id) === colaboradorId) ?? null,
    [colaboradores, colaboradorId],
  );

  async function loadColaboradores() {
    setLoadingColaboradores(true);
    try {
      const r = await fetch("/api/admin/colaboradores/opcoes");
      const j = (await r.json().catch(() => null)) as { data?: ColaboradorOpcao[] } | null;
      setColaboradores(Array.isArray(j?.data) ? j.data : []);
    } finally {
      setLoadingColaboradores(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/folha/colaboradores?${qs}`);
      const j = (await r.json().catch(() => null)) as { data?: FolhaRow[] } | null;
      setRows(Array.isArray(j?.data) ? j.data : []);
    } finally {
      setLoading(false);
    }
  }

  async function abrirFolha() {
    const colaboradorIdNum = Number(colaboradorId);
    if (!Number.isFinite(colaboradorIdNum) || colaboradorIdNum <= 0) return;

    const res = await fetch("/api/admin/folha/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia_ano_mes: competencia, colaborador_id: colaboradorIdNum }),
    });

    const json = (await res.json().catch(() => null)) as { data?: { id?: number } } | null;
    const folhaId = json?.data?.id;

    if (folhaId) {
      router.push(`/admin/financeiro/folha/colaboradores/${folhaId}`);
      return;
    }

    await load();
  }

  useEffect(() => {
    void loadColaboradores();
  }, []);

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
            Abra e feche a folha por competência, com importação de descontos do Cartão Conexão.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Competência</label>
          <input
            className="border rounded px-2 py-1 text-sm"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            placeholder="YYYY-MM"
          />

          <label className="text-sm">Colaborador</label>
          <select
            className="border rounded px-2 py-1 text-sm min-w-[240px]"
            value={colaboradorId}
            onChange={(e) => setColaboradorId(e.target.value)}
            disabled={loadingColaboradores}
          >
            <option value="">Todos</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nome} (#{c.id})
              </option>
            ))}
          </select>

          <label className="text-sm">Status</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status || "todos"} value={status}>
                {status || "Todos"}
              </option>
            ))}
          </select>

          <button className="border rounded px-3 py-1 text-sm" onClick={() => void abrirFolha()} disabled={!colaboradorId}>
            Abrir folha
          </button>
          <button className="border rounded px-3 py-1 text-sm" onClick={() => void load()}>
            Atualizar
          </button>
          {colaboradorSelecionado ? (
            <Link className="border rounded px-3 py-1 text-sm" href={`/admin/colaboradores/${colaboradorSelecionado.id}`}>
              Perfil do colaborador
            </Link>
          ) : null}
        </div>
      </div>

      <div className="border rounded">
        <div className="p-3 text-sm border-b flex items-center justify-between">
          <span>{loading ? "Carregando..." : `Folhas encontradas: ${rows.length}`}</span>
        </div>

        <div className="p-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma folha encontrada com os filtros informados.</p>
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
                    competência: {r.competencia_ano_mes} - colaborador: {r.colaborador_nome || `#${r.colaborador_id}`}
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
