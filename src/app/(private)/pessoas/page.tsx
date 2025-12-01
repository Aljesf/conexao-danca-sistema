"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Pessoa = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo_pessoa: "FISICA" | "JURIDICA";
  ativo: boolean;
  cpf: string | null;
};

export default function PessoasListPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/pessoas");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar pessoas.");
      setPessoas(json.data || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar pessoas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return pessoas;
    return pessoas.filter((p) =>
      [p.nome, p.email, p.cpf].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [pessoas, busca]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold text-slate-900">Pessoas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Lista geral de pessoas cadastradas.
          </p>
        </div>

        <div className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou documento"
              className="input w-full max-w-lg"
            />
            <Link
              href="/pessoas/nova"
              className="ml-auto rounded-full bg-violet-600 px-4 py-2 text-white text-sm font-semibold hover:bg-violet-700"
            >
              + Nova pessoa
            </Link>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma pessoa encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left">Nome</th>
                    <th className="py-2 pr-4 text-left">Tipo</th>
                    <th className="py-2 pr-4 text-left">E-mail</th>
                    <th className="py-2 pr-4 text-left">Telefone</th>
                    <th className="py-2 pr-4 text-left">Situação</th>
                    <th className="py-2 pr-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((pessoa) => (
                    <tr key={pessoa.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-semibold text-slate-800">
                          {pessoa.nome}
                        </div>
                        <div className="text-xs text-slate-500">
                          {pessoa.cpf || "Sem documento"}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        {pessoa.tipo_pessoa === "JURIDICA"
                          ? "Pessoa jurídica"
                          : "Pessoa física"}
                      </td>
                      <td className="py-2 pr-4">{pessoa.email || "-"}</td>
                      <td className="py-2 pr-4">{pessoa.telefone || "-"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            pessoa.ativo
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {pessoa.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Link
                          href={`/pessoas/${pessoa.id}`}
                          className="text-violet-700 hover:underline"
                        >
                          Abrir cadastro
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
