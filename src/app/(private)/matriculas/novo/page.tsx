"use client";

import { useEffect, useState } from "react";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  [key: string]: any;
};

type PessoaResumo = {
  id: number;
  nome_completo?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone_principal?: string | null;
};

type TurmaResumo = {
  turma_id: number;
  nome?: string | null;
  nome_turma?: string | null;
  status?: string | null;
};

export default function NovaMatriculaWizardPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // estado principal
  const [tipoMatricula, setTipoMatricula] = useState<TipoMatricula>("REGULAR");
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaResumo | null>(null);
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [responsavelMesmoAluno, setResponsavelMesmoAluno] = useState<boolean>(true);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<TurmaResumo[]>([]);
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [dataMatricula, setDataMatricula] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [cuidadosEspeciais, setCuidadosEspeciais] = useState<string>("");

  // busca aluno
  const [buscaAluno, setBuscaAluno] = useState<string>("");
  const [alunosResultados, setAlunosResultados] = useState<PessoaResumo[]>([]);
  const [alunosLoading, setAlunosLoading] = useState(false);
  const [alunosErro, setAlunosErro] = useState<string | null>(null);

  // busca turmas
  const [buscaTurma, setBuscaTurma] = useState<string>("");
  const [turmasResultados, setTurmasResultados] = useState<TurmaResumo[]>([]);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [turmasErro, setTurmasErro] = useState<string | null>(null);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [resultado, setResultado] = useState<ApiResponse | null>(null);
  const [erroGenerico, setErroGenerico] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // helpers de UI
  const inputBase =
    "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelBase = "block text-xs font-semibold text-slate-600 mb-1.5";

  // --------------------------------------------------------------------
  // Navegacao entre steps
  // --------------------------------------------------------------------

  function canGoNextFromStep(s: 1 | 2 | 3 | 4 | 5): boolean {
    if (s === 1) return true;
    if (s === 2) return Boolean(pessoaSelecionada);
    if (s === 3) return turmasSelecionadas.length > 0;
    if (s === 4) {
      if (tipoMatricula === "REGULAR" && !anoReferencia) return false;
      return true;
    }
    return true;
  }

  function goToStep(newStep: 1 | 2 | 3 | 4 | 5) {
    setStepError(null);
    setStep(newStep);
  }

  function handleNext() {
    setStepError(null);
    if (!canGoNextFromStep(step)) {
      setStepError(
        "Preencha os campos obrigatorios desta etapa antes de continuar."
      );
      return;
    }
    if (step < 5) {
      setStep((s) => ((s + 1) as 1 | 2 | 3 | 4 | 5));
    }
  }

  function handleBack() {
    setStepError(null);
    if (step > 1) {
      setStep((s) => ((s - 1) as 1 | 2 | 3 | 4 | 5));
    }
  }

  // --------------------------------------------------------------------
  // Step 1 - Tipo: clicar ja vai para o step 2
  // --------------------------------------------------------------------

  function handleSelectTipo(tipo: TipoMatricula) {
    setTipoMatricula(tipo);
    setStepError(null);
    goToStep(2);
  }

  // --------------------------------------------------------------------
  // Step 2 - Busca de aluno
  // --------------------------------------------------------------------

  useEffect(() => {
    const term = buscaAluno.trim();
    if (term.length < 2) {
      setAlunosResultados([]);
      setAlunosErro(null);
      return;
    }

    const controller = new AbortController();

    async function run() {
      setAlunosLoading(true);
      setAlunosErro(null);
      try {
          const resp = await fetch(
            `/api/pessoas/busca?q=${encodeURIComponent(term)}&limit=20`,
            {
              signal: controller.signal,
              credentials: "include",
            }
          );
          if (!resp.ok) {
            setAlunosResultados([]);
            setAlunosErro("Erro ao buscar alunos.");
            return;
          }
          const data = (await resp.json()) as {
            ok: boolean;
            pessoas?: PessoaResumo[];
            items?: PessoaResumo[];
          };
          const pessoas = data?.pessoas ?? data?.items ?? [];
          setAlunosResultados(pessoas);
      } catch (e) {
        if (controller.signal.aborted) return;
        setAlunosResultados([]);
        setAlunosErro("Erro ao buscar alunos.");
      } finally {
        setAlunosLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [buscaAluno]);

  function handleEscolherAluno(p: PessoaResumo) {
    setPessoaSelecionada(p);
    setBuscaAluno("");
    setAlunosResultados([]);
    setAlunosErro(null);
    setStepError(null);
    goToStep(3);
  }

  // --------------------------------------------------------------------
  // Step 3 - Busca e selecao multipla de turmas
  // --------------------------------------------------------------------

  useEffect(() => {
    const term = buscaTurma.trim();
    if (term.length < 2) {
      setTurmasResultados([]);
      setTurmasErro(null);
      return;
    }

    const controller = new AbortController();

    async function run() {
      setTurmasLoading(true);
      setTurmasErro(null);
      try {
        const resp = await fetch(
          `/api/turmas/busca?query=${encodeURIComponent(term)}`,
          {
            signal: controller.signal,
            credentials: "include",
          }
        );
        if (!resp.ok) {
          setTurmasResultados([]);
          setTurmasErro("Erro ao buscar turmas.");
          return;
        }
        const data = (await resp.json()) as { ok: boolean; turmas: TurmaResumo[] };
        setTurmasResultados(data.turmas ?? []);
      } catch (e) {
        if (controller.signal.aborted) return;
        setTurmasResultados([]);
        setTurmasErro("Erro ao buscar turmas.");
      } finally {
        setTurmasLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [buscaTurma]);

  function toggleTurmaSelecionada(t: TurmaResumo) {
    setTurmasSelecionadas((prev) => {
      const exists = prev.some((x) => x.turma_id === t.turma_id);
      if (exists) {
        return prev.filter((x) => x.turma_id !== t.turma_id);
      }
      return [...prev, t];
    });
    setStepError(null);
  }

  // --------------------------------------------------------------------
  // Step 5 - Envio final (uma matricula por turma)
  // --------------------------------------------------------------------

  async function handleSubmitFinal() {
    if (!pessoaSelecionada) {
      setStep(2);
      setStepError("Selecione um aluno antes de concluir.");
      return;
    }
    if (turmasSelecionadas.length === 0) {
      setStep(3);
      setStepError("Selecione pelo menos uma turma antes de concluir.");
      return;
    }
    if (tipoMatricula === "REGULAR" && !anoReferencia) {
      setStep(4);
      setStepError("Para matriculas REGULAR, o ano de referencia e obrigatorio.");
      return;
    }

    setLoadingSubmit(true);
    setErroGenerico(null);
    setResultado(null);
    setStepError(null);

    const pessoaIdNum = pessoaSelecionada.id;

    let responsavelIdNum: number;
    if (responsavelMesmoAluno) {
      responsavelIdNum = pessoaIdNum;
    } else {
      const trimmed = responsavelId.trim();
      if (!trimmed) {
        setLoadingSubmit(false);
        setStep(4);
        setStepError(
          "Informe um ID valido para o responsavel financeiro ou marque a opcao 'responsavel e o proprio aluno'."
        );
        return;
      }
      responsavelIdNum = Number(trimmed);
      if (!Number.isInteger(responsavelIdNum) || responsavelIdNum <= 0) {
        setLoadingSubmit(false);
        setStep(4);
        setStepError("ID do responsavel financeiro invalido.");
        return;
      }
    }

    let anoRefNum: number | undefined;
    if (anoReferencia) {
      anoRefNum = Number(anoReferencia);
      if (!Number.isInteger(anoRefNum)) {
        setLoadingSubmit(false);
        setStep(4);
        setStepError("Ano de referencia deve ser numero inteiro.");
        return;
      }
    }

    try {
      const resultados: any[] = [];
      let algumaFalha = false;

      // monta observacoes finais
      let obs = observacoes.trim();
      const cuidados = cuidadosEspeciais.trim();
      if (cuidados) {
        const blocoCuidados = "\n\n---\nCuidados especiais do aluno:\n" + cuidados;
        obs = obs ? obs + blocoCuidados : blocoCuidados.trimStart();
      }

      for (const turma of turmasSelecionadas) {
        const payload: any = {
          pessoa_id: pessoaIdNum,
          responsavel_financeiro_id: responsavelIdNum,
          tipo_matricula: tipoMatricula,
          vinculo_id: turma.turma_id,
        };

        if (anoRefNum !== undefined) payload.ano_referencia = anoRefNum;
        if (dataMatricula) payload.data_matricula = dataMatricula;
        if (obs) payload.observacoes = obs;

        const resp = await fetch("/api/matriculas/novo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let json: ApiResponse;
        try {
          json = (await resp.json()) as ApiResponse;
        } catch {
          json = { ok: false, error: "resposta_nao_json" };
        }

        resultados.push({
          turma_id: turma.turma_id,
          status_http: resp.status,
          ...json,
        });

        if (!resp.ok || json.ok === false) {
          algumaFalha = true;
        }
      }

      setResultado({
        ok: !algumaFalha,
        resultados,
      });

      if (algumaFalha) {
        setErroGenerico(
          "Uma ou mais matriculas nao foram criadas corretamente. Veja os detalhes abaixo."
        );
      }
    } catch (err: any) {
      console.error("Erro ao criar matriculas:", err);
      setErroGenerico(err?.message ?? "Erro desconhecido ao criar matriculas.");
    } finally {
      setLoadingSubmit(false);
    }
  }

  const stepsLabels = [
    { id: 1, label: "Tipo" },
    { id: 2, label: "Aluno" },
    { id: 3, label: "Turmas" },
    { id: 4, label: "Dados financeiros" },
    { id: 5, label: "Cuidados e confirmacao" },
  ] as const;

  const isHttpError =
    resultado && (resultado as any).resultados
      ? (resultado as any).resultados.some(
          (r: any) => typeof r.status_http === "number" && r.status_http >= 400
        )
      : false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      <header className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          Nova matricula
        </h1>
        <p className="mt-1 text-sm md:text-base text-slate-500">
          Processo guiado de matricula do aluno, em etapas, ate a confirmacao final.
        </p>
      </header>

      {/* stepper */}
      <div className="mb-6 md:mb-8">
        <ol className="flex items-center justify-between gap-2">
          {stepsLabels.map((s, idx) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <li key={s.id} className="flex-1 flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                      isActive
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-slate-500",
                    ].join(" ")}
                  >
                    {s.id}
                  </div>
                  <span
                    className={[
                      "text-xs md:text-sm",
                      isActive
                        ? "font-semibold text-slate-900"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < stepsLabels.length - 1 && (
                  <div className="hidden md:block flex-1 h-px ml-2 bg-slate-200" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* card principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="px-4 md:px-6 py-4 md:py-5 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Etapa 1 - Tipo de matricula
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                Escolha o tipo de vinculo que esta matricula ira registrar.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <TipoCard
                  label="Regular"
                  description="Curso anual, com mensalidade recorrente."
                  selected={tipoMatricula === "REGULAR"}
                  onClick={() => handleSelectTipo("REGULAR")}
                />
                <TipoCard
                  label="Curso livre"
                  description="Aulas avulsas, oficinas, cursos de ferias."
                  selected={tipoMatricula === "CURSO_LIVRE"}
                  onClick={() => handleSelectTipo("CURSO_LIVRE")}
                />
                <TipoCard
                  label="Projeto artistico"
                  description="Projetos, espetaculos, montagens especiais."
                  selected={tipoMatricula === "PROJETO_ARTISTICO"}
                  onClick={() => handleSelectTipo("PROJETO_ARTISTICO")}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Etapa 2 - Aluno
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                Busque pelo nome ou email do aluno e clique para selecionar.
              </p>

              <div className="mb-3">
                <label className={labelBase}>Buscar aluno</label>
                <input
                  className={inputBase}
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Digite parte do nome ou email..."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Digite pelo menos 2 caracteres para buscar.
                </p>
              </div>

              {alunosLoading && (
                <p className="text-[11px] text-slate-500">Carregando alunos...</p>
              )}
              {alunosErro && (
                <p className="text-[11px] text-rose-600">{alunosErro}</p>
              )}

              <div className="space-y-1">
                {alunosResultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleEscolherAluno(p)}
                    className="w-full text-left rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {p.nome_completo ?? p.nome ?? "Sem nome"}{" "}
                      <span className="text-[10px] text-slate-500">
                        (ID {p.id})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {p.email || "sem email"}{" "}
                      {p.telefone_principal
                        ? " - tel.: " + p.telefone_principal
                        : ""}
                    </p>
                  </button>
                ))}
                {!alunosLoading &&
                  !alunosErro &&
                  buscaAluno &&
                  alunosResultados.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      Nenhum aluno encontrado para esta busca.
                    </p>
                  )}
              </div>

              {pessoaSelecionada && (
                <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-semibold text-emerald-800">
                    Aluno selecionado:
                  </p>
                  <p className="text-xs text-emerald-900">
                    {pessoaSelecionada.nome_completo ??
                      pessoaSelecionada.nome ??
                      "Sem nome"}{" "}
                    (ID {pessoaSelecionada.id})
                  </p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Etapa 3 - Turmas
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                Busque pelas turmas disponiveis e marque uma ou mais para incluir
                nesta matricula.
              </p>

              <div className="mb-3">
                <label className={labelBase}>Buscar turmas</label>
                <input
                  className={inputBase}
                  value={buscaTurma}
                  onChange={(e) => setBuscaTurma(e.target.value)}
                  placeholder="Digite parte do nome da turma..."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Digite pelo menos 2 caracteres para buscar.
                </p>
              </div>

              {turmasLoading && (
                <p className="text-[11px] text-slate-500">Carregando turmas...</p>
              )}
              {turmasErro && (
                <p className="text-[11px] text-rose-600">{turmasErro}</p>
              )}

              <div className="space-y-1">
                {turmasResultados.map((t) => {
                  const selected = turmasSelecionadas.some(
                    (x) => x.turma_id === t.turma_id
                  );
                  const titulo =
                    t.nome ?? t.nome_turma ?? "Turma " + t.turma_id;
                  return (
                    <button
                      key={t.turma_id}
                      type="button"
                      onClick={() => toggleTurmaSelecionada(t)}
                      className={[
                        "w-full text-left rounded-lg border px-3 py-2 transition-colors",
                        selected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <p className="text-xs font-semibold text-slate-900">
                        {titulo}{" "}
                        <span className="text-[10px] text-slate-500">
                          (ID {t.turma_id})
                        </span>
                      </p>
                      {t.status && (
                        <p className="text-[11px] text-slate-500">
                          Status: {t.status}
                        </p>
                      )}
                    </button>
                  );
                })}
                {!turmasLoading &&
                  !turmasErro &&
                  buscaTurma &&
                  turmasResultados.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      Nenhuma turma encontrada para esta busca.
                    </p>
                  )}
              </div>

              {turmasSelecionadas.length > 0 && (
                <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                  <p className="font-semibold mb-1">
                    Turmas selecionadas ({turmasSelecionadas.length}):
                  </p>
                  <ul className="list-disc pl-4">
                    {turmasSelecionadas.map((t) => (
                      <li key={t.turma_id}>
                        {t.nome ?? t.nome_turma ?? "Turma " + t.turma_id} (ID{" "}
                        {t.turma_id})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Etapa 4 - Dados financeiros da matricula
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                Defina o responsavel financeiro, ano de referencia e data da
                matricula. Em versoes futuras entram aqui plano, valores e formas
                de pagamento.
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelBase}>Responsavel financeiro</label>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      id="check-resp-mesmo-aluno"
                      type="checkbox"
                      checked={responsavelMesmoAluno}
                      onChange={(e) =>
                        setResponsavelMesmoAluno(e.target.checked)
                      }
                    />
                    <label
                      htmlFor="check-resp-mesmo-aluno"
                      className="text-xs text-slate-700"
                    >
                      Responsavel e o proprio aluno
                    </label>
                  </div>
                  {!responsavelMesmoAluno && (
                    <input
                      className={inputBase}
                      value={responsavelId}
                      onChange={(e) => setResponsavelId(e.target.value)}
                      placeholder="ID da pessoa responsavel (pessoas.id)"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>Ano de referencia</label>
                    <input
                      className={inputBase}
                      value={anoReferencia}
                      onChange={(e) => setAnoReferencia(e.target.value)}
                      placeholder="Ex.: 2025"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Obrigatorio para matriculas REGULAR. Para outros tipos pode
                      ficar vazio.
                    </p>
                  </div>

                  <div>
                    <label className={labelBase}>Data da matricula</label>
                    <input
                      type="date"
                      className={inputBase}
                      value={dataMatricula}
                      onChange={(e) => setDataMatricula(e.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Se vazio, a API usa a data atual do servidor.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Etapa 5 - Cuidados do aluno e confirmacao
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                Registre observacoes e cuidados importantes, revise o resumo e
                conclua a matricula.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4">
                <div>
                  <label className={labelBase}>
                    Observacoes internas (opcional)
                  </label>
                  <textarea
                    className={inputBase + " min-h-[90px] resize-y"}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Anotacoes internas sobre esta matricula..."
                  />
                </div>
                <div>
                  <label className={labelBase}>
                    Cuidados especiais / alergias (opcional)
                  </label>
                  <textarea
                    className={inputBase + " min-h-[120px] resize-y"}
                    value={cuidadosEspeciais}
                    onChange={(e) => setCuidadosEspeciais(e.target.value)}
                    placeholder={
                      "Exemplos:\n- Alergias alimentares\n- Alergias a medicamentos\n- Restricoes medicas\n- Pessoas autorizadas para buscar o aluno\n- Outros cuidados importantes..."
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-700">
                <p className="font-semibold mb-1">Resumo desta matricula:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <span className="font-semibold">Tipo:</span>{" "}
                    {tipoMatricula}
                  </li>
                  <li>
                    <span className="font-semibold">Aluno:</span>{" "}
                    {pessoaSelecionada
                      ? (pessoaSelecionada.nome_completo ??
                          pessoaSelecionada.nome ??
                          "Sem nome") +
                        " (ID " +
                        pessoaSelecionada.id +
                        ")"
                      : "-"}
                  </li>
                  <li>
                    <span className="font-semibold">Turmas:</span>{" "}
                    {turmasSelecionadas.length === 0
                      ? "-"
                      : turmasSelecionadas
                          .map(
                            (t) =>
                              (t.nome ??
                                t.nome_turma ??
                                "Turma " + t.turma_id) +
                              " (ID " +
                              t.turma_id +
                              ")"
                          )
                          .join("; ")}
                  </li>
                  <li>
                    <span className="font-semibold">Responsavel financeiro:</span>{" "}
                    {responsavelMesmoAluno
                      ? "aluno"
                      : responsavelId || "nao definido"}
                  </li>
                  <li>
                    <span className="font-semibold">Ano referencia:</span>{" "}
                    {anoReferencia || "-"}
                  </li>
                  <li>
                    <span className="font-semibold">Data matricula:</span>{" "}
                    {dataMatricula || "(sera data atual)"}
                  </li>
                </ul>
              </div>
            </>
          )}

          {stepError && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {stepError}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {step < 5 && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Proxima etapa
              </button>
            )}
            {step === 5 && (
              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={loadingSubmit}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingSubmit ? "Salvando matriculas..." : "Concluir matricula"}
              </button>
            )}
          </div>
        </div>
      </div>

      {erroGenerico && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <strong className="font-semibold">Erro: </strong>
          <span>{erroGenerico}</span>
        </div>
      )}

      {resultado && (
        <div className="mt-6">
          <div className="bg-slate-950 text-slate-50 rounded-2xl border border-slate-800">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wide uppercase text-slate-300">
                  Resultado das matriculas
                </h2>
              </div>
            </div>
            <div className="px-4 md:px-5 py-3 md:py-4">
              <pre className="whitespace-pre-wrap text-[11px] md:text-xs leading-relaxed overflow-x-auto">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TipoCard(props: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { label, description, selected, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl border px-3 py-3 md:px-4 md:py-4 transition-colors",
        selected
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold mb-1",
          selected ? "text-indigo-700" : "text-slate-800",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="text-[11px] text-slate-500">{description}</p>
    </button>
  );
}
