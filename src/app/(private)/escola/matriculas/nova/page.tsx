"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PessoaSearchBox from "@/components/PessoaSearchBox";

type PessoaResumo = {
  id: number;
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
};

type PessoaDetalhe = {
  nascimento?: string | null;
};

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type MetodoLiquidacao = "CARTAO_CONEXAO" | "OUTRO";

type TurmaOpcao = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  tipo_turma: string | null;
  ano_referencia: number | null;
  idade_minima?: number | null;
  idade_maxima?: number | null;
  capacidade: number | null;
  status: string | null;
  ativo: boolean | null;
  suggested?: boolean;
};

type ServicoAdmin = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia?: number | null;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
  turma_nome?: string | null;
  turma_id?: number | null;
};

type ServicoItemRow = {
  id: number;
  servico_id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo_item: string;
  obrigatorio: boolean;
  ativo: boolean;
};

type ServicoItemPrecoRow = {
  id: number;
  item_id: number;
  valor_centavos: number;
  moeda: string;
  ativo: boolean;
};

type ItemDisponivel = {
  id: number;
  codigo: string;
  nome: string;
  tipo_item: string;
  obrigatorio: boolean;
  preco_ativo_centavos: number | null;
  moeda: string;
};

type CriarMatriculaResp = {
  ok: boolean;
  matricula?: { id: number };
  error?: string;
  message?: string;
};

type CriarLoteResp = {
  ok: boolean;
  results?: Array<{ ok: boolean; index: number; matricula_id?: number; error?: string }>;
  error?: string;
  message?: string;
};

type SchemaCheckItem = {
  key: string;
  ok: boolean;
  message: string;
  sql_sugerido?: string;
};

type SchemaCheckResp = {
  ok: boolean;
  checks: SchemaCheckItem[];
  error?: string;
  message?: string;
};

type LoteSelecao = {
  curso?: string | null;
  tipo: TipoMatricula;
  turma_id?: number | null;
  turma_nome?: string | null;
  ano_referencia: number | null;
  servico_id: number | null;
  servico_label?: string | null;
  itens: Array<{ item_id: number; quantidade: number }>;
};

function labelTipoMatricula(tipo: TipoMatricula): string {
  switch (tipo) {
    case "REGULAR":
      return "Turma regular";
    case "CURSO_LIVRE":
      return "Curso livre";
    case "PROJETO_ARTISTICO":
      return "Projeto artistico";
    default:
      return tipo;
  }
}

function labelTurmaOption(tipo: TipoMatricula, turma: TurmaOpcao): string {
  const nome = turma.nome?.trim() ? turma.nome : `Turma #${turma.turma_id}`;
  const ano = turma.ano_referencia ?? "-";
  const min = turma.idade_minima ?? "-";
  const max = turma.idade_maxima ?? "-";
  const faixa = `Faixa: ${min}-${max}`;
  const base = `${labelTipoMatricula(tipo)} - ${nome} (${ano}) | ${faixa}`;
  return turma.suggested ? `Sugestao: ${base}` : base;
}

function labelServicoAdmin(servico: ServicoAdmin): string {
  const titulo = servico.titulo?.trim() ? servico.titulo : `Servico #${servico.id}`;
  const ano = servico.ano_referencia ?? null;
  return ano ? `${titulo} (${ano})` : titulo;
}

function resolveServicoPorTurma(servicos: ServicoAdmin[], turmaId: number, tipo: TipoMatricula): ServicoAdmin | null {
  return (
    servicos.find((s) => {
      if (!s.ativo) return false;
      if (String(s.tipo) !== tipo) return false;
      const refId = s.referencia_id ?? s.turma_id ?? null;
      if (!refId || refId !== turmaId) return false;
      if (s.referencia_tipo && s.referencia_tipo !== "TURMA") return false;
      return true;
    }) ?? null
  );
}

function calcularIdade(nascimentoISO: string | null): number | null {
  if (!nascimentoISO) return null;
  const match = nascimentoISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (!ano || !mes || !dia) return null;

  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - ano;
  const mesAtual = hoje.getUTCMonth() + 1;
  const diaAtual = hoje.getUTCDate();
  if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
    idade -= 1;
  }
  return idade;
}

