"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PessoaAvatar from "@/components/PessoaAvatar";
import EditarFotoModal from "@/components/EditarFotoModal";
import SectionCard from "@/components/layout/SectionCard";
import { PessoaCurriculoToggle } from "@/components/pessoas/PessoaCurriculoToggle";
import { AbaCuidadosAluno } from "@/components/pessoas/AbaCuidadosAluno";
import { AbaMedidasDeclaradas } from "@/components/pessoas/AbaMedidasDeclaradas";
import { AbaObservacoesGerais } from "@/components/pessoas/AbaObservacoesGerais";
import { AbaObservacoesPedagogicas } from "@/components/pessoas/AbaObservacoesPedagogicas";
import { PessoaResumoFinanceiro } from "@/components/pessoas/PessoaResumoFinanceiro";
import { BairroPicker } from "@/components/enderecos/BairroPicker";
import { CidadePicker } from "@/components/enderecos/CidadePicker";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { formatCpf, normalizeCpf, validateCpf } from "@/lib/validators/cpf";
import type { EnderecoPessoa, Pessoa } from "@/types/pessoas";

type AbaId =
  | "dados"
  | "escolar"
  | "observacoes"
  | "cuidados"
  | "medidas"
  | "observacoes_gerais"
  | "observacoes_pedagogicas"
  | "contato"
  | "endereco"
  | "vinculos"
  | "resumo"
  | "sistema";

type LocalEndereco = (Partial<EnderecoPessoa> & { pessoa_id?: number }) | null;

type MatriculaPessoaItem = {
  id: number;
  ano_referencia: number | null;
  status: string | null;
  created_at: string | null;
  servico_nome: string | null;
  unidade_execucao_label: string | null;
};

