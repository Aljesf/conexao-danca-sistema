// src/app/pessoas/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Pessoa = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  cpf: string | null;
  tipo_pessoa: "FISICA" | "JURIDICA";
  ativo: boolean;
  observacoes: string | null;
  neofin_customer_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type PageProps = {
  params: { id: string };
};

export default function PessoaDetalhesPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const res = await fetch(`/api/pessoas/${id}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Falha ao carregar pessoa.");
        }

        setPessoa(json.data as Pessoa);
      } catch (err: any) {
        setErro(
          err?.message ||
            "Erro inesperado ao carregar os dados da pessoa."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) carregar();
  }, [id]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
  }

  const tipoLabel =
    pessoa?.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física";

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb + voltar */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="space-x-1">
            <span className="uppercase tracking-wide text-xs text-gray-400">
              Pessoas
            </span>
            <span className="text-gray-400">›</span>
            <span className="font-medium text-gray-600">Detalhes</span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/pessoas")}
            className="inline-flex items-center gap-2 rounded-full border border-purple-200 px-4 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
          >
            ← Voltar para a lista
          </button>
        </div>

        {/* Cabeçalho principal */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {pessoa ? pessoa.nome : "Detalhes da pessoa"}
              </h1>
              <p className="text-sm text-gray-600">
                Visão geral do cadastro desta pessoa. No futuro aqui entram
                matrículas, vínculos, relatórios financeiros e muito mais.
              </p>
            </div>

            {pessoa && (
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {tipoLabel}
                </span>
                <span
                  className={
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium " +
                    (pessoa.ativo
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-red-50 text-red-700 border border-red-100")
                  }
                >
                  {pessoa.ativo ? "Cadastro ativo" : "Cadastro inativo"}
                </span>
              </div>
            )}
          </div>

          {/* “Abas” simples para futuro uso */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="rounded-full bg-gray-900 px-4 py-1.5 font-medium text-white shadow-sm">
              Cadastro
            </button>
            <button className="rounded-full bg-white px-4 py-1.5 font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
              Matrículas
            </button>
            <button className="rounded-full bg-white px-4 py-1.5 font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
              Financeiro
            </button>
            <button className="rounded-full bg-white px-4 py-1.5 font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
              Histórico
            </button>
          </div>
        </header>

        {/* Estado de erro */}
        {erro && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Skeleton */}
        {loading && !erro && (
          <div className="space-y-4">
            <div className="h-20 rounded-2xl bg-white/80 shadow-sm animate-pulse" />
            <div className="h-40 rounded-2xl bg-white/80 shadow-sm animate-pulse" />
            <div className="h-40 rounded-2xl bg-white/80 shadow-sm animate-pulse" />
          </div>
        )}

        {/* Conteúdo principal */}
        {!loading && pessoa && (
          <div className="space-y-6">
            {/* Card: Dados do sistema */}
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="text-base">📄</span>
                  <span>Dados do sistema</span>
                </div>
                {pessoa.neofin_customer_id && (
                  <span className="text-xs text-gray-500">
                    Código Neofin:{" "}
                    <span className="font-mono">
                      {pessoa.neofin_customer_id}
                    </span>
                  </span>
                )}
              </div>

              <div className="grid gap-4 px-5 py-4 text-sm text-gray-700 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    ID
                  </div>
                  <div className="mt-1 font-medium">{pessoa.id}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Criado em
                  </div>
                  <div className="mt-1">{formatDateTime(pessoa.created_at)}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Atualizado em
                  </div>
                  <div className="mt-1">
                    {formatDateTime(pessoa.updated_at)}
                  </div>
                </div>
              </div>
            </section>

            {/* Card: Dados pessoais e contato */}
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <span className="text-base">👤</span>
                <h2 className="text-sm font-semibold text-gray-800">
                  Dados pessoais e contato
                </h2>
              </div>

              <div className="grid gap-6 px-5 py-4 md:grid-cols-2">
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Nome completo
                    </div>
                    <div className="mt-1 font-medium">{pessoa.nome}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Tipo de pessoa
                    </div>
                    <div className="mt-1">{tipoLabel}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      CPF / Documento
                    </div>
                    <div className="mt-1">{pessoa.cpf || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Data de nascimento
                    </div>
                    <div className="mt-1">
                      {formatDate(pessoa.nascimento)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      E-mail
                    </div>
                    <div className="mt-1 break-all">
                      {pessoa.email || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Telefone / WhatsApp
                    </div>
                    <div className="mt-1">
                      {pessoa.telefone || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Card: Observações */}
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <span className="text-base">📝</span>
                <h2 className="text-sm font-semibold text-gray-800">
                  Observações
                </h2>
              </div>
              <div className="px-5 py-4 text-sm text-gray-700">
                {pessoa.observacoes && pessoa.observacoes.trim() !== ""
                  ? pessoa.observacoes
                  : "Nenhuma observação registrada."}
              </div>
            </section>

            {/* Card: Vínculos */}
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <span className="text-base">👥</span>
                <h2 className="text-sm font-semibold text-gray-800">
                  Vínculos no sistema
                </h2>
              </div>
              <div className="px-5 py-4 text-xs text-gray-600">
                Em breve: aluno, responsável, professor, colaborador etc.
                <div className="mt-2 rounded-xl border border-dashed border-purple-200 bg-purple-50/40 px-3 py-2">
                  Aqui vamos listar todos os papéis que esta pessoa exerce
                  (aluno em quais turmas, responsável de quem, professor de
                  quais turmas, colaborador etc.).
                </div>
              </div>
            </section>

            {/* Card: Resumo financeiro / histórico */}
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <span className="text-base">📊</span>
                <h2 className="text-sm font-semibold text-gray-800">
                  Resumo financeiro e histórico
                </h2>
              </div>
              <div className="px-5 py-4 text-xs text-gray-600">
                Este painel poderá virar um “dashboard” resumido desta pessoa,
                com situação financeira, presença em aula, quantidade de
                matrículas, bolsas, entre outros indicadores importantes para o
                Conexão Dados.
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
