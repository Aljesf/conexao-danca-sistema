"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CadastrarBeneficiarioForm,
  type BeneficiarioItem,
} from "@/components/movimento/CadastrarBeneficiarioForm";

type Beneficiario = BeneficiarioItem;

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

export default function MovimentoBeneficiariosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Beneficiario[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ ok: boolean; data: Beneficiario[] }>("/api/admin/movimento/beneficiarios")
      .then((r) => {
        if (!alive) return;
        setItems(r.ok ? r.data : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((b) =>
      `${b.pessoa_id} ${b.status} ${b.exercicio_ano ?? ""} ${b.valido_ate ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [items, q]);
  const hojeIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Beneficiarios do Movimento Conexao Banco
              </h1>
              <p className="text-sm text-slate-600">
                Cadastro institucional (porta de entrada) para concessao de creditos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/admin/movimento">
                Voltar ao painel
              </Link>
              <Link className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href="/admin/movimento/creditos">
                Conceder creditos
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Cadastrar beneficiario</h2>
          <CadastrarBeneficiarioForm
            showTitle={false}
            onSuccess={(data) => {
              setItems((prev) => [data, ...prev]);
            }}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Lista</h2>
            <input
              className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por pessoa_id ou status"
            />
          </div>

          {loading ? (
            <div className="text-sm text-slate-600">Carregando...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4">Pessoa</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Exercicio</th>
                    <th className="py-2 pr-4">Valido ate</th>
                    <th className="py-2 pr-4">Vigencia</th>
                    <th className="py-2 pr-4">Criado em</th>
                    <th className="py-2 pr-4">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="py-3 text-slate-600" colSpan={7}>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          Nenhum beneficiario encontrado.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => {
                      const expirado = b.valido_ate ? b.valido_ate < hojeIso : false;
                      return (
                      <tr key={b.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">{b.pessoa_id}</td>
                        <td className="py-2 pr-4">{b.status}</td>
                        <td className="py-2 pr-4">{b.exercicio_ano ?? "-"}</td>
                        <td className="py-2 pr-4">{b.valido_ate ?? "-"}</td>
                        <td className="py-2 pr-4">{b.valido_ate ? (expirado ? "EXPIRADO" : "ATIVO") : "-"}</td>
                        <td className="py-2 pr-4">{new Date(b.criado_em).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          <Link className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50" href={`/admin/movimento/beneficiarios/${b.id}`}>
                            Abrir
                          </Link>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
