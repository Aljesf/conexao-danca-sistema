"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DetalheResp = {
  ok: boolean;
  metodo_liquidacao?: string;
  matricula?: Record<string, unknown>;
  aluno?: Record<string, unknown> | null;
  responsavel_financeiro?: Record<string, unknown> | null;
  turma?: Record<string, unknown> | null;
  cobrancas?: Array<Record<string, unknown>>;
  lancamentos_cartao?: Array<Record<string, unknown>>;
  error?: string;
  message?: string;
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const txt = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(txt);
  } catch {
    data = { raw: txt };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as Record<string, unknown>).message)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export default function MatriculaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<DetalheResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErro(null);
        const d = await fetchJSON<DetalheResp>(`/api/matriculas/operacional/${id}`);
        if (alive) setData(d);
      } catch (e: unknown) {
        if (alive) setErro(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="p-4">
      <div>
        <h1 className="text-xl font-semibold">Matrícula #{id}</h1>
        <p className="text-sm text-muted-foreground">Detalhe operacional (Cartão Conexão / Legado).</p>
      </div>

      {erro ? (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{erro}</div>
      ) : null}

      {!data ? (
        <div className="mt-4 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-4 text-sm">
            <div className="font-medium">Método de liquidação</div>
            <div className="mt-1">{data.metodo_liquidacao ?? data.matricula?.metodo_liquidacao ?? "-"}</div>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <div className="font-medium">Financeiro</div>

            {Array.isArray(data.lancamentos_cartao) && data.lancamentos_cartao.length > 0 ? (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground">Lançamentos no Cartão Conexão</div>
                <ul className="mt-2 list-disc pl-5">
                  {data.lancamentos_cartao.map((l, idx) => (
                    <li key={String((l.id ?? idx) as unknown)} className="py-1">
                      {String(l.descricao ?? "Sem descrição")} — {String(l.valor_centavos ?? "")} —{" "}
                      <span className="text-xs text-muted-foreground">{String(l.status ?? "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(data.cobrancas) && data.cobrancas.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground">Cobranças (Legado)</div>
                <ul className="mt-2 list-disc pl-5">
                  {data.cobrancas.map((c, idx) => (
                    <li key={String((c.id ?? idx) as unknown)} className="py-1">
                      {String(c.descricao ?? "Sem descrição")} — {String(c.valor_centavos ?? "")} —{" "}
                      <span className="text-xs text-muted-foreground">{String(c.status ?? "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(!data.lancamentos_cartao || data.lancamentos_cartao.length === 0) &&
            (!data.cobrancas || data.cobrancas.length === 0) ? (
              <div className="mt-2 text-xs text-muted-foreground">Sem itens financeiros retornados.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
