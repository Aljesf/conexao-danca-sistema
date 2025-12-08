"use client";

import { useEffect, useState } from "react";

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type FornecedorLoja = {
  id: number;
  pessoa_id: number;
  pessoa_nome?: string | null;
  pessoa_documento?: string | null;
  ativo?: boolean;
};

export default function FornecedoresLojaPage() {
  const [busca, setBusca] = useState("");
  const [fornecedores, setFornecedores] = useState<FornecedorLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarFornecedores() {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (busca.trim()) {
        params.set("q", busca.trim());
      }

      const res = await fetch(`/api/loja/fornecedores?${params.toString()}`);
      const json: ApiResponse<any[]> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErro(json.error || "Erro ao listar fornecedores.");
        setFornecedores([]);
        return;
      }

      const data = json.data as any[];

      setFornecedores(
        data.map((f) => ({
          id: f.id,
          pessoa_id: f.pessoa_id,
          pessoa_nome: f.pessoa_nome ?? f.pessoas?.nome ?? null,
          pessoa_documento: f.pessoa_documento ?? f.documento_principal ?? null,
          ativo: f.ativo ?? true,
        }))
      );
    } catch (err) {
      console.error("Erro inesperado ao carregar fornecedores:", err);
      setErro("Erro inesperado ao carregar fornecedores.");
      setFornecedores([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Fornecedores — Loja v0</h1>
        <p className="text-xs text-gray-600 mt-1">
          Lista de fornecedores cadastrados para a AJ Dance Store. Esta tela é apenas de
          consulta para a equipe da Loja; cadastros e edições são feitos no painel de
          Administração.
        </p>
      </header>

      <section className="border rounded-lg bg-white p-3 space-y-2">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Buscar fornecedor</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite parte do nome ou documento..."
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={carregarFornecedores}
              className="px-4 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Atualizar lista
            </button>
          </div>
        </div>
        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      </section>

      <section className="border rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase text-gray-500">Fornecedores</h2>
          <span className="text-[11px] text-gray-500">
            {fornecedores.length} fornecedor(es){loading ? " — carregando..." : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-2 py-2">Nome</th>
                <th className="text-left px-2 py-2">Documento</th>
                <th className="text-left px-2 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                fornecedores.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-900">
                        {f.pessoa_nome || `Fornecedor #${f.id}`}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ID fornecedor: {f.id}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {f.pessoa_documento ? (
                        f.pessoa_documento
                      ) : (
                        <span className="text-gray-400">Sem documento</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border " +
                          (f.ativo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-50 text-gray-500")
                        }
                      >
                        {f.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-gray-500">
          Para cadastrar ou editar fornecedores, use o painel de Administração em{" "}
          <span className="font-medium">Administração → Loja (Admin) → Fornecedores</span>.
        </p>
      </section>
    </div>
  );
}