// calcula idade em anos a partir da data de nascimento (YYYY-MM-DD)
function calcularIdade(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const nascimento = new Date(dateStr);
  if (Number.isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();

  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  if (idade < 0 || idade > 120) return null;
  return idade;
}

// Formata o campo genero em texto legÃ­vel
function formatGenero(
  genero: Pessoa["genero"] | null | undefined
): string | null {
  switch (genero) {
    case "MASCULINO":
      return "Masculino";
    case "FEMININO":
      return "Feminino";
    case "OUTRO":
      return "Outro";
    case "NAO_INFORMADO":
      return "NÃ£o informado";
    default:
      return null;
  }
}


function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function PessoaDetalhesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const supabase = getSupabaseBrowser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [endereco, setEndereco] = useState<LocalEndereco>(null);
  const [cidadeSelecionada, setCidadeSelecionada] = useState<{ id: number; nome: string; uf: string } | null>(null);
  const [bairroSelecionado, setBairroSelecionado] = useState<{ id: number; nome: string; cidade_id: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // campos editÃ¡veis
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
  const [observacoes, setObservacoes] = useState("");

  const cpfStatus = useMemo(() => {
    const cleaned = normalizeCpf(cpfUi);
    if (!cleaned) return { kind: "empty" as const };
    const v = validateCpf(cleaned);
    return v.ok ? { kind: "ok" as const } : { kind: "bad" as const, reason: v.reason };
  }, [cpfUi]);

  const [matriculas, setMatriculas] = useState<MatriculaPessoaItem[]>([]);
  const [matriculasLoading, setMatriculasLoading] = useState(false);
  const [matriculasErro, setMatriculasErro] = useState<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dados");
  const [openFoto, setOpenFoto] = useState(false);

  const applyEndereco = (value: LocalEndereco) => {
    setEndereco(value);
    const cidadeId = value?.cidade_id ?? null;
    const bairroId = value?.bairro_id ?? null;
    const cidadeNome = value?.cidade ?? null;
    const bairroNome = value?.bairro ?? null;
    const ufValue = value?.uf ?? "";

    setCidadeSelecionada(
      cidadeId && cidadeNome ? { id: cidadeId, nome: cidadeNome, uf: ufValue } : null
    );
    setBairroSelecionado(
      bairroId && bairroNome
        ? { id: bairroId, nome: bairroNome, cidade_id: cidadeId ?? 0 }
        : null
    );
  };

  const podeEditar = true;
  useEffect(() => {
    if (!id) return;

    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const { data: userData } = await supabase.auth.getUser();
        setCurrentUserId(userData?.user?.id ?? null);

        const res = await fetch(`/api/pessoas/${id}`);
        const json = await res.json();

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          throw new Error(json.error || "Falha ao carregar pessoa.");
        }

        const data = json.data as Pessoa;
        setPessoa(data);

        // preencher estados locais
        setNome(data.nome ?? "");
        setNomeSocial(data.nome_social ?? "");
        setEmail(data.email ?? "");
        setTelefone(data.telefone ?? "");
        setTelefoneSecundario(data.telefone_secundario ?? "");
        setNascimento(data.nascimento ?? "");
        setCpfUi(formatCpf(data.cpf ?? ""));
        setGenero(data.genero ?? "NAO_INFORMADO");
        setEstadoCivil(data.estado_civil ?? null);
        setNacionalidade(data.nacionalidade ?? "");
        setNaturalidade(data.naturalidade ?? "");
        setObservacoes(data.observacoes ?? "");

        // endereÃ§o vindo da API
        applyEndereco(data.endereco ?? null);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro inesperado ao carregar os dados da pessoa.";
        setErro(msg);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [id, supabase, router]);

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

  function getStatusBadgeInfo(status: string | null) {
    const value = (status ?? "").toUpperCase();
    switch (value) {
      case "ATIVA":
        return {
          label: "ATIVA",
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
      case "TRANCADA":
        return {
          label: "TRANCADA",
          className: "border-amber-200 bg-amber-50 text-amber-700",
        };
      case "CANCELADA":
        return {
          label: "CANCELADA",
          className: "border-rose-200 bg-rose-50 text-rose-700",
        };
      case "CONCLUIDA":
        return {
          label: "CONCLUIDA",
          className: "border-slate-200 bg-slate-100 text-slate-700",
        };
      default:
        return {
          label: status ?? "-",
          className: "border-slate-200 bg-slate-100 text-slate-600",
        };
    }
  }

  const tipoLabel =
    pessoa?.tipo_pessoa === "JURIDICA" ? "Pessoa jurÃ­dica" : "Pessoa fÃ­sica";

  const idade = calcularIdade(pessoa?.nascimento ?? null);
  const generoLabel = pessoa ? formatGenero(pessoa.genero) : null;
  const createdByLabel = pessoa?.created_by_name ?? "-";
  const updatedByLabel = pessoa?.updated_by_name ?? "-";

  const enderecoTitulo = useMemo(
    () => (pessoa?.tipo_pessoa === "JURIDICA" ? "EndereÃ§o fiscal" : "EndereÃ§o"),
    [pessoa?.tipo_pessoa]
  );
  useEffect(() => {
    if (!id || abaAtiva !== "escolar") return;
    let active = true;

    async function carregarMatriculas() {
      try {
        setMatriculasLoading(true);
        setMatriculasErro(null);

        const res = await fetch(`/api/pessoas/${id}/matriculas`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Falha ao carregar matriculas.");
        }

        const rawItems = Array.isArray(json.items)
          ? (json.items as MatriculaPessoaItem[])
          : [];
        const seen = new Set<number>();
        const deduped = rawItems.filter((item) => {
          if (!item || typeof item.id !== "number") return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        if (active) setMatriculas(deduped);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar matriculas.";
        if (active) setMatriculasErro(msg);
      } finally {
        if (active) setMatriculasLoading(false);
      }
    }

    carregarMatriculas();
    return () => {
      active = false;
    };
  }, [id, abaAtiva]);

  async function handleSalvar() {
    if (!pessoa) return;
    try {
      setSaving(true);
      setErro(null);

      let updatedBy = currentUserId;
      if (!updatedBy) {
        const { data: userData } = await supabase.auth.getUser();
        updatedBy = userData?.user?.id ?? null;
      }

      const enderecoAtivo = Boolean(
        endereco?.logradouro ||
          endereco?.numero ||
          endereco?.complemento ||
          endereco?.bairro ||
          endereco?.cidade ||
          endereco?.uf ||
          endereco?.cep ||
          endereco?.referencia ||
          endereco?.cidade_id ||
          endereco?.bairro_id
      );

      if (enderecoAtivo) {
        const logradouroValue = String(endereco?.logradouro ?? "").trim();
        if (!logradouroValue || !endereco?.cidade_id || !endereco?.bairro_id) {
          setErro("Endereco incompleto. Informe logradouro, cidade e bairro.");
          setSaving(false);
          return;
        }
      }

      const cpfParaApi = normalizeCpf(cpfUi);
      if (cpfParaApi) {
        const v = validateCpf(cpfParaApi);
        if (!v.ok) {
          setErro(`CPF invalido (${v.reason}).`);
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`/api/pessoas/${pessoa.id}`, {
        method: "PUT",
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
          cpf: cpfParaApi.length ? cpfParaApi : null,
          observacoes,
          updated_by: updatedBy,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar alteracoes.");
      }

      const data = json.data as Pessoa;
      setPessoa(data);
      applyEndereco(data.endereco ?? null);

      if (enderecoAtivo) {
        const logradouroValue = String(endereco?.logradouro ?? "").trim();
        const ufValue = String(endereco?.uf ?? cidadeSelecionada?.uf ?? "").trim();
        const enderecoRes = await fetch(`/api/pessoas/${pessoa.id}/endereco`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logradouro: logradouroValue,
            numero: endereco?.numero ?? null,
            complemento: endereco?.complemento ?? null,
            cidade_id: endereco?.cidade_id ?? null,
            bairro_id: endereco?.bairro_id ?? null,
            uf: ufValue,
            cep: endereco?.cep ?? null,
            referencia: endereco?.referencia ?? null,
          }),
        });
        const enderecoJson = (await enderecoRes.json().catch(() => null)) as
          | { endereco?: EnderecoPessoa | null; error?: string; details?: string }
          | null;
        if (!enderecoRes.ok) {
          throw new Error(enderecoJson?.details ?? enderecoJson?.error ?? "Erro ao salvar endereco.");
        }
        if (enderecoJson?.endereco) {
          applyEndereco(enderecoJson.endereco);
          setPessoa((prev) => (prev ? { ...prev, endereco: enderecoJson.endereco } : prev));
        }
      }

      setEditMode(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar as alteracoes.";
      setErro(msg);
    } finally {
      setSaving(false);
    }
  }
  const abas: { id: AbaId; label: string; icon: string }[] = [
    { id: "dados", label: "Dados da pessoa", icon: "" },
    { id: "escolar", label: "Dados escolares", icon: "" },
    { id: "observacoes", label: "Observacoes", icon: "" },
    { id: "cuidados", label: "Cuidados do aluno", icon: "" },
    { id: "medidas", label: "Medidas", icon: "" },
    { id: "observacoes_gerais", label: "Observacoes gerais", icon: "" },
    { id: "observacoes_pedagogicas", label: "Observacoes pedagogicas", icon: "" },
    { id: "contato", label: "Informacoes de contato", icon: "" },
    { id: "endereco", label: "Endereco", icon: "" },
    { id: "vinculos", label: "Vinculos no sistema", icon: "" },
    { id: "resumo", label: "Resumo financeiro", icon: "" },
    { id: "sistema", label: "Dados do sistema", icon: "" },
  ];
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Topo: breadcrumb + voltar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 md:text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pessoas
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">Detalhes</span>
          </div>

          <div className="flex items-center gap-2">
            <PessoaCurriculoToggle pessoaId={Number(id)} curriculoHref={`/pessoas/${id}/curriculo`} />
            <button
              type="button"
              onClick={() => router.push("/pessoas")}
              className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-1.5 text-[11px] font-medium text-violet-700 shadow-sm backdrop-blur hover:bg-violet-50 md:text-xs"
            >
              <span className="text-sm">?</span>
              Voltar para a lista
            </button>
          </div>
        </div>

        {/* CabeÃ§alho com avatar grande e status */}
        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col items-center gap-4 md:flex-row md:items-center">
              <PessoaAvatar
                name={pessoa?.nome ?? ""}
                fotoUrl={pessoa?.foto_url ?? null}
                onClick={() => setOpenFoto(true)}
              />

              <div className="text-center md:text-left">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                  {pessoa ? pessoa.nome : "Carregando pessoa..."}
                </h1>

                {idade !== null && (
                  <p className="mt-1 text-base font-medium text-slate-600">
                    {idade} {idade === 1 ? "ano" : "anos"}
                  </p>
                )}

                {nomeSocial && (
                  <p className="mt-0.5 text-sm text-slate-600">
                    Nome social: {nomeSocial}
                  </p>
                )}

                {generoLabel && (
                  <p className="mt-0.5 text-sm text-slate-600">
                    GÃªnero: {generoLabel}
                  </p>
                )}

                <p className="mt-2 max-w-xl text-[15px] text-slate-600">
                  VisÃ£o geral deste cadastro. Aqui vocÃª pode consultar e, se
                  tiver permissÃ£o, editar os dados da pessoa.
                </p>

                {pessoa?.telefone && (
                  <p className="mt-3 flex items-center justify-center gap-2 text-base font-medium text-slate-700 md:justify-start">
                    <span className="text-lg">??</span>
                    <span>{pessoa.telefone}</span>
                  </p>
                )}
              </div>
            </div>

            {pessoa && (
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[11px] font-medium text-slate-400 md:text-xs">
                    {tipoLabel}
                  </span>

                  <span
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm md:text-sm " +
                      (pessoa.ativo
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700")
                    }
                  >
                    <span
                      className={
                        "h-2 w-2 rounded-full " +
                        (pessoa.ativo ? "bg-emerald-500" : "bg-rose-500")
                      }
                    />
                    {pessoa.ativo ? "Cadastro ativo" : "Cadastro inativo"}
                  </span>
                </div>

                {podeEditar && (
                  <div className="flex gap-2">
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!pessoa) return;
                          setNome(pessoa.nome ?? "");
                          setNomeSocial(pessoa.nome_social ?? "");
                          setEmail(pessoa.email ?? "");
                          setTelefone(pessoa.telefone ?? "");
                          setTelefoneSecundario(
                            pessoa.telefone_secundario ?? ""
                          );
                          setNascimento(pessoa.nascimento ?? "");
                          setCpfUi(formatCpf(pessoa.cpf ?? ""));
                          setGenero(pessoa.genero ?? "NAO_INFORMADO");
                          setEstadoCivil(pessoa.estado_civil ?? null);
                          setNacionalidade(pessoa.nacionalidade ?? "");
                          setNaturalidade(pessoa.naturalidade ?? "");
                          setObservacoes(pessoa.observacoes ?? "");
                          applyEndereco(pessoa.endereco ?? null);
                          setEditMode(false);
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 md:text-sm"
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={editMode ? handleSalvar : () => setEditMode(true)}
                      disabled={saving}
                      className="inline-flex items-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70 md:text-sm"
                    >
                      {saving
                        ? "Salvando..."
                        : editMode
                        ? "Salvar alteraÃ§Ãµes"
                        : "Editar dados"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Estado de erro */}
        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm md:text-base">
            {erro}
          </div>
        )}

        {/* Skeleton */}
        {loading && !erro && (
          <div className="space-y-4">
            <div className="h-20 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
            <div className="h-40 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
            <div className="h-40 rounded-3xl bg-white/70 shadow-sm backdrop-blur animate-pulse" />
          </div>
        )}

        {/* ConteÃºdo principal */}
        {!loading && pessoa && (
          <>
            {/* NAV de ABAS */}
            <nav className="flex flex-wrap gap-2 text-sm">
              {abas.map((aba) => {
                const ativa = abaAtiva === aba.id;
                return (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaAtiva(aba.id)}
                    className={
                      "inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition " +
                      (ativa
                        ? "bg-slate-900 text-slate-50 shadow-sm"
                        : "border border-slate-200 bg-white/70 text-slate-600 hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700")
                    }
                  >
                    <span>{aba.icon}</span>
                    <span>{aba.label}</span>
                  </button>
                );
              })}
            </nav>
            {/* ConteÃºdo das abas */}
            <div className="rounded-3xl border border-violet-100 bg-white/95 p-6 text-[15px] text-slate-700 shadow-sm backdrop-blur-sm md:p-7">
              {/* Aba: Dados da pessoa */}
              {abaAtiva === "dados" && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Dados da pessoa
                  </h2>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">Nome completo</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1 font-medium text-slate-800">
                            {nome || "-"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Nome social</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={nomeSocial}
                            onChange={(e) => setNomeSocial(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1">{nomeSocial || "-"}</p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-400">CPF</p>
                          {editMode ? (
                            <div>
                              <input
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                                value={cpfUi}
                                onChange={(e) => setCpfUi(formatCpf(e.target.value))}
                                inputMode="numeric"
                                placeholder="000.000.000-00"
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
                          ) : (
                            <p className="mt-1">{cpfUi || "-"}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-slate-400">
                            Data de nascimento
                          </p>
                          {editMode ? (
                            <input
                              type="date"
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={nascimento}
                              onChange={(e) => setNascimento(e.target.value)}
                            />
                          ) : (
                            <p className="mt-1">
                              {formatDate(pessoa.nascimento)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-400">GÃªnero</p>
                          {editMode ? (
                            <select
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={genero}
                              onChange={(e) =>
                                setGenero(e.target.value as Pessoa["genero"])
                              }
                            >
                              <option value="NAO_INFORMADO">
                                NÃ£o informado
                              </option>
                              <option value="MASCULINO">Masculino</option>
                              <option value="FEMININO">Feminino</option>
                              <option value="OUTRO">Outro</option>
                            </select>
                          ) : (
                            <p className="mt-1">{generoLabel || "-"}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-slate-400">Estado civil</p>
                          {editMode ? (
                            <select
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={estadoCivil || ""}
                              onChange={(e) =>
                                setEstadoCivil(
                                  (e.target.value ||
                                    null) as Pessoa["estado_civil"] | null
                                )
                              }
                            >
                              <option value="">NÃ£o informado</option>
                              <option value="SOLTEIRO">Solteiro(a)</option>
                              <option value="CASADO">Casado(a)</option>
                              <option value="DIVORCIADO">Divorciado(a)</option>
                              <option value="VIUVO">ViÃºvo(a)</option>
                              <option value="UNIAO_ESTAVEL">
                                UniÃ£o estÃ¡vel
                              </option>
                              <option value="OUTRO">Outro</option>
                            </select>
                          ) : (
                            <p className="mt-1">
                              {estadoCivil ? estadoCivil : "NÃ£o informado"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">Nacionalidade</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={nacionalidade}
                            onChange={(e) => setNacionalidade(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1">{nacionalidade || "-"}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Naturalidade</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={naturalidade}
                            onChange={(e) => setNaturalidade(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1">{naturalidade || "-"}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Tipo de pessoa</p>
                        <p className="mt-1">
                          {pessoa.tipo_pessoa === "JURIDICA"
                            ? "Pessoa jurÃ­dica"
                            : "Pessoa fÃ­sica"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Idade</p>
                        <p className="mt-1">{idade ?? "NÃ£o informado"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba: Dados escolares */}
              {abaAtiva === "escolar" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Dados escolares
                  </h2>

                  <SectionCard title="Matriculas e vinculos escolares">
                    {matriculasLoading && (
                      <p className="text-sm text-slate-600">
                        Carregando matriculas...
                      </p>
                    )}

                    {matriculasErro && (
                      <p className="text-sm text-rose-600">{matriculasErro}</p>
                    )}

                    {!matriculasLoading &&
                      !matriculasErro &&
                      matriculas.length === 0 && (
                        <p className="text-sm text-slate-600">
                          Nenhuma matricula vinculada a esta pessoa.
                        </p>
                      )}

                    {!matriculasLoading &&
                      !matriculasErro &&
                      matriculas.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-[720px] w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="py-2 pr-3">Ano</th>
                                <th className="py-2 pr-3">Curso/Servico</th>
                                <th className="py-2 pr-3">Turma/UE</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">Criada em</th>
                                <th className="py-2 text-right">Acao</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {matriculas.map((item) => {
                                const badge = getStatusBadgeInfo(item.status);
                                return (
                                  <tr key={item.id} className="align-top">
                                    <td className="py-3 pr-3">
                                      {item.ano_referencia ?? "-"}
                                    </td>
                                    <td className="py-3 pr-3">
                                      {item.servico_nome ?? "-"}
                                    </td>
                                    <td className="py-3 pr-3">
                                      <span
                                        title={
                                          item.unidade_execucao_label ?? undefined
                                        }
                                      >
                                        {item.unidade_execucao_label ?? "-"}
                                      </span>
                                    </td>
                                    <td className="py-3 pr-3">
                                      <span
                                        className={
                                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                                          badge.className
                                        }
                                      >
                                        {badge.label}
                                      </span>
                                    </td>
                                    <td className="py-3 pr-3">
                                      {formatDateTime(item.created_at)}
                                    </td>
                                    <td className="py-3 text-right">
                                      <Link
                                        href={`/escola/matriculas/${item.id}`}
                                        className="text-xs font-medium text-violet-600 hover:underline"
                                      >
                                        Abrir
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </SectionCard>
                </div>
              )}
              {/* Aba: Observacoes */}
              {abaAtiva === "observacoes" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Observacoes
                  </h2>
                  {editMode ? (
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      rows={4}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
                  ) : (
                    <p className="text-slate-700">
                      {observacoes || "Nenhuma observacao registrada."}
                    </p>
                  )}
                </div>
              )}

              {abaAtiva === "cuidados" && (
                pessoa?.id ? (
                  <AbaCuidadosAluno pessoaId={pessoa.id} />
                ) : (
                  <SectionCard title="Cuidados do aluno">
                    <p className="text-sm text-slate-600">Carregando...</p>
                  </SectionCard>
                )
              )}

              {abaAtiva === "medidas" && (
                pessoa?.id ? (
                  <AbaMedidasDeclaradas pessoaId={pessoa.id} />
                ) : (
                  <SectionCard title="Medidas declaradas">
                    <p className="text-sm text-slate-600">Carregando...</p>
                  </SectionCard>
                )
              )}

              {abaAtiva === "observacoes_gerais" && (
                pessoa?.id ? (
                  <AbaObservacoesGerais pessoaId={pessoa.id} />
                ) : (
                  <SectionCard title="Observacoes gerais">
                    <p className="text-sm text-slate-600">Carregando...</p>
                  </SectionCard>
                )
              )}

              {abaAtiva === "observacoes_pedagogicas" && (
                pessoa?.id ? (
                  <AbaObservacoesPedagogicas pessoaId={pessoa.id} />
                ) : (
                  <SectionCard title="Observacoes pedagogicas">
                    <p className="text-sm text-slate-600">Carregando...</p>
                  </SectionCard>
                )
              )}
              {/* Aba: Contato */}
              {abaAtiva === "contato" && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    InformaÃ§Ãµes de contato
                  </h2>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">E-mail</p>
                        {editMode ? (
                          <input
                            type="email"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1">{email || "-"}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Telefone principal
                        </p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                          />
                        ) : (
                          <p className="mt-1">{telefone || "-"}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">
                          Telefone secundÃ¡rio
                        </p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={telefoneSecundario}
                            onChange={(e) =>
                              setTelefoneSecundario(e.target.value)
                            }
                          />
                        ) : (
                          <p className="mt-1">{telefoneSecundario || "-"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {abaAtiva === "endereco" && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    {enderecoTitulo}
                  </h2>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">Logradouro</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={endereco?.logradouro ?? ""}
                            onChange={(e) =>
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                logradouro: e.target.value || null,
                              }))
                            }
                          />
                        ) : (
                          <p className="mt-1">{endereco?.logradouro || "-"}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Bairro</p>
                        {editMode ? (
                          <BairroPicker
                            cidadeId={endereco?.cidade_id ?? null}
                            valueId={endereco?.bairro_id ?? null}
                            valueItem={bairroSelecionado}
                            onChange={(id, item) => {
                              setBairroSelecionado(item ?? null);
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                bairro_id: id,
                                bairro: item?.nome ?? null,
                              }));
                            }}
                          />
                        ) : (
                          <p className="mt-1">{endereco?.bairro || "-"}</p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-400">Numero</p>
                          {editMode ? (
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={endereco?.numero ?? ""}
                              onChange={(e) =>
                                setEndereco((old) => ({
                                  ...(old ?? { pessoa_id: pessoa.id }),
                                  numero: e.target.value || null,
                                }))
                              }
                            />
                          ) : (
                            <p className="mt-1">{endereco?.numero || "-"}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-slate-400">Complemento</p>
                          {editMode ? (
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={endereco?.complemento ?? ""}
                              onChange={(e) =>
                                setEndereco((old) => ({
                                  ...(old ?? { pessoa_id: pessoa.id }),
                                  complemento: e.target.value || null,
                                }))
                              }
                            />
                          ) : (
                            <p className="mt-1">{endereco?.complemento || "-"}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-400">Cidade</p>
                        {editMode ? (
                          <CidadePicker
                            valueId={endereco?.cidade_id ?? null}
                            valueItem={cidadeSelecionada}
                            onChange={(id, item) => {
                              setCidadeSelecionada(item ?? null);
                              setBairroSelecionado(null);
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                cidade_id: id,
                                cidade: item?.nome ?? null,
                                uf: item?.uf ?? old?.uf ?? null,
                                bairro_id: null,
                                bairro: null,
                              }));
                            }}
                          />
                        ) : (
                          <p className="mt-1">{endereco?.cidade || "-"}</p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-400">Estado (UF)</p>
                          {editMode ? (
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={endereco?.uf ?? ""}
                              readOnly={Boolean(endereco?.cidade_id)}
                              onChange={(e) =>
                                setEndereco((old) => ({
                                  ...(old ?? { pessoa_id: pessoa.id }),
                                  uf: e.target.value || null,
                                }))
                              }
                            />
                          ) : (
                            <p className="mt-1">{endereco?.uf || "-"}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-slate-400">CEP</p>
                          {editMode ? (
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={endereco?.cep ?? ""}
                              onChange={(e) =>
                                setEndereco((old) => ({
                                  ...(old ?? { pessoa_id: pessoa.id }),
                                  cep: e.target.value || null,
                                }))
                              }
                            />
                          ) : (
                            <p className="mt-1">{endereco?.cep || "-"}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Referencia</p>
                        {editMode ? (
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={endereco?.referencia ?? ""}
                            onChange={(e) =>
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                referencia: e.target.value || null,
                              }))
                            }
                          />
                        ) : (
                          <p className="mt-1">{endereco?.referencia || "-"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba: Vinculos */}
              {abaAtiva === "vinculos" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Vinculos no sistema
                  </h2>
                  <p className="text-slate-600">Nenhum vinculo cadastrado ainda.</p>
                </div>
              )}

              {/* Aba: Resumo */}
              {abaAtiva === "resumo" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Resumo financeiro
                  </h2>
                  <PessoaResumoFinanceiro pessoaId={pessoa.id} />
                </div>
              )}

              {/* Aba: Sistema */}
              {abaAtiva === "sistema" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Dados do sistema
                  </h2>

                  <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        ID
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {pessoa.id}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Criado em
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDateTime(pessoa.created_at)} por {createdByLabel}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Atualizado em
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {formatDateTime(pessoa.updated_at)} por {updatedByLabel}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Status
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {pessoa.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* MODAL DE FOTO */}
            <EditarFotoModal
              open={openFoto}
              onClose={() => setOpenFoto(false)}
              pessoaId={pessoa.id}
              onUploaded={(novaUrl: string) =>
                setPessoa({ ...pessoa, foto_url: novaUrl })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
















