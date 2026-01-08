"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AbaCuidadosAluno } from "@/components/pessoas/AbaCuidadosAluno";
import { AbaMedidasDeclaradas } from "@/components/pessoas/AbaMedidasDeclaradas";
import { AbaObservacoesGerais } from "@/components/pessoas/AbaObservacoesGerais";
import { AbaObservacoesPedagogicas } from "@/components/pessoas/AbaObservacoesPedagogicas";
import { AbaVinculos } from "@/components/pessoas/AbaVinculos";
import { BairroPicker } from "@/components/enderecos/BairroPicker";
import { CidadePicker } from "@/components/enderecos/CidadePicker";
import { formatCpf, normalizeCpf, validateCpf } from "@/lib/validators/cpf";

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
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPessoaId, setCreatedPessoaId] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneSecundario, setTelefoneSecundario] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [cpfUi, setCpfUi] = useState("");
  const [genero, setGenero] = useState<Pessoa["genero"]>("NAO_INFORMADO");
  const [estadoCivil, setEstadoCivil] =
    useState<Pessoa["estado_civil"] | null>(null);
  const [nacionalidade, setNacionalidade] = useState("");
  const [naturalidade, setNaturalidade] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidadeId, setCidadeId] = useState<number | null>(null);
  const [bairroId, setBairroId] = useState<number | null>(null);
  const [cidadeSelecionada, setCidadeSelecionada] = useState<{ id: number; nome: string; uf: string } | null>(null);
  const [bairroSelecionado, setBairroSelecionado] = useState<{ id: number; nome: string; cidade_id: number } | null>(null);
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [referencia, setReferencia] = useState("");

  const cpfStatus = useMemo(() => {
    const cleaned = normalizeCpf(cpfUi);
    if (!cleaned) return { kind: "empty" as const };
    const v = validateCpf(cleaned);
    return v.ok ? { kind: "ok" as const } : { kind: "bad" as const, reason: v.reason };
  }, [cpfUi]);

  function resetFields() {
    setNome("");
    setNomeSocial("");
    setEmail("");
    setTelefone("");
    setTelefoneSecundario("");
    setNascimento("");
    setCpfUi("");
    setGenero("NAO_INFORMADO");
    setEstadoCivil(null);
    setNacionalidade("");
    setNaturalidade("");
    setTipoPessoa("FISICA");
    setObservacoes("");
    setAtivo(true);
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setCidadeId(null);
    setBairroId(null);
    setCidadeSelecionada(null);
    setBairroSelecionado(null);
    setUf("");
    setCep("");
    setReferencia("");
  }

  function resetAll() {
    resetFields();
    setCreatedPessoaId(null);
    setError(null);
    setSaving(false);
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const logradouroTrim = logradouro.trim();
      const ufTrim = uf.trim().toUpperCase();
      const ufValue = cidadeSelecionada?.uf ?? ufTrim;

      if (!logradouroTrim || !cidadeId || !bairroId) {
        setError("Endereco incompleto. Informe logradouro, cidade e bairro.");
        setSaving(false);
        return;
      }

      const cpfClean = normalizeCpf(cpfUi);
      if (cpfClean) {
        const v = validateCpf(cpfClean);
        if (!v.ok) {
          setError(`CPF invalido (${v.reason}).`);
          setSaving(false);
          return;
        }
      }

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
          cpf: cpfClean.length ? cpfClean : null,
          tipo_pessoa: tipoPessoa,
          observacoes: observacoes || null,
          ativo,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { data?: { id?: number }; error?: string; details?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.details ?? json?.error ?? "Falha ao salvar pessoa.");
      }

      const pessoaId = Number(json?.data?.id);
      if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
        throw new Error("Resposta invalida ao salvar pessoa.");
      }

      const enderecoRes = await fetch(`/api/pessoas/${pessoaId}/endereco`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logradouro: logradouroTrim,
          numero: numero.trim() || null,
          complemento: complemento.trim() || null,
          cidade_id: cidadeId,
          bairro_id: bairroId,
          uf: ufValue,
          cep: cep.trim() || null,
          referencia: referencia.trim() || null,
        }),
      });

      if (!enderecoRes.ok) {
        const enderecoJson = (await enderecoRes.json().catch(() => null)) as { error?: string; details?: string } | null;
        setError(enderecoJson?.details ?? enderecoJson?.error ?? "Erro ao salvar endereco.");
      }

      setCreatedPessoaId(pessoaId);
      resetFields();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao salvar pessoa.";
      setError(message);
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

        {createdPessoaId ? (
          <div className="space-y-6">
            {error ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
            ) : null}
            <div className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Pessoa criada</h2>
                  <p className="mt-1 text-sm text-slate-600">Pessoa criada com sucesso. Continue o cadastro abaixo.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/pessoas/${createdPessoaId}`}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    Abrir ficha
                  </Link>
                  <Link
                    href={`/pessoas/${createdPessoaId}?tab=cuidados`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ir para cuidados
                  </Link>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Criar outro cadastro
                  </button>
                </div>
              </div>
            </div>

            <AbaVinculos pessoaId={createdPessoaId} />
            <AbaCuidadosAluno pessoaId={createdPessoaId} />
            <AbaMedidasDeclaradas pessoaId={createdPessoaId} />
            <AbaObservacoesGerais pessoaId={createdPessoaId} />
            <AbaObservacoesPedagogicas pessoaId={createdPessoaId} />
          </div>
        ) : (
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
                value={cpfUi}
                onChange={(e) => setCpfUi(formatCpf(e.target.value))}
                inputMode="numeric"
                placeholder="000.000.000-00 (opcional)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              />
              {cpfStatus.kind === "bad" ? (
                <p className="mt-1 text-xs text-red-600">
                  CPF invalido ({cpfStatus.reason}). Corrija ou deixe em branco.
                </p>
              ) : cpfStatus.kind === "ok" ? (
                <p className="mt-1 text-xs text-emerald-700">CPF valido.</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Preencha apenas se necessario.</p>
              )}
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-700">Endereco</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Logradouro *
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Numero
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cidade *
                </label>
                <CidadePicker
                  valueId={cidadeId}
                  valueItem={cidadeSelecionada}
                  onChange={(id, item) => {
                    setCidadeId(id);
                    setCidadeSelecionada(item ?? null);
                    setBairroId(null);
                    setBairroSelecionado(null);
                    setUf(item?.uf ?? "");
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bairro *
                </label>
                <BairroPicker
                  cidadeId={cidadeId}
                  valueId={bairroId}
                  valueItem={bairroSelecionado}
                  onChange={(id, item) => {
                    setBairroId(id);
                    setBairroSelecionado(item ?? null);
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  UF *
                </label>
                <input
                  type="text"
                  value={uf}
                  maxLength={2}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  readOnly={Boolean(cidadeId)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  CEP
                </label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Referencia
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                />
              </div>
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
        )}
      </div>
    </div>
  );
}
