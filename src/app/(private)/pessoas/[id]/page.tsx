"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PessoaAvatar from "@/components/PessoaAvatar";
import EditarFotoModal from "@/components/EditarFotoModal";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { EnderecoPessoa, Pessoa } from "@/types/pessoas";

type AbaId =
  | "dados"
  | "observacoes"
  | "contato"
  | "endereco"
  | "vinculos"
  | "resumo"
  | "sistema";

type LocalEndereco = (Partial<EnderecoPessoa> & { pessoa_id?: number }) | null;

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

// Formata o campo genero em texto legível
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
      return "Não informado";
    default:
      return null;
  }
}

export default function PessoaDetalhesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const supabase = getSupabaseBrowser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [endereco, setEndereco] = useState<LocalEndereco>(null);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // campos editáveis
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
  const [observacoes, setObservacoes] = useState("");

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dados");
  const [openFoto, setOpenFoto] = useState(false);

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
        setCpf(data.cpf ?? "");
        setGenero(data.genero ?? "NAO_INFORMADO");
        setEstadoCivil(data.estado_civil ?? null);
        setNacionalidade(data.nacionalidade ?? "");
        setNaturalidade(data.naturalidade ?? "");
        setObservacoes(data.observacoes ?? "");

        // endereço vindo da API
        setEndereco((data as any).endereco ?? null);
      } catch (err: any) {
        setErro(
          err?.message || "Erro inesperado ao carregar os dados da pessoa."
        );
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [id, supabase]);

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

  const tipoLabel =
    pessoa?.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física";

  const idade = calcularIdade(pessoa?.nascimento ?? null);
  const generoLabel = pessoa ? formatGenero(pessoa.genero) : null;
  const createdByLabel = pessoa?.created_by_name ?? "—";
  const updatedByLabel = pessoa?.updated_by_name ?? "—";

  const enderecoTitulo = useMemo(
    () => (pessoa?.tipo_pessoa === "JURIDICA" ? "Endereço fiscal" : "Endereço"),
    [pessoa?.tipo_pessoa]
  );

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

      const res = await fetch(`/api/pessoas/${pessoa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          nome_social: nomeSocial || null,
          email,
          telefone,
          telefone_secundario: telefoneSecundario || null,
          nascimento: nascimento || null,
          genero,
          estado_civil: estadoCivil,
          nacionalidade: nacionalidade || null,
          naturalidade: naturalidade || null,
          cpf,
          observacoes,
          endereco,
          updated_by: updatedBy,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar alterações.");
      }

      const data = json.data as Pessoa;
      setPessoa(data);
      setEndereco((data as any).endereco ?? null);
      setEditMode(false);
    } catch (err: any) {
      setErro(err?.message || "Erro inesperado ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  const abas: { id: AbaId; label: string; icon: string }[] = [
    { id: "dados", label: "Dados da pessoa", icon: "??" },
    { id: "observacoes", label: "Observações", icon: "??" },
    { id: "contato", label: "Informações de contato", icon: "??" },
    { id: "endereco", label: enderecoTitulo, icon: "??" },
    { id: "vinculos", label: "Vínculos no sistema", icon: "??" },
    { id: "resumo", label: "Resumo financeiro", icon: "??" },
    { id: "sistema", label: "Dados do sistema", icon: "??" },
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
            <Link
              href={`/pessoas/${id}/curriculo`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-slate-50 md:text-xs"
            >
              Currículo
            </Link>
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

        {/* Cabeçalho com avatar grande e status */}
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
                    Gênero: {generoLabel}
                  </p>
                )}

                <p className="mt-2 max-w-xl text-[15px] text-slate-600">
                  Visão geral deste cadastro. Aqui você pode consultar e, se
                  tiver permissão, editar os dados da pessoa.
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
                          setCpf(pessoa.cpf ?? "");
                          setGenero(pessoa.genero ?? "NAO_INFORMADO");
                          setEstadoCivil(pessoa.estado_civil ?? null);
                          setNacionalidade(pessoa.nacionalidade ?? "");
                          setNaturalidade(pessoa.naturalidade ?? "");
                          setObservacoes(pessoa.observacoes ?? "");
                          setEndereco((pessoa as any).endereco ?? null);
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
                        ? "Salvar alterações"
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

        {/* Conteúdo principal */}
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
            {/* Conteúdo das abas */}
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
                            <input
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={cpf}
                              onChange={(e) => setCpf(e.target.value)}
                            />
                          ) : (
                            <p className="mt-1">{cpf || "-"}</p>
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
                          <p className="text-sm text-slate-400">Gênero</p>
                          {editMode ? (
                            <select
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={genero}
                              onChange={(e) =>
                                setGenero(e.target.value as Pessoa["genero"])
                              }
                            >
                              <option value="NAO_INFORMADO">
                                Não informado
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
                              <option value="">Não informado</option>
                              <option value="SOLTEIRO">Solteiro(a)</option>
                              <option value="CASADO">Casado(a)</option>
                              <option value="DIVORCIADO">Divorciado(a)</option>
                              <option value="VIUVO">Viúvo(a)</option>
                              <option value="UNIAO_ESTAVEL">
                                União estável
                              </option>
                              <option value="OUTRO">Outro</option>
                            </select>
                          ) : (
                            <p className="mt-1">
                              {estadoCivil ? estadoCivil : "Não informado"}
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
                            ? "Pessoa jurídica"
                            : "Pessoa física"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Idade</p>
                        <p className="mt-1">{idade ?? "Não informado"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba: Observações */}
              {abaAtiva === "observacoes" && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Observações
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
                      {observacoes || "Nenhuma observação registrada."}
                    </p>
                  )}
                </div>
              )}

              {/* Aba: Contato */}
              {abaAtiva === "contato" && (
                <div className="space-y-6">
                  <h2 className="text-base font-semibold text-slate-800 md:text-lg">
                    Informações de contato
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
                          Telefone secundário
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
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={endereco?.bairro ?? ""}
                            onChange={(e) =>
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                bairro: e.target.value || null,
                              }))
                            }
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
                          <input
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={endereco?.cidade ?? ""}
                            onChange={(e) =>
                              setEndereco((old) => ({
                                ...(old ?? { pessoa_id: pessoa.id }),
                                cidade: e.target.value || null,
                              }))
                            }
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
                  <p className="text-slate-600">Integracoes financeiras nao configuradas.</p>
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



