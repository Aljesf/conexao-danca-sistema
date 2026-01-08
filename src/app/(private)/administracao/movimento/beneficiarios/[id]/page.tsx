"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Beneficiario = {
  id: string;
  pessoa_id: string;
  status: "EM_ANALISE" | "APROVADO" | "SUSPENSO" | "ENCERRADO";
  relatorio_socioeconomico: string;
  observacoes?: string | null;
  termo_consentimento_assinado: boolean;
  termo_participacao_assinado: boolean;
  contrato_assinado: boolean;
  criado_em: string;
};

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
      }
    );
    if (!r.ok) return setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
    if (r.data) {
      setItem(r.data);
      setMsg("Salvo com sucesso.");
    }
  }

  async function alterarStatus(status: Beneficiario["status"]) {
    setMsg(null);
    const r = await apiPost<{ ok: boolean; codigo?: string; data?: Beneficiario }>(
      `/api/admin/movimento/beneficiarios/${params.id}/status`,
      { status }
    );
    if (!r.ok) return setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
    if (r.data) {
      setItem(r.data);
      setMsg("Status atualizado.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!item) {
    return <div className="p-6 text-sm text-muted-foreground">Beneficiario nao encontrado.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Beneficiario</h1>
          <p className="text-sm text-muted-foreground">
            Pessoa ID: <span className="font-medium">{item.pessoa_id}</span> • Status:{" "}
            <span className="font-medium">{item.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/beneficiarios">
            Voltar
          </Link>
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/creditos">
            Conceder creditos
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-base font-medium">Ficha</h2>
        <div className="space-y-2">
          <label className="text-sm">Relatorio socioeconomico</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
            value={relatorio}
            onChange={(e) => setRelatorio(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Observacoes</label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-md border text-sm" onClick={salvar}>
            Salvar
          </button>
          {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-base font-medium">Status institucional</h2>
        <div className="flex flex-wrap gap-2">
          {(["EM_ANALISE", "APROVADO", "SUSPENSO", "ENCERRADO"] as const).map((s) => (
            <button key={s} className="px-3 py-2 rounded-md border text-sm" onClick={() => alterarStatus(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          Termos: consentimento={String(item.termo_consentimento_assinado)} • participacao=
          {String(item.termo_participacao_assinado)} • contrato={String(item.contrato_assinado)}
        </div>
      </section>
    </div>
  );
}
