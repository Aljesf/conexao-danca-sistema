"use client";

import { useState } from "react";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  [key: string]: any;
};

export default function NovaMatriculaPage() {
  const [pessoaId, setPessoaId] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [tipoMatricula, setTipoMatricula] = useState<TipoMatricula>("REGULAR");
  const [vinculoId, setVinculoId] = useState<string>("");
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [dataMatricula, setDataMatricula] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ApiResponse | null>(null);
  const [erroGenerico, setErroGenerico] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErroGenerico(null);
    setResultado(null);

    try {
      const payload: any = {
        pessoa_id: Number(pessoaId),
        responsavel_financeiro_id: Number(responsavelId || pessoaId),
        tipo_matricula: tipoMatricula,
        vinculo_id: Number(vinculoId),
      };

      if (anoReferencia) {
        payload.ano_referencia = Number(anoReferencia);
      }

      if (dataMatricula) {
        payload.data_matricula = dataMatricula;
      }

      if (observacoes.trim().length > 0) {
        payload.observacoes = observacoes.trim();
      }

      const resp = await fetch("/api/matriculas/novo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let json: ApiResponse;
      try {
        json = (await resp.json()) as ApiResponse;
      } catch (e) {
        json = {
          ok: false,
          error: "resposta_nao_json",
        };
      }

      setResultado({
        status_http: resp.status,
        ...json,
      });
    } catch (err: any) {
      console.error("Erro ao chamar /api/matriculas/novo", err);
      setErroGenerico(err?.message ?? "Erro desconhecido ao chamar a API.");
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  const labelBase = "block text-xs font-semibold text-slate-600 mb-1.5";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* Cabeçalho da página */}
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          Nova Matrícula
        </h1>
        <p className="mt-1 text-sm md:text-base text-slate-500">
          Cadastro de matrícula vinculando uma pessoa a uma turma, usando a API{" "}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded-md">
            /api/matriculas/novo
          </code>
          .
        </p>
      </header>

      {/* Card principal do formulário */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 px-4 md:px-6 py-4 md:py-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Dados da matrícula
          </h2>
          <p className="mt-1 text-xs md:text-sm text-slate-500">
            Utilize IDs de pessoas e turmas já cadastradas. Esta tela é o
            primeiro passo para validar o fluxo de matrícula no sistema.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-4 md:px-6 pb-5 md:pb-6 pt-4 md:pt-5 space-y-6"
        >
          {/* Linha 1: pessoa e responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className={labelBase}>ID da Pessoa (Aluno) *</label>
              <input
                type="number"
                className={inputBase}
                value={pessoaId}
                onChange={(e) => setPessoaId(e.target.value)}
                required
                placeholder="Ex.: 1"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Deve ser um <code className="font-mono">pessoas.id</code>{" "}
                existente.
              </p>
            </div>

            <div>
              <label className={labelBase}>
                ID do Responsável Financeiro{" "}
                <span className="font-normal text-[11px] text-slate-500">
                  (opcional)
                </span>
              </label>
              <input
                type="number"
                className={inputBase}
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                placeholder="Se vazio, usa o mesmo ID do aluno"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Também deve ser um <code className="font-mono">pessoas.id</code>
                . Se deixar em branco, será usado o mesmo ID do aluno.
              </p>
            </div>
          </div>

          {/* Linha 2: tipo + turma */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className={labelBase}>Tipo de Matrícula *</label>
              <select
                className={inputBase}
                value={tipoMatricula}
                onChange={(e) =>
                  setTipoMatricula(e.target.value as TipoMatricula)
                }
              >
                <option value="REGULAR">REGULAR</option>
                <option value="CURSO_LIVRE">CURSO_LIVRE</option>
                <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
              </select>
            </div>

            <div>
              <label className={labelBase}>ID da Turma (vínculo_id) *</label>
              <input
                type="number"
                className={inputBase}
                value={vinculoId}
                onChange={(e) => setVinculoId(e.target.value)}
                required
                placeholder="Ex.: 10"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Deve ser um{" "}
                <code className="font-mono">turmas.turma_id</code> existente.
              </p>
            </div>
          </div>

          {/* Linha 3: ano e data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className={labelBase}>Ano de Referência</label>
              <input
                type="number"
                className={inputBase}
                value={anoReferencia}
                onChange={(e) => setAnoReferencia(e.target.value)}
                placeholder="Ex.: 2025"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Obrigatório para matrículas{" "}
                <span className="font-mono">REGULAR</span>.
              </p>
            </div>

            <div>
              <label className={labelBase}>Data da Matrícula</label>
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

          {/* Observações */}
          <div>
            <label className={labelBase}>
              Observações internas{" "}
              <span className="font-normal text-[11px] text-slate-500">
                (opcional)
              </span>
            </label>
            <textarea
              className={`${inputBase} min-h-[90px] resize-y`}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações internas sobre essa matrícula…"
            />
          </div>

          {/* Botão + dica */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 md:px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Salvando matrícula..." : "Criar matrícula"}
            </button>

            <p className="text-[11px] text-slate-500">
              Lembre de estar logado no sistema. A API só aceita requisições
              autenticadas.
            </p>
          </div>
        </form>
      </div>

      {/* Alertas de erro genérico */}
      {erroGenerico && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <strong className="font-semibold">Erro ao chamar a API: </strong>
          <span>{erroGenerico}</span>
        </div>
      )}

      {/* Card de resposta da API */}
      {resultado && (
        <div className="mt-6">
          <div className="bg-slate-950 text-slate-50 rounded-2xl border border-slate-800">
            <div className="px-4 md:px-5 py-3 md:py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold tracking-wide uppercase text-slate-300">
                  Resposta da API
                </h2>
                <p className="text-[11px] text-slate-400">
                  Endpoint{" "}
                  <code className="font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                    /api/matriculas/novo
                  </code>{" "}
                  — status HTTP {resultado.status_http}
                </p>
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
