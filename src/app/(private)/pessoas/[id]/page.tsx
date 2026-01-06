﻿"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PessoaAvatar from "@/components/PessoaAvatar";
import EditarFotoModal from "@/components/EditarFotoModal";
import SectionCard from "@/components/layout/SectionCard";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { EnderecoPessoa, Pessoa } from "@/types/pessoas";

type AbaId =
  | "dados"
  | "escolar"
  | "observacoes"
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

type PessoaCuidados = {
  id: number;
  pessoa_id: number;
  historico_lesoes: string | null;
  restricoes_fisicas: string | null;
  condicoes_neuro: string | null;
  tipo_sanguineo: string | null;
  alergias_alimentares: string | null;
  alergias_medicamentos: string | null;
  alergias_produtos: string | null;
  pode_consumir_acucar: string | null;
  pode_consumir_refrigerante: string | null;
  restricoes_alimentares_observacoes: string | null;
  tipo_autorizacao_saida: string | null;
  contato_emergencia_pessoa_id: number | null;
  contato_emergencia_relacao: string | null;
  contato_emergencia_observacao: string | null;
};

type PessoaCuidadosForm = {
  historico_lesoes: string;
  restricoes_fisicas: string;
  condicoes_neuro: string;
  tipo_sanguineo: string;
  alergias_alimentares: string;
  alergias_medicamentos: string;
  alergias_produtos: string;
  pode_consumir_acucar: string;
  pode_consumir_refrigerante: string;
  restricoes_alimentares_observacoes: string;
  tipo_autorizacao_saida: string;
  contato_emergencia_pessoa_id: string;
  contato_emergencia_relacao: string;
  contato_emergencia_observacao: string;
};

type PessoaAutorizadoPessoa = {
  id: number;
  nome: string | null;
  telefone?: string | null;
  email?: string | null;
};

type PessoaAutorizado = {
  id: number;
  pessoa_cuidados_id: number;
  pessoa_autorizada_id: number;
  parentesco: string | null;
  observacoes: string | null;
  created_at: string | null;
  pessoa_autorizada?: PessoaAutorizadoPessoa | null;
};

type PessoaMedida = {
  id: number;
  pessoa_id: number;
  categoria: string;
  tamanho: string;
  data_referencia: string | null;
  observacao: string | null;
  created_at: string | null;
};

type PessoaObservacao = {
  id: number;
  pessoa_id: number;
  natureza: string;
  titulo: string | null;
  descricao: string;
  data_referencia: string | null;
  created_at: string | null;
};

