"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Beneficiario = {
  id: string;
  pessoa_id: number | string;
  status: string;
  relatorio_socioeconomico: string;
  observacoes?: string | null;
  termo_consentimento_assinado: boolean;
  termo_participacao_assinado: boolean;
  contrato_assinado: boolean;
  criado_em: string;
  pessoas?: {
    id: number;
    nome?: string | null;
    cpf?: string | null;
    email?: string | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  EM_ANALISE: "Em analise",
  APROVADO: "Aprovado",
  SUSPENSO: "Suspenso",
  ENCERRADO: "Encerrado",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  OK: "Conferido",
};

function formatStatus(status: string | null | undefined) {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status;
}

type StatusAcao = "EM_ANALISE" | "APROVADO" | "SUSPENSO" | "ENCERRADO";

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}
async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}
async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export default function BeneficiarioDetalhePage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Beneficiario | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [relatorio, setRelatorio] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ ok: boolean; data: Beneficiario }>(`/api/admin/movimento/beneficiarios/${params.id}`)
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setItem(r.data);
          setRelatorio(r.data.relatorio_socioeconomico ?? "");
          setObs(r.data.observacoes ?? "");
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params.id]);

  async function salvar() {
    setMsg(null);
    const r = await apiPut<{ ok: boolean; codigo?: string; data?: Beneficiario }>(
      `/api/admin/movimento/beneficiarios/${params.id}`,
      {
        relatorio_socioeconomico: relatorio,
        observacoes: obs || undefined,
      },
    );
    if (!r.ok) return setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
    if (r.data) {
      setItem(r.data);
      setMsg("Salvo com sucesso.");
    }
  }

  async function alterarStatus(status: StatusAcao) {
    setMsg(null);
    const r = await apiPost<{ ok: boolean; codigo?: string; data?: Beneficiario }>(
      `/api/admin/movimento/beneficiarios/${params.id}/status`,
      { status },
    );
    if (!r.ok) return setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
    if (r.data) {
      setItem(r.data);
      setMsg("Status atualizado.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Carregando...
        </div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Beneficiario nao encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Beneficiario</h1>
              <p className="text-sm text-slate-600">
                Pessoa:{" "}
                <span className="font-medium">
                  {item.pessoas?.nome ?? `#${item.pessoa_id}`}
                </span>{" "}
                | Status: <span className="font-medium">{formatStatus(item.status)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
                href="/admin/movimento/beneficiarios"
              >
                Voltar
              </Link>
              <Link
                className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
                href={`/pessoas/${item.pessoas?.id ?? item.pessoa_id}`}
              >
                Abrir pessoa
              </Link>
              <Link
                className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
                href="/admin/movimento/creditos"
              >
                Conceder creditos
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Ficha</h2>
          <div className="space-y-2">
            <label className="text-sm">Relatorio socioeconomico</label>
            <textarea
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm min-h-[120px]"
              value={relatorio}
              onChange={(e) => setRelatorio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Observacoes</label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={salvar}
            >
              Salvar
            </button>
            {msg ? <span className="text-sm text-slate-600">{msg}</span> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Status institucional</h2>
          <div className="flex flex-wrap gap-2">
            {(["EM_ANALISE", "APROVADO", "SUSPENSO", "ENCERRADO"] as const).map((s) => (
              <button
                key={s}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => alterarStatus(s)}
              >
                {formatStatus(s)}
              </button>
            ))}
          </div>

          <div className="text-sm text-slate-600">
            Termos: consentimento={String(item.termo_consentimento_assinado)} | participacao=
            {String(item.termo_participacao_assinado)} | contrato={String(item.contrato_assinado)}
          </div>
        </section>
      </div>
    </div>
  );
}
