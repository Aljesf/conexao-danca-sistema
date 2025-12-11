"use client";

import { useEffect, useState, type FormEvent } from "react";

type Pessoa = {
  id: number;
  nome: string;
  nome_social: string | null;
  email: string | null;
  telefone: string | null;
  telefone_secundario: string | null;
  nascimento: string | null;
  genero: "MASCULINO" | "FEMININO" | "OUTRO" | "NAO_INFORMADO";
  estado_civil:
    | "SOLTEIRO"
    | "CASADO"
    | "DIVORCIADO"
    | "VIUVO"
    | "UNIAO_ESTAVEL"
    | "OUTRO"
    | null;
  nacionalidade: string | null;
  naturalidade: string | null;
  cpf: string | null;
  tipo_pessoa: "FISICA" | "JURIDICA";
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function NovaPessoaPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneSecundario, setTelefoneSecundario] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [genero, setGenero] = useState<Pessoa["genero"]>("NAO_INFORMADO");
  const [estadoCivil, setEstadoCivil] =
    useState<Pessoa["estado_civil"] | null>(null);
  const [nacionalidade, setNacionalidade] = useState("");
  const [naturalidade, setNaturalidade] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSuccess(false);
  }, [nome, email, telefone, cpf]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/pessoas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          nome_social: nomeSocial || null,
          email: email || null,
          telefone: telefone || null,
          telefone_secundario: telefoneSecundario || null,
          nascimento: nascimento || null,
          genero,
          estado_civil: estadoCivil,
          nacionalidade: nacionalidade || null,
          naturalidade: naturalidade || null,
          cpf: cpf.trim() === "" ? null : cpf,
          tipo_pessoa: tipoPessoa,
          observacoes: observacoes || null,
          ativo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar pessoa.");
      }

      setSuccess(true);

      setNome("");
      setNomeSocial("");
      setEmail("");
      setTelefone("");
      setTelefoneSecundario("");
      setNascimento("");
      setCpf("");
      setGenero("NAO_INFORMADO");
      setEstadoCivil(null);
      setNacionalidade("");
      setNaturalidade("");
      setTipoPessoa("FISICA");
      setObservacoes("");
      setAtivo(true);
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao salvar pessoa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold text-slate-900">Pessoas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastro central de pessoas do Conexão Dança.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Nova pessoa
            </h2>
            {error && (
              <span className="text-sm font-medium text-rose-600">{error}</span>
            )}
            {success && !error && (
              <span className="text-sm font-medium text-green-600">
                Pessoa cadastrada com sucesso.
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nome social
              </label>
              <input
                type="text"
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo de pessoa
              </label>
              <select
                value={tipoPessoa}
                onChange={(e) =>
                  setTipoPessoa(
                    e.target.value === "JURIDICA" ? "JURIDICA" : "FISICA"
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              >
                <option value="FISICA">Pessoa física</option>
                <option value="JURIDICA">Pessoa jurídica</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CPF / Documento
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Opcional (salva como NULL se vazio)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Telefone principal
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Telefone secundário
              </label>
              <input
                type="tel"
                value={telefoneSecundario}
                onChange={(e) => setTelefoneSecundario(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Data de nascimento
              </label>
              <input
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gênero
              </label>
              <select
                value={genero}
                onChange={(e) =>
                  setGenero((e.target.value || "NAO_INFORMADO") as Pessoa["genero"])
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              >
                <option value="NAO_INFORMADO">Não informado</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado civil
              </label>
              <select
                value={estadoCivil || ""}
                onChange={(e) =>
                  setEstadoCivil(
                    (e.target.value || null) as Pessoa["estado_civil"] | null
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              >
                <option value="">Não informado</option>
                <option value="SOLTEIRO">Solteiro(a)</option>
                <option value="CASADO">Casado(a)</option>
                <option value="DIVORCIADO">Divorciado(a)</option>
                <option value="VIUVO">Viúvo(a)</option>
                <option value="UNIAO_ESTAVEL">União estável</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nacionalidade
              </label>
              <input
                type="text"
                value={nacionalidade}
                onChange={(e) => setNacionalidade(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Naturalidade
              </label>
              <input
                type="text"
                value={naturalidade}
                onChange={(e) => setNaturalidade(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="ativo"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-4 w-4"
              />
              <label
                htmlFor="ativo"
                className="text-sm font-medium text-slate-700"
              >
                Cadastro ativo
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar pessoa"}
            </button>
            {error && (
              <span className="text-sm font-medium text-rose-600">{error}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