type PessoaObservacaoPedagogica = {
  id: number;
  pessoa_id: number;
  observado_em: string;
  professor_pessoa_id: number | null;
  titulo: string | null;
  descricao: string;
  created_at: string | null;
  professor?: { id: number; nome: string | null } | null;
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

function emptyCuidadosForm(): PessoaCuidadosForm {
  return {
    historico_lesoes: "",
    restricoes_fisicas: "",
    condicoes_neuro: "",
    tipo_sanguineo: "",
    alergias_alimentares: "",
    alergias_medicamentos: "",
    alergias_produtos: "",
    pode_consumir_acucar: "",
    pode_consumir_refrigerante: "",
    restricoes_alimentares_observacoes: "",
    tipo_autorizacao_saida: "",
    contato_emergencia_pessoa_id: "",
    contato_emergencia_relacao: "",
    contato_emergencia_observacao: "",
  };
}

function cuidadosToForm(data: PessoaCuidados | null | undefined): PessoaCuidadosForm {
  if (!data) return emptyCuidadosForm();
  return {
    historico_lesoes: data.historico_lesoes ?? "",
    restricoes_fisicas: data.restricoes_fisicas ?? "",
    condicoes_neuro: data.condicoes_neuro ?? "",
    tipo_sanguineo: data.tipo_sanguineo ?? "",
    alergias_alimentares: data.alergias_alimentares ?? "",
    alergias_medicamentos: data.alergias_medicamentos ?? "",
    alergias_produtos: data.alergias_produtos ?? "",
    pode_consumir_acucar: data.pode_consumir_acucar ?? "",
    pode_consumir_refrigerante: data.pode_consumir_refrigerante ?? "",
    restricoes_alimentares_observacoes:
      data.restricoes_alimentares_observacoes ?? "",
    tipo_autorizacao_saida: data.tipo_autorizacao_saida ?? "",
    contato_emergencia_pessoa_id:
      data.contato_emergencia_pessoa_id?.toString() ?? "",
    contato_emergencia_relacao: data.contato_emergencia_relacao ?? "",
    contato_emergencia_observacao: data.contato_emergencia_observacao ?? "",
  };
}

function parseOptionalNumber(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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

  const [cuidados, setCuidados] = useState<PessoaCuidados | null>(null);
  const [cuidadosForm, setCuidadosForm] = useState<PessoaCuidadosForm>(
    emptyCuidadosForm()
  );
  const [cuidadosLoading, setCuidadosLoading] = useState(false);
  const [cuidadosErro, setCuidadosErro] = useState<string | null>(null);
  const [cuidadosSaving, setCuidadosSaving] = useState(false);

  const [autorizados, setAutorizados] = useState<PessoaAutorizado[]>([]);
  const [autorizadosLoading, setAutorizadosLoading] = useState(false);
  const [autorizadosErro, setAutorizadosErro] = useState<string | null>(null);
  const [editAutorizadoId, setEditAutorizadoId] = useState<number | null>(null);
  const [novoAutorizadoId, setNovoAutorizadoId] = useState("");
  const [novoAutorizadoParentesco, setNovoAutorizadoParentesco] =
    useState("");
  const [novoAutorizadoObs, setNovoAutorizadoObs] = useState("");

  const [medidas, setMedidas] = useState<PessoaMedida[]>([]);
  const [medidasLoading, setMedidasLoading] = useState(false);
  const [medidasErro, setMedidasErro] = useState<string | null>(null);
  const [editMedidaId, setEditMedidaId] = useState<number | null>(null);
  const [novaMedida, setNovaMedida] = useState({
    categoria: "",
    tamanho: "",
    data_referencia: "",
    observacao: "",
  });

  const [observacoesGerais, setObservacoesGerais] = useState<
    PessoaObservacao[]
  >([]);
  const [obsGeraisLoading, setObsGeraisLoading] = useState(false);
  const [obsGeraisErro, setObsGeraisErro] = useState<string | null>(null);
  const [editObsGeralId, setEditObsGeralId] = useState<number | null>(null);
  const [novaObsGeral, setNovaObsGeral] = useState({
    natureza: "",
    titulo: "",
    descricao: "",
    data_referencia: "",
  });

  const [observacoesPedagogicas, setObservacoesPedagogicas] = useState<
    PessoaObservacaoPedagogica[]
  >([]);
  const [obsPedLoading, setObsPedLoading] = useState(false);
  const [obsPedErro, setObsPedErro] = useState<string | null>(null);
  const [editObsPedId, setEditObsPedId] = useState<number | null>(null);
  const [novaObsPed, setNovaObsPed] = useState({
    observado_em: "",
    professor_pessoa_id: "",
    titulo: "",
    descricao: "",
  });

  const [matriculas, setMatriculas] = useState<MatriculaPessoaItem[]>([]);
  const [matriculasLoading, setMatriculasLoading] = useState(false);
  const [matriculasErro, setMatriculasErro] = useState<string | null>(null);

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
    pessoa?.tipo_pessoa === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física";

  const idade = calcularIdade(pessoa?.nascimento ?? null);
  const generoLabel = pessoa ? formatGenero(pessoa.genero) : null;
  const createdByLabel = pessoa?.created_by_name ?? "-";
  const updatedByLabel = pessoa?.updated_by_name ?? "-";

  const enderecoTitulo = useMemo(
    () => (pessoa?.tipo_pessoa === "JURIDICA" ? "Endereço fiscal" : "Endereço"),
    [pessoa?.tipo_pessoa]
  );
  const showAutorizados = cuidadosForm.tipo_autorizacao_saida === "AUTORIZADOS";
  const cuidadosTextareas = [
    { key: "historico_lesoes", label: "Historico de lesoes" },
    { key: "restricoes_fisicas", label: "Restricoes fisicas" },
    { key: "condicoes_neuro", label: "Condicoes neuro" },
    { key: "alergias_alimentares", label: "Alergias alimentares" },
    { key: "alergias_medicamentos", label: "Alergias a medicamentos" },
    { key: "alergias_produtos", label: "Alergias a produtos" },
    {
      key: "restricoes_alimentares_observacoes",
      label: "Restricoes alimentares (observacoes)",
      span: "md:col-span-2",
    },
    {
      key: "contato_emergencia_observacao",
      label: "Observacao do contato emergencia",
      span: "md:col-span-2",
    },
  ] as const;
  const cuidadosInputs = [
    { key: "tipo_sanguineo", label: "Tipo sanguineo", type: "text" },
    {
      key: "contato_emergencia_pessoa_id",
      label: "Contato emergencia (pessoa_id)",
      type: "number",
    },
    {
      key: "contato_emergencia_relacao",
      label: "Relacao contato emergencia",
      type: "text",
    },
  ] as const;

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

  useEffect(() => {
    if (!id || abaAtiva !== "observacoes") return;
    void carregarCuidados();
    void carregarAutorizados();
    void carregarMedidas();
    void carregarObservacoesGerais();
    void carregarObservacoesPedagogicas();
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

  async function carregarCuidados() {
    if (!id) return;
    try {
      setCuidadosLoading(true);
      setCuidadosErro(null);

      const res = await fetch(`/api/pessoas/${id}/cuidados`);
      const json = (await res.json()) as {
        cuidados?: PessoaCuidados | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar cuidados.");
      }

      const data = json.cuidados ?? null;
      setCuidados(data);
      setCuidadosForm(cuidadosToForm(data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar cuidados.";
      setCuidadosErro(msg);
    } finally {
      setCuidadosLoading(false);
    }
  }

  async function carregarAutorizados() {
    if (!id) return;
    try {
      setAutorizadosLoading(true);
      setAutorizadosErro(null);

      const res = await fetch(`/api/pessoas/${id}/cuidados/autorizados`);
      const json = (await res.json()) as {
        items?: PessoaAutorizado[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar autorizados.");
      }

      setAutorizados(Array.isArray(json.items) ? json.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar autorizados.";
      setAutorizadosErro(msg);
    } finally {
      setAutorizadosLoading(false);
    }
  }

  async function carregarMedidas() {
    if (!id) return;
    try {
      setMedidasLoading(true);
      setMedidasErro(null);

      const res = await fetch(`/api/pessoas/${id}/medidas`);
      const json = (await res.json()) as {
        items?: PessoaMedida[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar medidas.");
      }

      setMedidas(Array.isArray(json.items) ? json.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar medidas.";
      setMedidasErro(msg);
    } finally {
      setMedidasLoading(false);
    }
  }

  async function carregarObservacoesGerais() {
    if (!id) return;
    try {
      setObsGeraisLoading(true);
      setObsGeraisErro(null);

      const res = await fetch(`/api/pessoas/${id}/observacoes`);
      const json = (await res.json()) as {
        items?: PessoaObservacao[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar observacoes.");
      }

      setObservacoesGerais(Array.isArray(json.items) ? json.items : []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar observacoes.";
      setObsGeraisErro(msg);
    } finally {
      setObsGeraisLoading(false);
    }
  }

  async function carregarObservacoesPedagogicas() {
    if (!id) return;
    try {
      setObsPedLoading(true);
      setObsPedErro(null);

      const res = await fetch(`/api/pessoas/${id}/observacoes-pedagogicas`);
      const json = (await res.json()) as {
        items?: PessoaObservacaoPedagogica[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao carregar observacoes pedagogicas.");
      }

      setObservacoesPedagogicas(Array.isArray(json.items) ? json.items : []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao carregar observacoes pedagogicas.";
      setObsPedErro(msg);
    } finally {
      setObsPedLoading(false);
    }
  }

  async function salvarCuidados() {
    if (!id) return;
    try {
      setCuidadosSaving(true);
      setCuidadosErro(null);

      const payload = {
        historico_lesoes: cuidadosForm.historico_lesoes.trim() || null,
        restricoes_fisicas: cuidadosForm.restricoes_fisicas.trim() || null,
        condicoes_neuro: cuidadosForm.condicoes_neuro.trim() || null,
        tipo_sanguineo: cuidadosForm.tipo_sanguineo.trim() || null,
        alergias_alimentares: cuidadosForm.alergias_alimentares.trim() || null,
        alergias_medicamentos:
          cuidadosForm.alergias_medicamentos.trim() || null,
        alergias_produtos: cuidadosForm.alergias_produtos.trim() || null,
        pode_consumir_acucar: cuidadosForm.pode_consumir_acucar.trim() || null,
        pode_consumir_refrigerante:
          cuidadosForm.pode_consumir_refrigerante.trim() || null,
        restricoes_alimentares_observacoes:
          cuidadosForm.restricoes_alimentares_observacoes.trim() || null,
        tipo_autorizacao_saida:
          cuidadosForm.tipo_autorizacao_saida.trim() || null,
        contato_emergencia_pessoa_id: parseOptionalNumber(
          cuidadosForm.contato_emergencia_pessoa_id
        ),
        contato_emergencia_relacao:
          cuidadosForm.contato_emergencia_relacao.trim() || null,
        contato_emergencia_observacao:
          cuidadosForm.contato_emergencia_observacao.trim() || null,
      };

      const res = await fetch(`/api/pessoas/${id}/cuidados`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        cuidados?: PessoaCuidados | null;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar cuidados.");
      }

      const data = json.cuidados ?? null;
      setCuidados(data);
      setCuidadosForm(cuidadosToForm(data));
      await carregarAutorizados();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cuidados.";
      setCuidadosErro(msg);
    } finally {
      setCuidadosSaving(false);
    }
  }

  async function adicionarAutorizado() {
    if (!id) return;
    try {
      setAutorizadosErro(null);
      const pessoaId = parseOptionalNumber(novoAutorizadoId);
      if (!pessoaId) {
        throw new Error("Pessoa autorizada invalida.");
      }

      const res = await fetch(`/api/pessoas/${id}/cuidados/autorizados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_autorizada_id: pessoaId,
          parentesco: novoAutorizadoParentesco.trim() || null,
          observacoes: novoAutorizadoObs.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        item?: PessoaAutorizado;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao adicionar autorizado.");
      }

      if (json.item) {
        setAutorizados((prev) => [...prev, json.item as PessoaAutorizado]);
      }
      setEditAutorizadoId(null);
      setNovoAutorizadoId("");
      setNovoAutorizadoParentesco("");
      setNovoAutorizadoObs("");
      await carregarAutorizados();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao adicionar autorizado.";
      setAutorizadosErro(msg);
    }
  }

  async function atualizarAutorizado(
    idAutorizado: number,
    parentesco: string | null,
    observacoes: string | null
  ) {
    try {
      setAutorizadosErro(null);

      const res = await fetch(`/api/pessoas/${id}/cuidados/autorizados`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: idAutorizado,
          parentesco: parentesco ?? null,
          observacoes: observacoes ?? null,
        }),
      });

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao atualizar autorizado.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao atualizar autorizado.";
      setAutorizadosErro(msg);
    }
  }

  async function removerAutorizado(idAutorizado: number) {
    try {
      setAutorizadosErro(null);

      const res = await fetch(
        `/api/pessoas/${id}/cuidados/autorizados?id=${idAutorizado}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao remover autorizado.");
      }

      setAutorizados((prev) => prev.filter((item) => item.id !== idAutorizado));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao remover autorizado.";
      setAutorizadosErro(msg);
    }
  }

  function iniciarEdicaoAutorizado(item: PessoaAutorizado) {
    setEditAutorizadoId(item.id);
    setNovoAutorizadoId(item.pessoa_autorizada_id.toString());
    setNovoAutorizadoParentesco(item.parentesco ?? "");
    setNovoAutorizadoObs(item.observacoes ?? "");
  }

  function cancelarEdicaoAutorizado() {
    setEditAutorizadoId(null);
    setNovoAutorizadoId("");
    setNovoAutorizadoParentesco("");
    setNovoAutorizadoObs("");
  }

  async function salvarAutorizadoForm() {
    if (editAutorizadoId) {
      await atualizarAutorizado(
        editAutorizadoId,
        novoAutorizadoParentesco.trim() || null,
        novoAutorizadoObs.trim() || null
      );
      await carregarAutorizados();
      cancelarEdicaoAutorizado();
      return;
    }

    await adicionarAutorizado();
  }

  async function adicionarMedida() {
    if (!id) return;
    try {
      setMedidasErro(null);
      if (!novaMedida.categoria.trim() || !novaMedida.tamanho.trim()) {
        throw new Error("Categoria e tamanho sao obrigatorios.");
      }

      const res = await fetch(`/api/pessoas/${id}/medidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: novaMedida.categoria.trim(),
          tamanho: novaMedida.tamanho.trim(),
          data_referencia: novaMedida.data_referencia || null,
          observacao: novaMedida.observacao.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        item?: PessoaMedida;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao adicionar medida.");
      }

      if (json.item) {
        setMedidas((prev) => [json.item as PessoaMedida, ...prev]);
      }
      setEditMedidaId(null);
      setNovaMedida({
        categoria: "",
        tamanho: "",
        data_referencia: "",
        observacao: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar medida.";
      setMedidasErro(msg);
    }
  }

  async function atualizarMedida(item: PessoaMedida) {
    try {
      setMedidasErro(null);

      const res = await fetch(`/api/pessoas/${id}/medidas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          categoria: item.categoria,
          tamanho: item.tamanho,
          data_referencia: item.data_referencia ?? null,
          observacao: item.observacao ?? null,
        }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao atualizar medida.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar medida.";
      setMedidasErro(msg);
    }
  }

  async function removerMedida(idMedida: number) {
    try {
      setMedidasErro(null);

      const res = await fetch(
        `/api/pessoas/${id}/medidas?id=${idMedida}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao remover medida.");
      }

      setMedidas((prev) => prev.filter((item) => item.id !== idMedida));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover medida.";
      setMedidasErro(msg);
    }
  }

  async function adicionarObsGeral() {
    if (!id) return;
    try {
      setObsGeraisErro(null);
      if (!novaObsGeral.natureza.trim() || !novaObsGeral.descricao.trim()) {
        throw new Error("Natureza e descricao sao obrigatorias.");
      }

      const res = await fetch(`/api/pessoas/${id}/observacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          natureza: novaObsGeral.natureza.trim(),
          titulo: novaObsGeral.titulo.trim() || null,
          descricao: novaObsGeral.descricao.trim(),
          data_referencia: novaObsGeral.data_referencia || null,
        }),
      });
      const json = (await res.json()) as {
        item?: PessoaObservacao;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao adicionar observacao.");
      }

      if (json.item) {
        setObservacoesGerais((prev) => [json.item as PessoaObservacao, ...prev]);
      }
      setEditObsGeralId(null);
      setNovaObsGeral({
        natureza: "",
        titulo: "",
        descricao: "",
        data_referencia: "",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao adicionar observacao.";
      setObsGeraisErro(msg);
    }
  }

  async function atualizarObsGeral(item: PessoaObservacao) {
    try {
      setObsGeraisErro(null);

      const res = await fetch(`/api/pessoas/${id}/observacoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          natureza: item.natureza,
          titulo: item.titulo ?? null,
          descricao: item.descricao,
          data_referencia: item.data_referencia ?? null,
        }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao atualizar observacao.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao atualizar observacao.";
      setObsGeraisErro(msg);
    }
  }

  async function removerObsGeral(idObs: number) {
    try {
      setObsGeraisErro(null);

      const res = await fetch(
        `/api/pessoas/${id}/observacoes?id=${idObs}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao remover observacao.");
      }

      setObservacoesGerais((prev) => prev.filter((item) => item.id !== idObs));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao remover observacao.";
      setObsGeraisErro(msg);
    }
  }

  async function adicionarObsPed() {
    if (!id) return;
    try {
      setObsPedErro(null);
      if (!novaObsPed.descricao.trim()) {
        throw new Error("Descricao e obrigatoria.");
      }

      const observadoEm = novaObsPed.observado_em
        ? new Date(novaObsPed.observado_em).toISOString()
        : null;

      const res = await fetch(`/api/pessoas/${id}/observacoes-pedagogicas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observado_em: observadoEm,
          professor_pessoa_id: parseOptionalNumber(
            novaObsPed.professor_pessoa_id
          ),
          titulo: novaObsPed.titulo.trim() || null,
          descricao: novaObsPed.descricao.trim(),
        }),
      });
      const json = (await res.json()) as {
        item?: PessoaObservacaoPedagogica;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao adicionar observacao pedagogica.");
      }

      if (json.item) {
        setObservacoesPedagogicas((prev) => [
          json.item as PessoaObservacaoPedagogica,
          ...prev,
        ]);
      }
      setEditObsPedId(null);
      setNovaObsPed({
        observado_em: "",
        professor_pessoa_id: "",
        titulo: "",
        descricao: "",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao adicionar observacao pedagogica.";
      setObsPedErro(msg);
    }
  }

  async function atualizarObsPed(item: PessoaObservacaoPedagogica) {
    try {
      setObsPedErro(null);

      const res = await fetch(`/api/pessoas/${id}/observacoes-pedagogicas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          observado_em: item.observado_em,
          professor_pessoa_id: item.professor_pessoa_id ?? null,
          titulo: item.titulo ?? null,
          descricao: item.descricao,
        }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao atualizar observacao pedagogica.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao atualizar observacao pedagogica.";
      setObsPedErro(msg);
    }
  }

  async function removerObsPed(idObs: number) {
    try {
      setObsPedErro(null);

      const res = await fetch(
        `/api/pessoas/${id}/observacoes-pedagogicas?id=${idObs}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Falha ao remover observacao pedagogica.");
      }

      setObservacoesPedagogicas((prev) =>
        prev.filter((item) => item.id !== idObs)
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao remover observacao pedagogica.";
      setObsPedErro(msg);
    }
  }

  function iniciarEdicaoMedida(item: PessoaMedida) {
    setEditMedidaId(item.id);
    setNovaMedida({
      categoria: item.categoria ?? "",
      tamanho: item.tamanho ?? "",
      data_referencia: item.data_referencia ?? "",
      observacao: item.observacao ?? "",
    });
  }

  function cancelarEdicaoMedida() {
    setEditMedidaId(null);
    setNovaMedida({
      categoria: "",
      tamanho: "",
      data_referencia: "",
      observacao: "",
    });
  }

  async function salvarMedidaForm() {
    if (editMedidaId) {
      if (!novaMedida.categoria.trim() || !novaMedida.tamanho.trim()) {
        setMedidasErro("Categoria e tamanho sao obrigatorios.");
        return;
      }

      await atualizarMedida({
        id: editMedidaId,
        pessoa_id: pessoa?.id ?? 0,
        categoria: novaMedida.categoria.trim(),
        tamanho: novaMedida.tamanho.trim(),
        data_referencia: novaMedida.data_referencia || null,
        observacao: novaMedida.observacao.trim() || null,
        created_at: null,
      });
      await carregarMedidas();
      cancelarEdicaoMedida();
      return;
    }

    await adicionarMedida();
  }

  function iniciarEdicaoObsGeral(item: PessoaObservacao) {
    setEditObsGeralId(item.id);
    setNovaObsGeral({
      natureza: item.natureza ?? "",
      titulo: item.titulo ?? "",
      descricao: item.descricao ?? "",
      data_referencia: item.data_referencia ?? "",
    });
  }

  function cancelarEdicaoObsGeral() {
    setEditObsGeralId(null);
    setNovaObsGeral({
      natureza: "",
      titulo: "",
      descricao: "",
      data_referencia: "",
    });
  }

  async function salvarObsGeralForm() {
    if (editObsGeralId) {
      if (!novaObsGeral.natureza.trim() || !novaObsGeral.descricao.trim()) {
        setObsGeraisErro("Natureza e descricao sao obrigatorias.");
        return;
      }

      await atualizarObsGeral({
        id: editObsGeralId,
        pessoa_id: pessoa?.id ?? 0,
        natureza: novaObsGeral.natureza.trim(),
        titulo: novaObsGeral.titulo.trim() || null,
        descricao: novaObsGeral.descricao.trim(),
        data_referencia: novaObsGeral.data_referencia || null,
        created_at: null,
      });
      await carregarObservacoesGerais();
      cancelarEdicaoObsGeral();
      return;
    }

    await adicionarObsGeral();
  }

  function iniciarEdicaoObsPed(item: PessoaObservacaoPedagogica) {
    setEditObsPedId(item.id);
    setNovaObsPed({
      observado_em: toDatetimeLocal(item.observado_em),
      professor_pessoa_id: item.professor_pessoa_id?.toString() ?? "",
      titulo: item.titulo ?? "",
      descricao: item.descricao ?? "",
    });
  }

  function cancelarEdicaoObsPed() {
    setEditObsPedId(null);
    setNovaObsPed({
      observado_em: "",
      professor_pessoa_id: "",
      titulo: "",
      descricao: "",
    });
  }

  async function salvarObsPedForm() {
    if (editObsPedId) {
      if (!novaObsPed.descricao.trim()) {
        setObsPedErro("Descricao e obrigatoria.");
        return;
      }

      const observadoEm = novaObsPed.observado_em
        ? new Date(novaObsPed.observado_em).toISOString()
        : new Date().toISOString();

      await atualizarObsPed({
        id: editObsPedId,
        pessoa_id: pessoa?.id ?? 0,
        observado_em: observadoEm,
        professor_pessoa_id: parseOptionalNumber(novaObsPed.professor_pessoa_id),
        titulo: novaObsPed.titulo.trim() || null,
        descricao: novaObsPed.descricao.trim(),
        created_at: null,
      });
      await carregarObservacoesPedagogicas();
      cancelarEdicaoObsPed();
      return;
    }

    await adicionarObsPed();
  }

  const abas: { id: AbaId; label: string; icon: string }[] = [
    { id: "dados", label: "👤 Dados da pessoa", icon: "" },
    { id: "escolar", label: "🎓 Dados escolares", icon: "" },
    { id: "observacoes", label: "📝 Observações", icon: "" },
    { id: "contato", label: "📞 Informações de contato", icon: "" },
    { id: "endereco", label: "📍 Endereço", icon: "" },
    { id: "vinculos", label: "🔗 Vínculos no sistema", icon: "" },
    { id: "resumo", label: "💰 Resumo financeiro", icon: "" },
    { id: "sistema", label: "⚙️ Dados do sistema", icon: "" },
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
                  <SectionCard
                    title="Observacoes pedagogicas"
                    description="Historico pedagogico (base para diario de classe)."
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Observado em</div>
                        <input
                          type="datetime-local"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsPed.observado_em}
                          onChange={(e) =>
                            setNovaObsPed((prev) => ({
                              ...prev,
                              observado_em: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Professor (pessoa_id)</div>
                        <input
                          type="number"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsPed.professor_pessoa_id}
                          onChange={(e) =>
                            setNovaObsPed((prev) => ({
                              ...prev,
                              professor_pessoa_id: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Titulo</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsPed.titulo}
                          onChange={(e) =>
                            setNovaObsPed((prev) => ({
                              ...prev,
                              titulo: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <div className="text-xs text-slate-400">Descricao</div>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          rows={2}
                          value={novaObsPed.descricao}
                          onChange={(e) =>
                            setNovaObsPed((prev) => ({
                              ...prev,
                              descricao: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void salvarObsPedForm()}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                      >
                        {editObsPedId ? "Salvar edicao" : "Adicionar observacao"}
                      </button>
                      {editObsPedId ? (
                        <button
                          type="button"
                          onClick={() => cancelarEdicaoObsPed()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>

                    {obsPedLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Carregando...</p>
                    ) : null}
                    {obsPedErro ? (
                      <p className="mt-3 text-sm text-red-600">{obsPedErro}</p>
                    ) : null}

                    {observacoesPedagogicas.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Nenhuma observacao pedagogica.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {observacoesPedagogicas.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium">
                                  {item.titulo ?? "Observacao pedagogica"}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {formatDateTime(item.observado_em)} -
                                  {" "}
                                  {item.professor?.nome ??
                                    (item.professor_pessoa_id
                                      ? "Pessoa #" + item.professor_pessoa_id
                                      : "Professor nao informado")}
                                </div>
                              </div>
                              {editObsPedId === item.id ? (
                                <span className="text-xs text-violet-600">Em edicao</span>
                              ) : null}
                            </div>
                            {item.descricao ? (
                              <div className="mt-2 text-sm text-slate-600">
                                {item.descricao}
                              </div>
                            ) : null}
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoObsPed(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => removerObsPed(item.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                  <SectionCard
                    title="Observacoes gerais"
                    description="Observacoes categorizadas e historico manual."
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Natureza</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsGeral.natureza}
                          onChange={(e) =>
                            setNovaObsGeral((prev) => ({
                              ...prev,
                              natureza: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Titulo</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsGeral.titulo}
                          onChange={(e) =>
                            setNovaObsGeral((prev) => ({
                              ...prev,
                              titulo: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Data referencia</div>
                        <input
                          type="date"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaObsGeral.data_referencia}
                          onChange={(e) =>
                            setNovaObsGeral((prev) => ({
                              ...prev,
                              data_referencia: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <div className="text-xs text-slate-400">Descricao</div>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          rows={2}
                          value={novaObsGeral.descricao}
                          onChange={(e) =>
                            setNovaObsGeral((prev) => ({
                              ...prev,
                              descricao: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void salvarObsGeralForm()}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                      >
                        {editObsGeralId ? "Salvar edicao" : "Adicionar observacao"}
                      </button>
                      {editObsGeralId ? (
                        <button
                          type="button"
                          onClick={() => cancelarEdicaoObsGeral()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>

                    {obsGeraisLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Carregando...</p>
                    ) : null}
                    {obsGeraisErro ? (
                      <p className="mt-3 text-sm text-red-600">{obsGeraisErro}</p>
                    ) : null}

                    {observacoesGerais.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Nenhuma observacao geral.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {observacoesGerais.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium">
                                  {item.titulo ?? item.natureza}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {item.natureza} - {item.data_referencia ?? "-"}
                                </div>
                              </div>
                              {editObsGeralId === item.id ? (
                                <span className="text-xs text-violet-600">Em edicao</span>
                              ) : null}
                            </div>
                            {item.descricao ? (
                              <div className="mt-2 text-sm text-slate-600">
                                {item.descricao}
                              </div>
                            ) : null}
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoObsGeral(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => removerObsGeral(item.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                  <SectionCard
                    title="Medidas declaradas"
                    description="Historico manual de tamanhos e medidas informadas."
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Categoria</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaMedida.categoria}
                          onChange={(e) =>
                            setNovaMedida((prev) => ({
                              ...prev,
                              categoria: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Tamanho</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaMedida.tamanho}
                          onChange={(e) =>
                            setNovaMedida((prev) => ({
                              ...prev,
                              tamanho: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Data referencia</div>
                        <input
                          type="date"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaMedida.data_referencia}
                          onChange={(e) =>
                            setNovaMedida((prev) => ({
                              ...prev,
                              data_referencia: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <div className="text-xs text-slate-400">Observacao</div>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={novaMedida.observacao}
                          onChange={(e) =>
                            setNovaMedida((prev) => ({
                              ...prev,
                              observacao: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void salvarMedidaForm()}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                      >
                        {editMedidaId ? "Salvar edicao" : "Adicionar medida"}
                      </button>
                      {editMedidaId ? (
                        <button
                          type="button"
                          onClick={() => cancelarEdicaoMedida()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>

                    {medidasLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Carregando...</p>
                    ) : null}
                    {medidasErro ? (
                      <p className="mt-3 text-sm text-red-600">{medidasErro}</p>
                    ) : null}

                    {medidas.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Nenhuma medida declarada.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {medidas.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium">
                                  {item.categoria} - {item.tamanho}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {item.data_referencia ?? "-"}
                                </div>
                              </div>
                              {editMedidaId === item.id ? (
                                <span className="text-xs text-violet-600">Em edicao</span>
                              ) : null}
                            </div>
                            {item.observacao ? (
                              <div className="mt-2 text-sm text-slate-600">
                                {item.observacao}
                              </div>
                            ) : null}
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => iniciarEdicaoMedida(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => removerMedida(item.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                  {showAutorizados ? (
                    <SectionCard
                      title="Autorizados para busca"
                      description="Somente quando a saida exige autorizados."
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400">Pessoa autorizada (pessoa_id)</div>
                          <input
                            type="number"
                            disabled={editAutorizadoId !== null}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={novoAutorizadoId}
                            onChange={(e) => setNovoAutorizadoId(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400">Parentesco</div>
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={novoAutorizadoParentesco}
                            onChange={(e) => setNovoAutorizadoParentesco(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400">Observacoes</div>
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                            value={novoAutorizadoObs}
                            onChange={(e) => setNovoAutorizadoObs(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void salvarAutorizadoForm()}
                          className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                        >
                          {editAutorizadoId ? "Salvar edicao" : "Adicionar autorizado"}
                        </button>
                        {editAutorizadoId ? (
                          <button
                            type="button"
                            onClick={() => cancelarEdicaoAutorizado()}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        ) : null}
                      </div>

                      {autorizadosLoading ? (
                        <p className="mt-3 text-sm text-slate-500">Carregando...</p>
                      ) : null}
                      {autorizadosErro ? (
                        <p className="mt-3 text-sm text-red-600">{autorizadosErro}</p>
                      ) : null}

                      {autorizados.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Nenhuma pessoa autorizada cadastrada.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {autorizados.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">
                                    {item.pessoa_autorizada?.nome ??
                                      "Pessoa #" + item.pessoa_autorizada_id}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {item.parentesco ?? "Parentesco nao informado"}
                                  </div>
                                </div>
                                {editAutorizadoId === item.id ? (
                                  <span className="text-xs text-violet-600">Em edicao</span>
                                ) : null}
                              </div>
                              {item.observacoes ? (
                                <div className="mt-2 text-sm text-slate-600">
                                  {item.observacoes}
                                </div>
                              ) : null}
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicaoAutorizado(item)}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removerAutorizado(item.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                  <SectionCard
                    title="Ficha de cuidados"
                    description="Informacoes de saude, alergias e autorizacao de saida."
                  >
                    {cuidadosLoading ? (
                      <p className="text-sm text-slate-500">Carregando...</p>
                    ) : null}
                    {cuidadosErro ? (
                      <p className="text-sm text-red-600">{cuidadosErro}</p>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      {cuidadosTextareas.map((field) => {
                        const key = field.key as keyof PessoaCuidadosForm;
                        return (
                          <div
                            key={field.key}
                            className={`space-y-1 ${field.span ?? ""}`}
                          >
                            <div className="text-xs text-slate-400">{field.label}</div>
                            <textarea
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              rows={2}
                              value={cuidadosForm[key]}
                              onChange={(e) =>
                                setCuidadosForm((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                      })}

                      {cuidadosInputs.map((field) => {
                        const key = field.key as keyof PessoaCuidadosForm;
                        return (
                          <div key={field.key} className="space-y-1">
                            <div className="text-xs text-slate-400">{field.label}</div>
                            <input
                              type={field.type}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                              value={cuidadosForm[key]}
                              onChange={(e) =>
                                setCuidadosForm((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                      })}

                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Tipo de autorizacao de saida</div>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={cuidadosForm.tipo_autorizacao_saida}
                          onChange={(e) =>
                            setCuidadosForm((prev) => ({
                              ...prev,
                              tipo_autorizacao_saida: e.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          <option value="RESPONSAVEL">RESPONSAVEL</option>
                          <option value="AUTORIZADOS">AUTORIZADOS</option>
                          <option value="LIVRE">LIVRE</option>
                        </select>
                        <p className="text-xs text-slate-400">
                          Use "AUTORIZADOS" para habilitar a lista de pessoas autorizadas.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Pode consumir acucar</div>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={cuidadosForm.pode_consumir_acucar}
                          onChange={(e) =>
                            setCuidadosForm((prev) => ({
                              ...prev,
                              pode_consumir_acucar: e.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          <option value="PODE">PODE</option>
                          <option value="EVITAR">EVITAR</option>
                          <option value="NAO_PODE">NAO_PODE</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">Pode consumir refrigerante</div>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          value={cuidadosForm.pode_consumir_refrigerante}
                          onChange={(e) =>
                            setCuidadosForm((prev) => ({
                              ...prev,
                              pode_consumir_refrigerante: e.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          <option value="PODE">PODE</option>
                          <option value="EVITAR">EVITAR</option>
                          <option value="NAO_PODE">NAO_PODE</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void salvarCuidados()}
                        disabled={cuidadosSaving}
                        className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50"
                      >
                        {cuidadosSaving ? "Salvando..." : "Salvar ficha"}
                      </button>
                    </div>
                  </SectionCard>
                        </div>
                      )}
                    </SectionCard>
                  ) : null}
                      </div>
                    )}
                  </SectionCard>
                      </div>
                    )}
                  </SectionCard>
                      </div>
                    )}
                  </SectionCard>
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









