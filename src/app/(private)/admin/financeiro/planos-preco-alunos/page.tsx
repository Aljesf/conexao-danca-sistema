"use client";

import * as React from "react";

type Pessoa = {
  id: number;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean | null;
};

export default function AdminFinanceiroPlanosPrecoAlunosPage() {
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [pessoas, setPessoas] = React.useState<Pessoa[]>([]);

  async function buscar() {
    const query = q.trim();
    if (!query) {
      setPessoas([]);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch(`/api/pessoas?search=${encodeURIComponent(query)}`, {
        method: "GET",
      });

      const json = (await res.json()) as { pessoas?: Pessoa[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao buscar pessoas.");

      setPessoas(json.pessoas ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => void buscar(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Planos de preco por aluno</h1>
        <p className="text-sm text-muted-foreground">
          Pesquise uma pessoa e abra a tela para aplicar/visualizar planos de preco.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 items-end md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Buscar pessoa</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, CPF, e-mail ou telefone..."
            />
          </div>
          <button className="rounded-md border px-4 py-2 text-sm" onClick={() => void buscar()} disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Resultados</div>
          <div className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${pessoas.length} resultado(s)`}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3">ID</th>
                <th className="text-left py-2 pr-3">Nome</th>
                <th className="text-left py-2 pr-3">CPF</th>
                <th className="text-left py-2 pr-3">Contato</th>
                <th className="text-left py-2 pr-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-3">{p.id}</td>
                  <td className="py-2 pr-3">{p.nome ?? "-"}</td>
                  <td className="py-2 pr-3">{p.cpf ?? "-"}</td>
                  <td className="py-2 pr-3">{[p.telefone, p.email].filter(Boolean).join(" | ") || "-"}</td>
                  <td className="py-2 pr-3">
                    <a className="underline" href={`/admin/financeiro/pessoas/${p.id}/planos-preco`}>
                      Abrir planos
                    </a>
                  </td>
                </tr>
              ))}

              {!loading && pessoas.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={5}>
                    Digite um termo para buscar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
