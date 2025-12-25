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

type ServicoTipo = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ServicoRow = {
  id: number;
  tipo: ServicoTipo;
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

function labelTipoServico(tipo: string): string {
  switch (tipo) {
    case "REGULAR":
      return "Turma regular";
    case "CURSO_LIVRE":
      return "Curso livre (Workshop)";
    case "PROJETO_ARTISTICO":
      return "Projeto artistico";
    default:
      return tipo;
  }
}

function labelServico(servico: ServicoRow): string {
  if (servico.referencia_tipo === "TURMA" && servico.turma_nome) {
    const ano = servico.ano_referencia ?? "-";
    return `${labelTipoServico(servico.tipo)} - ${servico.turma_nome} (${ano})`;
  }
  const titulo = servico.titulo?.trim() ? servico.titulo : `Servico #${servico.id}`;
  return `${labelTipoServico(servico.tipo)} - ${titulo}`;
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

  const [anoRef, setAnoRef] = useState<number>(2026);
  const [dataMatricula, setDataMatricula] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [mesInicio, setMesInicio] = useState<number | "AUTO">("AUTO");
  const [gerarProrata, setGerarProrata] = useState<boolean>(true);
  // Servico
  const [servicos, setServicos] = useState<ServicoRow[]>([]);
  const [servicoId, setServicoId] = useState<number | null>(null);
  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicos, servicoId],
  );

  const [itensDisponiveis, setItensDisponiveis] = useState<ItemDisponivel[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<Record<number, number>>({});
  const [itensCarregando, setItensCarregando] = useState(false);
  const [itensErro, setItensErro] = useState<string | null>(null);
  // Metodo de liquidacao
  const [metodoLiquidacao, setMetodoLiquidacao] = useState<"CARTAO_CONEXAO" | "OUTRO">("CARTAO_CONEXAO");

  const [passo, setPasso] = useState<1 | 2 | 3>(1);

  // Pessoas
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
  const podeAvancarPasso1 = !!servicoId;
  const podeAvancarPasso2 = !!alunoSelecionado;
  const podeConcluir =
    !!servicoId && !!alunoSelecionado && (!exigeResponsavel || !!responsavelSelecionado);

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

  async function copiarSql(sql: string) {
    if (!navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(sql);
    } catch {
      // noop
    }
  }

  async function carregarServicos() {
    setErro(null);
    try {
      // Reuso da API Admin (por enquanto). Se você quiser, depois criamos uma rota "opções" no contexto escola.
      const data = await fetchJSON<{ ok: boolean; servicos: ServicoRow[] }>("/api/admin/servicos");
      const lista = (data.servicos ?? []).filter((s) => s.ativo);
      setServicos(lista);

      if (lista.length === 1 && !servicoId) {
        const unico = lista[0];
        setServicoId(unico.id);
        setAnoRef((prev) => (typeof unico.ano_referencia === "number" ? unico.ano_referencia : prev));
        void carregarItensPorServico(unico);
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar serviços");
    }
  }

  async function carregarItensPorServico(se: ServicoRow | null) {
    setItensErro(null);
    setItensDisponiveis([]);
    setItensSelecionados({});
    if (!se) return;

    setItensCarregando(true);
    try {
      const data = await fetchJSON<{ ok: boolean; itens: ServicoItemRow[] }>(
        `/api/admin/escola/servicos/${se.id}/itens`,
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
      if (se.tipo === "REGULAR") {
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
      setErro("Selecione um servico.");
      return;
    }
    if (passo === 2 && !podeAvancarPasso2) {
      setErro("Selecione o aluno.");
      return;
    }
    setPasso((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  }

  function voltarPasso() {
    setErro(null);
    setPasso((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  }

  async function onCriar() {
    setErro(null);

    if (schemaBloqueado) {
      setErro("Ambiente incompleto para matricula.");
      return;
    }


    if (!servicoId) {
      setErro("Selecione um servico.");
      return;
    }

    const alunoId = alunoSelecionado?.id ?? null;
    const responsavelId = responsavelSelecionado?.id ?? null;

    if (!alunoId) {
      setErro("Selecione o aluno.");
      return;
    }

    if (exigeResponsavel && !responsavelId) {
      setErro("Responsavel financeiro obrigatorio para menor de idade.");
      return;
    }

    const se = servicoSelecionado;
    if (!se) {
      setErro("Servico invalido.");
      return;
    }

    const itensPayload = Object.entries(itensSelecionados)
      .map(([id, quantidade]) => ({ item_id: Number(id), quantidade }))
      .filter((it) => Number.isInteger(it.item_id) && it.item_id > 0 && it.quantidade > 0);

    if (itensPayload.length > 0) {
      const itensSemPreco = itensPayload.filter((it) => {
        const info = itensDisponiveis.find((item) => item.id === it.item_id);
        return !info || info.preco_ativo_centavos === null;
      });
      if (itensSemPreco.length > 0) {
        setErro("Existem itens selecionados sem preco ativo.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        pessoa_id: alunoId,
        ano_referencia: anoRef,
        data_matricula: dataMatricula,
        gerar_prorata: gerarProrata,
        servico_id: servicoId,
      };

      if (responsavelId) payload.responsavel_financeiro_id = responsavelId;

      if (itensPayload.length > 0) payload.itens = itensPayload;

      if (mesInicio !== "AUTO") payload.mes_inicio_cobranca = mesInicio;
      payload.metodo_liquidacao = metodoLiquidacao;
      const data = await fetchJSON<CriarMatriculaResp>("/api/matriculas/operacional/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const id = data.matricula?.id;
      if (!id) throw new Error("Resposta inválida: matrícula sem id.");
      router.push(`/escola/matriculas/${id}`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar matrícula");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Nova matricula (Escola)</h1>
        <p className="text-sm text-muted-foreground">
        Selecione o servico, informe aluno e responsavel. Ao concluir, o sistema registra a matricula e aplica a liquidacao escolhida.
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
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </div>
      ) : null}

      <div className="rounded-lg border p-4">
        {passo === 1 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[260px] flex-1">
                <label className="text-sm font-medium">Servico</label>
                <div className="mt-1 flex gap-2">
                  <select
                    className="w-full rounded-md border px-2 py-2 text-sm"
                    value={servicoId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      setServicoId(v);
                      const se = servicos.find((s) => s.id === v) ?? null;
                      if (se) {
                        void carregarItensPorServico(se);
                      } else {
                        void carregarItensPorServico(null);
                      }
                    }}
                  >
                    <option value="">Selecione...</option>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {labelServico(s)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="rounded-md border px-3 text-sm hover:bg-muted"
                    onClick={() => void carregarServicos()}
                    disabled={loading}
                  >
                    Carregar
                  </button>
                </div>

              </div>

              <div className="min-w-[180px]">
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

              <div className="min-w-[180px]">
                <label className="text-sm font-medium">Data matricula</label>
                <input
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                  type="date"
                  value={dataMatricula}
                  onChange={(e) => setDataMatricula(e.target.value)}
                />
              </div>

              <div className="min-w-[200px]">
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

              <div className="min-w-[160px]">
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

          </div>
        ) : null}

        {passo === 2 ? (
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

        {passo === 3 ? (
          <div className="space-y-4">
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
                onChange={(e) => setMetodoLiquidacao(e.target.value as "CARTAO_CONEXAO" | "OUTRO")}
                disabled={loading}
              >
                <option value="CARTAO_CONEXAO">Cartao Conexao</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Itens da matricula</div>
              {itensCarregando ? (
                <p className="mt-2 text-xs text-muted-foreground">Carregando itens do servico...</p>
              ) : null}
              {itensErro ? <p className="mt-2 text-xs text-red-700">{itensErro}</p> : null}
              {!itensCarregando && itensDisponiveis.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem itens cadastrados para este servico.</p>
              ) : null}
              {itensDisponiveis.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {itensDisponiveis.map((item) => {
                    const selecionado = itensSelecionados[item.id] ?? 0;
                    const semPreco = item.preco_ativo_centavos === null;
                    return (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-2">
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
              <p className="mt-2 text-xs text-muted-foreground">
                Itens sem preco ativo ficam bloqueados para selecao.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">Resumo</div>
              <div className="mt-2 grid gap-1">
                <div>
                  <span className="text-muted-foreground">Servico:</span>{" "}
                  {servicoSelecionado ? labelServico(servicoSelecionado) : "Nao selecionado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Aluno:</span>{" "}
                  {alunoSelecionado?.nome ?? "Nao selecionado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Responsavel financeiro:</span>{" "}
                  {responsavelSelecionado?.nome ?? "Nao selecionado"}
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
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            onClick={() => void voltarPasso()}
            disabled={loading || passo === 1}
          >
            Voltar
          </button>

          {passo < 3 ? (
            <button
              type="button"
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void irParaProximoPasso()}
              disabled={loading || (passo === 1 ? !podeAvancarPasso1 : !podeAvancarPasso2)}
            >
              Proximo
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void onCriar()}
              disabled={loading || schemaBloqueado || !podeConcluir}
            >
              {loading ? "Criando..." : "Criar matricula"}
            </button>
          )}
        </div>

        {passo === 3 ? (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            Voce podera revisar detalhes e lancamentos na tela da matricula apos concluir.
          </p>
        ) : null}
      </div>
    </div>
  );
}





