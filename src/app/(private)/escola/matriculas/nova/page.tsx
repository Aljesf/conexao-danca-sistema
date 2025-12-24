"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PessoaResumo = {
  id: number;
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
};

type ServicoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "ESPETACULO" | "EVENTO";

type ServicoRow = {
  id: number;
  tipo: ServicoTipo;
  titulo: string;
  ativo: boolean;
  origem_tabela?: string | null;
  origem_id?: number | null;
  ano_referencia?: number | null;
};

type TurmaRow = {
  turma_id: number;
  nome: string;
  ativo: boolean;
  ano_referencia?: number | null;
};

type CriarMatriculaResp = {
  ok: boolean;
  matricula?: { id: number };
  error?: string;
  message?: string;
};

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

  // Serviço
  const [servicos, setServicos] = useState<ServicoRow[]>([]);
  const [servicoId, setServicoId] = useState<number | null>(null);
  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicos, servicoId],
  );

  // Turma (apenas se serviço = TURMA)
  const [turmas, setTurmas] = useState<TurmaRow[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);

  // Pessoas
  const [alunoBusca, setAlunoBusca] = useState("");
  const [alunoOpcoes, setAlunoOpcoes] = useState<PessoaResumo[]>([]);
  const [alunoId, setAlunoId] = useState<number | null>(null);

  const [respBusca, setRespBusca] = useState("");
  const [respOpcoes, setRespOpcoes] = useState<PessoaResumo[]>([]);
  const [respId, setRespId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarServicos() {
    setErro(null);
    try {
      // Reuso da API Admin (por enquanto). Se você quiser, depois criamos uma rota "opções" no contexto escola.
      const data = await fetchJSON<{ ok: boolean; servicos: ServicoRow[] }>("/api/admin/servicos");
      setServicos((data.servicos ?? []).filter((s) => s.ativo));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar serviços");
    }
  }

  async function buscarPessoas(q: string, setFn: (rows: PessoaResumo[]) => void) {
    if (q.trim().length < 2) {
      setFn([]);
      return;
    }
    // Reusa sua rota existente de busca
    const data = await fetchJSON<{ ok: boolean; pessoas: PessoaResumo[] }>(
      `/api/pessoas/busca?q=${encodeURIComponent(q)}`,
    );
    setFn(data.pessoas ?? []);
  }

  async function carregarTurmasPorServico(se: ServicoRow) {
    // Para o v1, se serviço TURMA tiver origem_id, usamos.
    // Se você quiser listar turmas ativas para escolha, precisamos de um endpoint de turmas/opções (não faremos agora).
    // Aqui fazemos um caminho simples: se existir origem_id, fixa a turma.
    if (se.tipo !== "TURMA") {
      setTurmaId(null);
      return;
    }
    if (typeof se.origem_id === "number" && se.origem_id > 0) {
      setTurmaId(se.origem_id);
      setTurmas([]);
      return;
    }

    // fallback: se não tiver origem_id, você escolhe manualmente pelo campo numérico (turmaId).
    setTurmas([]);
  }

  async function onCriar() {
    setErro(null);

    if (!servicoId) {
      setErro("Selecione um serviço.");
      return;
    }
    if (!alunoId) {
      setErro("Selecione o aluno.");
      return;
    }
    if (!respId) {
      setErro("Selecione o responsável financeiro.");
      return;
    }

    const se = servicoSelecionado;
    if (!se) {
      setErro("Serviço inválido.");
      return;
    }

    // TURMA exige turma_id (via origem_id ou digitado)
    const turmaObrigatoria = se.tipo === "TURMA";
    const turmaFinal = turmaObrigatoria ? turmaId : null;
    if (turmaObrigatoria && (!turmaFinal || turmaFinal <= 0)) {
      setErro("Serviço do tipo TURMA exige turma_id.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        pessoa_id: alunoId,
        responsavel_financeiro_id: respId,
        ano_referencia: anoRef,
        data_matricula: dataMatricula,
        gerar_prorata: gerarProrata,
        servico_id: servicoId,
      };

      if (turmaFinal) payload.turma_id = turmaFinal;
      if (mesInicio !== "AUTO") payload.mes_inicio_cobranca = mesInicio;

      // Não enviar metodo_liquidacao => default CARTAO_CONEXAO
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
        <h1 className="text-xl font-semibold">Nova matrícula (Escola)</h1>
        <p className="text-sm text-muted-foreground">
          Fluxo operacional: matrícula → lançamentos no Cartão Conexão. Configurações e preços ficam no Admin.
        </p>
      </div>

      {erro ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </div>
      ) : null}

      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="text-sm font-medium">Serviço</label>
            <div className="mt-1 flex gap-2">
              <select
                className="w-full rounded-md border px-2 py-2 text-sm"
                value={servicoId ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setServicoId(v);
                  const se = servicos.find((s) => s.id === v) ?? null;
                  if (se) void carregarTurmasPorServico(se);
                }}
              >
                <option value="">Selecione…</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.tipo}] {s.titulo}
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

            {servicoSelecionado?.tipo === "TURMA" && servicoSelecionado?.origem_id ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Serviço TURMA vinculado automaticamente à turma_id = {servicoSelecionado.origem_id}.
              </p>
            ) : null}
          </div>

          <div className="min-w-[180px]">
            <label className="text-sm font-medium">Ano referência</label>
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
            <label className="text-sm font-medium">Data matrícula</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              type="date"
              value={dataMatricula}
              onChange={(e) => setDataMatricula(e.target.value)}
            />
          </div>

          <div className="min-w-[200px]">
            <label className="text-sm font-medium">Mês início cobrança</label>
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
            <label className="text-sm font-medium">Gerar pró-rata</label>
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={gerarProrata ? "SIM" : "NAO"}
              onChange={(e) => setGerarProrata(e.target.value === "SIM")}
            >
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
          </div>
        </div>

        {servicoSelecionado?.tipo === "TURMA" && !servicoSelecionado?.origem_id ? (
          <div className="mt-4">
            <label className="text-sm font-medium">Turma ID</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              type="number"
              value={turmaId ?? ""}
              onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : null)}
              placeholder="Informe turma_id"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              (v1) Se o serviço TURMA não tem origem_id, informe manualmente o turma_id.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Aluno (pessoa)</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full rounded-md border px-2 py-2 text-sm"
                value={alunoBusca}
                onChange={(e) => setAlunoBusca(e.target.value)}
                placeholder="Digite nome/CPF (mín 2 letras)…"
              />
              <button
                type="button"
                className="rounded-md border px-3 text-sm hover:bg-muted"
                onClick={() => void buscarPessoas(alunoBusca, setAlunoOpcoes)}
                disabled={loading}
              >
                Buscar
              </button>
            </div>

            <select
              className="mt-2 w-full rounded-md border px-2 py-2 text-sm"
              value={alunoId ?? ""}
              onChange={(e) => setAlunoId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione…</option>
              {alunoOpcoes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome ?? "Sem nome"} (#{p.id}) {p.cpf ? `CPF: ${p.cpf}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Responsável financeiro (pessoa)</label>
            <div className="mt-1 flex gap-2">
              <input
                className="w-full rounded-md border px-2 py-2 text-sm"
                value={respBusca}
                onChange={(e) => setRespBusca(e.target.value)}
                placeholder="Digite nome/CPF (mín 2 letras)…"
              />
              <button
                type="button"
                className="rounded-md border px-3 text-sm hover:bg-muted"
                onClick={() => void buscarPessoas(respBusca, setRespOpcoes)}
                disabled={loading}
              >
                Buscar
              </button>
            </div>

            <select
              className="mt-2 w-full rounded-md border px-2 py-2 text-sm"
              value={respId ?? ""}
              onChange={(e) => setRespId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione…</option>
              {respOpcoes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome ?? "Sem nome"} (#{p.id}) {p.cpf ? `CPF: ${p.cpf}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void onCriar()}
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar matrícula"}
          </button>
        </div>
      </div>
    </div>
  );
}