function formatBRL(centavos: number | null): string {
  if (centavos === null) return "Sem preco";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseQuantidade(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as Record<string, unknown>).message)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export default function NovaMatriculaPage() {
  const router = useRouter();

  const [passo, setPasso] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [tipoSelecionado, setTipoSelecionado] = useState<TipoMatricula>("REGULAR");
  const [cursos, setCursos] = useState<string[]>([]);
  const [cursoSelecionado, setCursoSelecionado] = useState<string>("");

  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [turmasErro, setTurmasErro] = useState<string | null>(null);
  const [turmasCarregando, setTurmasCarregando] = useState(false);
  const [idadeSugestao, setIdadeSugestao] = useState<number | null>(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaOpcao | null>(null);

  const [servicosAdmin, setServicosAdmin] = useState<ServicoAdmin[]>([]);
  const [servicosErro, setServicosErro] = useState<string | null>(null);
  const [servicosCarregando, setServicosCarregando] = useState(false);
  const [servicoProjetoId, setServicoProjetoId] = useState<number | null>(null);
  const [servicoTurmaId, setServicoTurmaId] = useState<number | null>(null);
  const [servicoVinculoErro, setServicoVinculoErro] = useState<string | null>(null);

  const [anoRef, setAnoRef] = useState<number>(2026);
  const [dataMatricula, setDataMatricula] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [mesInicio, setMesInicio] = useState<number | "AUTO">("AUTO");
  const [gerarProrata, setGerarProrata] = useState<boolean>(true);

  const [itensDisponiveis, setItensDisponiveis] = useState<ItemDisponivel[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<Record<number, number>>({});
  const [itensCarregando, setItensCarregando] = useState(false);
  const [itensErro, setItensErro] = useState<string | null>(null);

  const [metodoLiquidacao, setMetodoLiquidacao] = useState<MetodoLiquidacao>("CARTAO_CONEXAO");
  const [matriculasLote, setMatriculasLote] = useState<LoteSelecao[]>([]);

  const [alunoSelecionado, setAlunoSelecionado] = useState<PessoaResumo | null>(null);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState<PessoaResumo | null>(null);
  const [idadeAluno, setIdadeAluno] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [schemaChecks, setSchemaChecks] = useState<SchemaCheckResp | null>(null);
  const [schemaErro, setSchemaErro] = useState<string | null>(null);

  const schemaProblemas = (schemaChecks?.checks ?? []).filter((c) => !c.ok);
  const schemaBloqueado = (schemaChecks !== null && !schemaChecks.ok) || !!schemaErro;
  const menorDeIdade = idadeAluno !== null && idadeAluno < 18;
  const exigeResponsavel = menorDeIdade;

  const servicoIdSelecionado =
    tipoSelecionado === "PROJETO_ARTISTICO" ? servicoProjetoId : servicoTurmaId;

  const servicoSelecionado = useMemo(
    () => servicosAdmin.find((s) => s.id === servicoIdSelecionado) ?? null,
    [servicosAdmin, servicoIdSelecionado],
  );

  const servicosProjeto = useMemo(
    () => servicosAdmin.filter((s) => s.ativo && s.tipo === "PROJETO_ARTISTICO"),
    [servicosAdmin],
  );

  const podeAvancarPasso1 = !!alunoSelecionado;
  const podeAvancarPasso2 = !!tipoSelecionado;
  const podeAvancarPasso3 =
    tipoSelecionado === "PROJETO_ARTISTICO" ? !!servicoProjetoId : cursoSelecionado.trim().length > 0;
  const podeAvancarPasso4 =
    tipoSelecionado === "PROJETO_ARTISTICO" ? true : !!turmaSelecionada && !!servicoTurmaId;
  const podeConcluir =
    !!alunoSelecionado && !!servicoIdSelecionado && (!exigeResponsavel || !!responsavelSelecionado);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setSchemaErro(null);
        const data = await fetchJSON<SchemaCheckResp>("/api/admin/schema-check/matriculas");
        if (ativo) setSchemaChecks(data);
      } catch (e: unknown) {
        if (ativo) setSchemaErro(e instanceof Error ? e.message : "Falha ao verificar schema");
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!alunoSelecionado?.id) {
        if (ativo) setIdadeAluno(null);
        return;
      }
      try {
        const data = await fetchJSON<{ data?: PessoaDetalhe }>(`/api/pessoas/${alunoSelecionado.id}`);
        const nascimento = data?.data?.nascimento ? String(data.data.nascimento) : null;
        const idade = calcularIdade(nascimento);
        if (!ativo) return;
        setIdadeAluno(idade);
        if (idade !== null && idade >= 18 && !responsavelSelecionado) {
          setResponsavelSelecionado(alunoSelecionado);
        }
      } catch {
        if (ativo) setIdadeAluno(null);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [alunoSelecionado, responsavelSelecionado]);

  useEffect(() => {
    setCursoSelecionado("");
    setTurmas([]);
    setTurmaSelecionada(null);
    setTurmasErro(null);
    setIdadeSugestao(null);
    setServicoTurmaId(null);
    setServicoProjetoId(null);
    setServicoVinculoErro(null);
    setItensDisponiveis([]);
    setItensSelecionados({});
    setItensErro(null);
  }, [tipoSelecionado]);

  useEffect(() => {
    if (passo !== 3 || tipoSelecionado === "PROJETO_ARTISTICO") return;
    void carregarCursos();
  }, [passo, tipoSelecionado]);

  useEffect(() => {
    if (passo !== 3 || tipoSelecionado !== "PROJETO_ARTISTICO") return;
    if (servicosAdmin.length > 0 || servicosCarregando) return;
    void carregarServicosAdmin();
  }, [passo, tipoSelecionado, servicosAdmin.length, servicosCarregando]);

  useEffect(() => {
    if (tipoSelecionado === "PROJETO_ARTISTICO") return;
    if (!turmaSelecionada) return;
    if (servicosAdmin.length > 0 || servicosCarregando) return;
    void carregarServicosAdmin();
  }, [tipoSelecionado, turmaSelecionada, servicosAdmin.length, servicosCarregando]);

  useEffect(() => {
    if (passo !== 4 || tipoSelecionado === "PROJETO_ARTISTICO") return;
    if (!cursoSelecionado) return;
    void carregarTurmas();
  }, [passo, tipoSelecionado, cursoSelecionado, alunoSelecionado?.id]);

  useEffect(() => {
    if (tipoSelecionado === "PROJETO_ARTISTICO") {
      setServicoTurmaId(null);
      setServicoVinculoErro(null);
      return;
    }

    if (!turmaSelecionada) {
      setServicoTurmaId(null);
      setServicoVinculoErro(null);
      return;
    }

    if (servicosAdmin.length === 0) return;

    const servico = resolveServicoPorTurma(servicosAdmin, turmaSelecionada.turma_id, tipoSelecionado);
    setServicoTurmaId(servico?.id ?? null);
    setServicoVinculoErro(servico ? null : "Nenhum servico vinculado a esta turma.");
  }, [turmaSelecionada, servicosAdmin, tipoSelecionado]);

  useEffect(() => {
    if (turmaSelecionada && typeof turmaSelecionada.ano_referencia === "number") {
      setAnoRef(turmaSelecionada.ano_referencia);
    }
  }, [turmaSelecionada]);

  useEffect(() => {
    if (tipoSelecionado === "PROJETO_ARTISTICO" && servicoSelecionado?.ano_referencia) {
      setAnoRef(Number(servicoSelecionado.ano_referencia));
    }
  }, [tipoSelecionado, servicoSelecionado?.id]);

  useEffect(() => {
    void carregarItensPorServico(servicoIdSelecionado);
  }, [servicoIdSelecionado, tipoSelecionado]);

  async function copiarSql(sql: string) {
    if (!navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(sql);
    } catch {
      // noop
    }
  }

  async function carregarCursos() {
    setErro(null);
    try {
      const data = await fetchJSON<{ ok: boolean; cursos?: string[]; message?: string }>(
        "/api/escola/matriculas/opcoes/cursos",
      );
      if (!data.ok) {
        throw new Error(data.message ?? "Falha ao carregar cursos");
      }
      setCursos(data.cursos ?? []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar cursos");
    }
  }

  async function carregarServicosAdmin() {
    setServicosErro(null);
    setServicosCarregando(true);
    try {
      const data = await fetchJSON<{
        ok: boolean;
        servicos?: ServicoAdmin[];
        data?: ServicoAdmin[];
        message?: string;
      }>("/api/admin/servicos");

      if (!data.ok) {
        throw new Error(data.message ?? "Falha ao carregar servicos");
      }

      const lista = data.servicos ?? data.data ?? [];
      setServicosAdmin(lista);
    } catch (e: unknown) {
      setServicosErro(e instanceof Error ? e.message : "Falha ao carregar servicos");
      setServicosAdmin([]);
    } finally {
      setServicosCarregando(false);
    }
  }

  async function carregarTurmas() {
    if (!cursoSelecionado || tipoSelecionado === "PROJETO_ARTISTICO") return;
    setTurmasCarregando(true);
    setTurmasErro(null);
    try {
      const params = new URLSearchParams({
        curso: cursoSelecionado,
        tipo: tipoSelecionado,
      });
      if (alunoSelecionado?.id) params.set("aluno_id", String(alunoSelecionado.id));
      const data = await fetchJSON<{ ok: boolean; turmas: TurmaOpcao[]; idade?: number | null }>(
        `/api/escola/matriculas/opcoes/turmas?${params.toString()}`,
      );
      if (!data.ok) {
        throw new Error("Falha ao carregar turmas");
      }
      setTurmas(data.turmas ?? []);
      setIdadeSugestao(typeof data.idade === "number" ? data.idade : null);
    } catch (e: unknown) {
      setTurmasErro(e instanceof Error ? e.message : "Falha ao carregar turmas");
      setTurmas([]);
      setIdadeSugestao(null);
    } finally {
      setTurmasCarregando(false);
    }
  }

  async function carregarItensPorServico(servicoId: number | null) {
    setItensErro(null);
    setItensDisponiveis([]);
    setItensSelecionados({});
    if (!servicoId) return;

    setItensCarregando(true);
    try {
      const data = await fetchJSON<{ ok: boolean; itens: ServicoItemRow[] }>(
        `/api/admin/escola/servicos/${servicoId}/itens`,
      );
      const itensBase = (data.itens ?? []).filter((it) => it.ativo);

      const precosList = await Promise.all(
        itensBase.map(async (it) => {
          const resp = await fetchJSON<{ ok: boolean; precos: ServicoItemPrecoRow[] }>(
            `/api/admin/escola/itens/${it.id}/precos`,
          );
          return resp.precos ?? [];
        }),
      );

      const itensComPreco: ItemDisponivel[] = itensBase.map((it, idx) => {
        const precos = precosList[idx] ?? [];
        const precoAtivo = precos.find((p) => p.ativo) ?? null;
        return {
          id: it.id,
          codigo: it.codigo,
          nome: it.nome,
          tipo_item: it.tipo_item,
          obrigatorio: it.obrigatorio,
          preco_ativo_centavos: precoAtivo ? Number(precoAtivo.valor_centavos) : null,
          moeda: precoAtivo?.moeda ?? "BRL",
        };
      });

      setItensDisponiveis(itensComPreco);

      const selecionados: Record<number, number> = {};
      if (tipoSelecionado === "REGULAR") {
        const mensalidade = itensComPreco.find(
          (it) => it.codigo === "MENSALIDADE" && it.preco_ativo_centavos !== null,
        );
        if (mensalidade) {
          selecionados[mensalidade.id] = 1;
        }
      }
      setItensSelecionados(selecionados);
    } catch (e: unknown) {
      setItensErro(e instanceof Error ? e.message : "Falha ao carregar itens do servico.");
    } finally {
      setItensCarregando(false);
    }
  }

  function toggleItemSelecionado(itemId: number, checked: boolean) {
    setItensSelecionados((prev) => {
      const next = { ...prev };
      if (checked) {
        next[itemId] = prev[itemId] ?? 1;
      } else {
        delete next[itemId];
      }
      return next;
    });
  }

  function atualizarQuantidadeItem(itemId: number, value: string) {
    const quantidade = parseQuantidade(value);
    if (!quantidade) return;
    setItensSelecionados((prev) => {
      if (!prev[itemId]) return prev;
      return { ...prev, [itemId]: quantidade };
    });
  }

  function buildItensPayload(): Array<{ item_id: number; quantidade: number }> {
    return Object.entries(itensSelecionados)
      .map(([id, quantidade]) => ({ item_id: Number(id), quantidade }))
      .filter((it) => Number.isInteger(it.item_id) && it.item_id > 0 && it.quantidade > 0);
  }

  function validarItens(itensPayload: Array<{ item_id: number; quantidade: number }>): string | null {
    if (itensPayload.length === 0) return null;
    if (!servicoIdSelecionado) return "Itens exigem servico valido.";
    const itensSemPreco = itensPayload.filter((it) => {
      const info = itensDisponiveis.find((item) => item.id === it.item_id);
      return !info || info.preco_ativo_centavos === null;
    });
    if (itensSemPreco.length > 0) return "Existem itens selecionados sem preco ativo.";
    return null;
  }

  function montarSelecaoAtual(): LoteSelecao | null {
    const itensPayload = buildItensPayload();
    const itensErroMsg = validarItens(itensPayload);
    if (itensErroMsg) {
      setErro(itensErroMsg);
      return null;
    }

    if (!servicoIdSelecionado) {
      setErro("Selecione um servico valido para a matricula.");
      return null;
    }

    if (tipoSelecionado === "PROJETO_ARTISTICO") {
      return {
        curso: null,
        tipo: tipoSelecionado,
        turma_id: null,
        turma_nome: null,
        ano_referencia: typeof anoRef === "number" ? anoRef : null,
        servico_id: servicoIdSelecionado,
        servico_label: servicoSelecionado ? labelServicoAdmin(servicoSelecionado) : null,
        itens: itensPayload,
      };
    }

    if (!cursoSelecionado) {
      setErro("Selecione um curso.");
      return null;
    }
    if (!turmaSelecionada) {
      setErro("Selecione uma turma.");
      return null;
    }

    return {
      curso: cursoSelecionado,
      tipo: tipoSelecionado,
      turma_id: turmaSelecionada.turma_id,
      turma_nome: turmaSelecionada.nome ?? null,
      ano_referencia: typeof anoRef === "number" ? anoRef : null,
      servico_id: servicoIdSelecionado,
      servico_label: servicoSelecionado ? labelServicoAdmin(servicoSelecionado) : null,
      itens: itensPayload,
    };
  }

  function handleAlunoChange(pessoa: PessoaResumo | null) {
    const prevAlunoId = alunoSelecionado?.id ?? null;
    setAlunoSelecionado(pessoa);

    if (!pessoa) {
      setIdadeAluno(null);
      if (responsavelSelecionado?.id === prevAlunoId) {
        setResponsavelSelecionado(null);
      }
      return;
    }

    if (responsavelSelecionado?.id === prevAlunoId) {
      setResponsavelSelecionado(null);
    }
  }

  function handleResponsavelChange(pessoa: PessoaResumo | null) {
    setResponsavelSelecionado(pessoa);
  }

  function irParaProximoPasso() {
    setErro(null);
    if (passo === 1 && !podeAvancarPasso1) {
      setErro("Selecione o aluno.");
      return;
    }
    if (passo === 2 && !podeAvancarPasso2) {
      setErro("Selecione o tipo de matricula.");
      return;
    }
    if (passo === 3 && !podeAvancarPasso3) {
      setErro(tipoSelecionado === "PROJETO_ARTISTICO" ? "Selecione o servico." : "Selecione o curso.");
      return;
    }
    if (passo === 4 && !podeAvancarPasso4) {
      setErro(servicoTurmaId ? "Selecione a turma." : "Turma sem servico vinculado.");
      return;
    }
    if (passo === 3 && tipoSelecionado === "PROJETO_ARTISTICO") {
      setPasso(5);
      return;
    }
    setPasso((prev) => (prev < 5 ? ((prev + 1) as 1 | 2 | 3 | 4 | 5) : prev));
  }

  function voltarPasso() {
    setErro(null);
    if (passo === 5 && tipoSelecionado === "PROJETO_ARTISTICO") {
      setPasso(3);
      return;
    }
    setPasso((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5) : prev));
  }

  function adicionarOutraSelecao() {
    setErro(null);
    if (schemaBloqueado) {
      setErro("Ambiente incompleto para matricula.");
      return;
    }
    if (!alunoSelecionado) {
      setErro("Selecione o aluno.");
      return;
    }
    if (exigeResponsavel && !responsavelSelecionado) {
      setErro("Responsavel financeiro obrigatorio para menor de idade.");
      return;
    }

    const selecao = montarSelecaoAtual();
    if (!selecao) return;

    setMatriculasLote((prev) => [...prev, selecao]);
    setCursoSelecionado("");
    setTurmas([]);
    setTurmaSelecionada(null);
    setItensDisponiveis([]);
    setItensSelecionados({});
    setItensErro(null);
    setIdadeSugestao(null);
    setServicoProjetoId(null);
    setServicoTurmaId(null);
    setServicoVinculoErro(null);
    setPasso(2);
  }

  async function onCriar() {
    setErro(null);

    if (schemaBloqueado) {
      setErro("Ambiente incompleto para matricula.");
      return;
    }

    if (!alunoSelecionado) {
      setErro("Selecione o aluno.");
      return;
    }

    if (exigeResponsavel && !responsavelSelecionado) {
      setErro("Responsavel financeiro obrigatorio para menor de idade.");
      return;
    }

    const selecaoAtual = montarSelecaoAtual();
    if (!selecaoAtual) return;

    const loteFinal = [...matriculasLote, selecaoAtual];

    if (loteFinal.length > 1) {
      const semServico = loteFinal.find((s) => !s.servico_id);
      if (semServico) {
        setErro("Lote exige servico_id para cada selecao nesta versao.");
        return;
      }

      setLoading(true);
      try {
        const payload = {
          aluno_pessoa_id: alunoSelecionado.id,
          responsavel_financeiro_pessoa_id: responsavelSelecionado?.id,
          ano_referencia: anoRef,
          data_matricula: dataMatricula,
          metodo_liquidacao: metodoLiquidacao,
          matriculas: loteFinal.map((s) => ({
            servico_id: s.servico_id ?? undefined,
            itens: s.itens,
          })),
        };

        const data = await fetchJSON<CriarLoteResp>("/api/matriculas/operacional/criar-lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const primeiroOk = (data.results ?? []).find((r) => r.ok && r.matricula_id);
        if (primeiroOk?.matricula_id) {
          router.push(`/escola/matriculas/${primeiroOk.matricula_id}`);
        } else {
          setErro("Lote criado, mas nao foi possivel abrir a matricula automaticamente.");
        }
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : "Falha ao criar matriculas em lote");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        pessoa_id: alunoSelecionado.id,
        ano_referencia: anoRef,
        data_matricula: dataMatricula,
        gerar_prorata: gerarProrata,
        metodo_liquidacao: metodoLiquidacao,
        servico_id: selecaoAtual.servico_id,
      };

      if (responsavelSelecionado?.id) {
        payload.responsavel_financeiro_id = responsavelSelecionado.id;
      }

      if (selecaoAtual.itens.length > 0) payload.itens = selecaoAtual.itens;
      if (mesInicio !== "AUTO") payload.mes_inicio_cobranca = mesInicio;

      const data = await fetchJSON<CriarMatriculaResp>("/api/matriculas/operacional/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const id = data.matricula?.id;
      if (!id) throw new Error("Resposta invalida: matricula sem id.");
      router.push(`/escola/matriculas/${id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar matricula");
    } finally {
      setLoading(false);
    }
  }

  const resumoItens = buildItensPayload();

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Nova matricula (Escola)</h1>
        <p className="text-sm text-muted-foreground">
          Selecione aluno, tipo, curso/turma e itens. Ao concluir, o sistema registra a matricula e aplica a
          liquidacao escolhida.
        </p>
      </div>

      {schemaBloqueado ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium">Ambiente incompleto para matricula</div>
          <p className="mt-1 text-xs">
            {schemaErro ?? "Faltam tabelas ou colunas essenciais para o fluxo de matricula."}
          </p>
          {schemaProblemas.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {schemaProblemas.map((c) => (
                <div key={c.key} className="rounded border border-red-200 bg-white/70 p-2">
                  <div className="text-xs font-medium">{c.message}</div>
                  {c.sql_sugerido ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-white px-2 py-1 text-xs">{c.sql_sugerido}</code>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs hover:bg-white"
                        onClick={() => void copiarSql(c.sql_sugerido ?? "")}
                      >
                        Copiar
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {erro ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{erro}</div>
      ) : null}

      <div className="rounded-lg border p-4">
        {passo === 1 ? (
          <div className="space-y-4">
            <PessoaSearchBox
              label="Aluno"
              placeholder="Buscar aluno (2+ caracteres)"
              valueId={alunoSelecionado?.id ?? null}
              onChange={handleAlunoChange}
              disabled={loading}
            />
          </div>
        ) : null}

        {passo === 2 ? (
          <div className="space-y-4">
            <div className="min-w-[220px]">
              <label className="text-sm font-medium">Tipo de matricula</label>
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={tipoSelecionado}
                onChange={(e) => setTipoSelecionado(e.target.value as TipoMatricula)}
              >
                <option value="REGULAR">Turma regular</option>
                <option value="CURSO_LIVRE">Curso livre</option>
                <option value="PROJETO_ARTISTICO">Projeto artistico</option>
              </select>
            </div>
          </div>
        ) : null}

        {passo === 3 ? (
          <div className="space-y-4">
            {tipoSelecionado === "PROJETO_ARTISTICO" ? (
              <div className="min-w-[260px]">
                <label className="text-sm font-medium">Servico (projeto)</label>
                <div className="mt-1 flex gap-2">
                  <select
                    className="w-full rounded-md border px-2 py-2 text-sm"
                    value={servicoProjetoId ?? ""}
                    onChange={(e) => setServicoProjetoId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecione...</option>
                    {servicosProjeto.map((s) => (
                      <option key={s.id} value={s.id}>
                        {labelServicoAdmin(s)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-md border px-3 text-sm hover:bg-muted"
                    onClick={() => void carregarServicosAdmin()}
                    disabled={loading || servicosCarregando}
                  >
                    Carregar
                  </button>
                </div>
                {servicosCarregando ? (
                  <p className="mt-1 text-xs text-muted-foreground">Carregando servicos...</p>
                ) : null}
                {servicosErro ? <p className="mt-1 text-xs text-red-700">{servicosErro}</p> : null}
                {!servicosCarregando && servicosProjeto.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Nenhum servico de projeto encontrado.</p>
                ) : null}
              </div>
            ) : (
              <div className="min-w-[260px]">
                <label className="text-sm font-medium">Curso</label>
                <div className="mt-1 flex gap-2">
                  <select
                    className="w-full rounded-md border px-2 py-2 text-sm"
                    value={cursoSelecionado}
                    onChange={(e) => {
                      setCursoSelecionado(e.target.value);
                      setTurmaSelecionada(null);
                    }}
                  >
                    <option value="">Selecione...</option>
                    {cursos.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-md border px-3 text-sm hover:bg-muted"
                    onClick={() => void carregarCursos()}
                    disabled={loading}
                  >
                    Carregar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {passo === 4 && tipoSelecionado !== "PROJETO_ARTISTICO" ? (
          <div className="space-y-4">
            <div className="min-w-[260px]">
              <label className="text-sm font-medium">Turma</label>
              {turmasCarregando ? (
                <p className="mt-1 text-xs text-muted-foreground">Carregando turmas...</p>
              ) : null}
              {turmasErro ? <p className="mt-1 text-xs text-red-700">{turmasErro}</p> : null}
              {idadeSugestao !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">Sugestao por idade: {idadeSugestao} anos</p>
              ) : null}
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={turmaSelecionada?.turma_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  const turma = turmas.find((t) => t.turma_id === v) ?? null;
                  setTurmaSelecionada(turma);
                }}
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {turmas.map((t) => (
                  <option key={t.turma_id} value={t.turma_id}>
                    {labelTurmaOption(tipoSelecionado, t)}
                  </option>
                ))}
              </select>
              {!turmasCarregando && turmas.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nenhuma turma encontrada para este curso.</p>
              ) : null}
              {servicosCarregando ? (
                <p className="mt-2 text-xs text-muted-foreground">Validando servico vinculado...</p>
              ) : null}
              {servicoVinculoErro ? <p className="mt-2 text-xs text-red-700">{servicoVinculoErro}</p> : null}
              {turmaSelecionada && servicoSelecionado ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Servico vinculado: {labelServicoAdmin(servicoSelecionado)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {passo === 5 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Ano referencia</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  type="number"
                  value={anoRef}
                  onChange={(e) => setAnoRef(Number(e.target.value))}
                  min={2000}
                  max={2100}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data matricula</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  type="date"
                  value={dataMatricula}
                  onChange={(e) => setDataMatricula(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mes inicio cobranca</label>
                <select
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  value={mesInicio}
                  onChange={(e) => {
                    const v = e.target.value === "AUTO" ? "AUTO" : Number(e.target.value);
                    setMesInicio(v);
                  }}
                >
                  <option value="AUTO">Auto</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Gerar pro-rata</label>
                <select
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  value={gerarProrata ? "SIM" : "NAO"}
                  onChange={(e) => setGerarProrata(e.target.value === "SIM")}
                >
                  <option value="SIM">Sim</option>
                  <option value="NAO">Nao</option>
                </select>
              </div>
            </div>

            <PessoaSearchBox
              label="Responsavel financeiro"
              placeholder="Buscar responsavel (2+ caracteres)"
              valueId={responsavelSelecionado?.id ?? null}
              onChange={handleResponsavelChange}
              disabled={loading || !alunoSelecionado}
            />
            {exigeResponsavel ? (
              <p className="text-xs text-muted-foreground">
                Aluno menor de idade: selecione um responsavel financeiro.
              </p>
            ) : null}

            <div className="min-w-[220px]">
              <label className="text-sm font-medium">Liquidacao</label>
              <select
                className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                value={metodoLiquidacao}
                onChange={(e) => setMetodoLiquidacao(e.target.value as MetodoLiquidacao)}
                disabled={loading}
              >
                <option value="CARTAO_CONEXAO">Cartao Conexao</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Itens da matricula</div>
              {servicoIdSelecionado === null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Este servico ainda nao esta selecionado. Itens nao estao disponiveis.
                </p>
              ) : null}
              {itensCarregando ? (
                <p className="mt-2 text-xs text-muted-foreground">Carregando itens do servico...</p>
              ) : null}
              {itensErro ? <p className="mt-2 text-xs text-red-700">{itensErro}</p> : null}
              {!itensCarregando && itensDisponiveis.length === 0 && servicoIdSelecionado !== null ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem itens cadastrados para este servico.</p>
              ) : null}
              {itensDisponiveis.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {itensDisponiveis.map((item) => {
                    const selecionado = itensSelecionados[item.id] ?? 0;
                    const semPreco = item.preco_ativo_centavos === null;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selecionado > 0}
                            disabled={loading || semPreco}
                            onChange={(e) => toggleItemSelecionado(item.id, e.target.checked)}
                          />
                          <span>
                            {item.nome} ({item.codigo})
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={semPreco ? "text-xs text-red-700" : "text-xs text-muted-foreground"}>
                            {formatBRL(item.preco_ativo_centavos)}
                          </span>
                          <input
                            className="w-20 rounded border px-2 py-1 text-xs"
                            type="number"
                            min={1}
                            value={selecionado > 0 ? selecionado : 1}
                            disabled={loading || semPreco || selecionado === 0}
                            onChange={(e) => atualizarQuantidadeItem(item.id, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">Itens sem preco ativo ficam bloqueados.</p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Resumo atual</div>
              <div className="mt-2 grid gap-1">
                <div>
                  <span className="text-muted-foreground">Tipo:</span> {labelTipoMatricula(tipoSelecionado)}
                </div>
                {tipoSelecionado === "PROJETO_ARTISTICO" ? (
                  <div>
                    <span className="text-muted-foreground">Servico:</span>{" "}
                    {servicoSelecionado ? labelServicoAdmin(servicoSelecionado) : "Nao selecionado"}
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground">Curso:</span> {cursoSelecionado || "Nao selecionado"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Turma:</span>{" "}
                      {turmaSelecionada ? labelTurmaOption(tipoSelecionado, turmaSelecionada) : "Nao selecionada"}
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted-foreground">Aluno:</span> {alunoSelecionado?.nome ?? "Nao selecionado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Responsavel financeiro:</span>{" "}
                  {responsavelSelecionado?.nome ?? "Nao selecionado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Itens:</span> {resumoItens.length}
                </div>
                <div>
                  <span className="text-muted-foreground">Liquidacao:</span>{" "}
                  {metodoLiquidacao === "CARTAO_CONEXAO" ? "Cartao Conexao" : "Outro"}
                </div>
              </div>
              {metodoLiquidacao === "CARTAO_CONEXAO" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  A matricula cria lancamentos no Cartao Conexao. A fatura e gerada no ciclo do cartao.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Liquidacao definida como Outro. Nenhum lancamento sera criado automaticamente.
                </p>
              )}
            </div>

            {matriculasLote.length > 0 ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">Selecoes adicionadas</div>
                <ul className="mt-2 list-disc pl-5">
                  {matriculasLote.map((s, idx) => {
                    const label =
                      s.tipo === "PROJETO_ARTISTICO"
                        ? s.servico_label ?? `Servico #${s.servico_id ?? "-"}`
                        : `${s.curso ?? "-"} - ${s.turma_nome ?? `Turma #${s.turma_id ?? "-"}`}`;
                    return (
                      <li key={`${s.servico_id ?? s.turma_id ?? "sel"}-${idx}`}>
                        {label} ({labelTipoMatricula(s.tipo)})
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            onClick={() => void voltarPasso()}
            disabled={loading || passo === 1}
          >
            Voltar
          </button>

          {passo < 5 ? (
            <button
              type="button"
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void irParaProximoPasso()}
              disabled={
                loading ||
                (passo === 1
                  ? !podeAvancarPasso1
                  : passo === 2
                    ? !podeAvancarPasso2
                    : passo === 3
                      ? !podeAvancarPasso3
                      : !podeAvancarPasso4)
              }
            >
              Proximo
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => void adicionarOutraSelecao()}
                disabled={loading || schemaBloqueado || !podeConcluir}
              >
                Adicionar outro curso/turma
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void onCriar()}
                disabled={loading || schemaBloqueado || !podeConcluir}
              >
                {loading ? "Criando..." : "Concluir matricula"}
              </button>
            </div>
          )}
        </div>

        {passo === 5 ? (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            Voce podera revisar detalhes e lancamentos na tela da matricula apos concluir.
          </p>
        ) : null}
      </div>
    </div>
  );
}
