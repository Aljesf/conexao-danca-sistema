// src/app/pessoas/page.tsx
"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";

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

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // campos do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  async function carregarPessoas() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/pessoas");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar pessoas.");
      }

      setPessoas(json.data || []);
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao carregar pessoas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPessoas();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pessoas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email: email || null,
          telefone: telefone || null,
          nascimento: nascimento || null,
          cpf: cpf || null,
          tipo_pessoa: tipoPessoa,
          observacoes: observacoes || null,
          ativo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar pessoa.");
      }

      // adiciona a nova pessoa no topo da lista
      setPessoas((prev) => [json.data as Pessoa, ...prev]);

      // limpa o formulário
      setNome("");
      setEmail("");
      setTelefone("");
      setNascimento("");
      setCpf("");
      setTipoPessoa("FISICA");
      setObservacoes("");
      setAtivo(true);
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao salvar pessoa.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Pessoas</h1>
        <p className="text-sm text-gray-600">
          Cadastro central de pessoas do Conexão Dança: alunos, responsáveis,
          professores, colaboradores e clientes da loja. Esta base será usada
          para matrícula, financeiro e integração com a Neofin.
        </p>
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/70 backdrop-blur rounded-xl shadow p-4 space-y-4 max-w-3xl"
      >
        <h2 className="text-lg font-semibold">Nova pessoa</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Nome completo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Tipo de pessoa */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de pessoa
            </label>
            <select
              value={tipoPessoa}
              onChange={(e) =>
                setTipoPessoa(
                  e.target.value === "JURIDICA" ? "JURIDICA" : "FISICA"
                )
              }
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="FISICA">Pessoa Física</option>
              <option value="JURIDICA">Pessoa Jurídica</option>
            </select>
          </div>

          {/* CPF / Documento */}
          <div>
            <label className="block text-sm font-medium mb-1">
              CPF / Documento
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Somente obrigatório para responsável financeiro"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Nascimento */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Data de nascimento
            </label>
            <input
              type="date"
              value={nascimento}
              onChange={(e) => setNascimento(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-2 mt-2">
            <input
              id="ativo"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="ativo" className="text-sm">
              Cadastro ativo
            </label>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium mb-1">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar pessoa"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      {/* Lista de pessoas */}
      <div className="bg-white/70 backdrop-blur rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Pessoas cadastradas</h2>
          {loading && (
            <span className="text-xs text-gray-500">Carregando...</span>
          )}
        </div>

        {pessoas.length === 0 && !loading && (
          <p className="text-sm text-gray-600">
            Nenhuma pessoa cadastrada ainda.
          </p>
        )}

        {pessoas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">CPF / Doc.</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Telefone</th>
                  <th className="py-2 pr-4">Nascimento</th>
                  <th className="py-2 pr-4">Ativo</th>
                  <th className="py-2 pr-4">Criado em</th>
                  <th className="py-2 pr-4">Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {pessoas.map((pessoa) => (
                  <tr key={pessoa.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{pessoa.id}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/pessoas/${pessoa.id}`}
                        className="text-purple-700 hover:underline"
                      >
                        {pessoa.nome}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{pessoa.cpf || "-"}</td>
                    <td className="py-2 pr-4">
                      {pessoa.tipo_pessoa === "JURIDICA"
                        ? "Jurídica"
                        : "Física"}
                    </td>
                    <td className="py-2 pr-4">{pessoa.email || "-"}</td>
                    <td className="py-2 pr-4">{pessoa.telefone || "-"}</td>
                    <td className="py-2 pr-4">
                      {formatDate(pessoa.nascimento)}
                    </td>
                    <td className="py-2 pr-4">
                      {pessoa.ativo ? "Sim" : "Não"}
                    </td>
                    <td className="py-2 pr-4">
                      {formatDateTime(pessoa.created_at)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatDateTime(pessoa.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
