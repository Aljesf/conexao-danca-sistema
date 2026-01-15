"use client";

import { useState } from "react";

type FormTipo = "RESPONSAVEL_LEGAL" | "ALUNO_MENOR" | "ALUNO_MAIOR";
type ConcessaoStatus = "ATIVA" | "SUSPENSA" | "ENCERRADA";
type AcaoTipo = "CAMPANHA" | "DOACAO" | "INTERCAMBIO" | "ACOLHIMENTO" | "EVENTO" | "OUTRA";

type PessoaSugestao = {
  id: string;
  label: string;
};

type UpsertBeneficiarioResponse = {
  ok: boolean;
  error?: string;
  beneficiario?: { id: string };
  concessao?: { id: string } | null;
  instancias?: Array<{ tipo: FormTipo; id: string }>;
};

type CreateAcaoResponse = {
  ok: boolean;
  error?: string;
  acao?: { id: string };
};

type AddParticipanteResponse = {
  ok: boolean;
  error?: string;
  participante?: { id: string };
};

function toISODateOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T;
  return data;
}

export function MovimentoAcoesRapidasModal(props: {
  open: boolean;
  onClose: () => void;
  searchPessoas: (term: string) => Promise<PessoaSugestao[]>;
}) {
  const [aba, setAba] = useState<"BOLSA" | "ACAO">("BOLSA");

  const [pessoaTerm, setPessoaTerm] = useState("");
  const [pessoaSug, setPessoaSug] = useState<PessoaSugestao[]>([]);
  const [pessoaId, setPessoaId] = useState<string>("");

  const [respTerm, setRespTerm] = useState("");
  const [respSug, setRespSug] = useState<PessoaSugestao[]>([]);
  const [responsavelId, setResponsavelId] = useState<string>("");

  const [ehMenor, setEhMenor] = useState<boolean>(false);

  const [acionarA, setAcionarA] = useState<boolean>(false);
  const [acionarB, setAcionarB] = useState<boolean>(false);
  const [acionarC, setAcionarC] = useState<boolean>(false);

  const [concessaoStatus, setConcessaoStatus] = useState<ConcessaoStatus>("ATIVA");

  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [revisaoPrevista, setRevisaoPrevista] = useState<string>("");
  const [diaVencCiclo, setDiaVencCiclo] = useState<number>(1);

  const [justificativa, setJustificativa] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [acaoTipo, setAcaoTipo] = useState<AcaoTipo>("OUTRA");
  const [acaoTitulo, setAcaoTitulo] = useState<string>("");
  const [acaoDesc, setAcaoDesc] = useState<string>("");
  const [acaoInicio, setAcaoInicio] = useState<string>("");
  const [acaoFim, setAcaoFim] = useState<string>("");

  const [acaoPessoaTerm, setAcaoPessoaTerm] = useState("");
  const [acaoPessoaSug, setAcaoPessoaSug] = useState<PessoaSugestao[]>([]);
  const [acaoPessoaId, setAcaoPessoaId] = useState<string>("");
  const [acaoPapel, setAcaoPapel] = useState<string>("BENEFICIARIO");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function doSearchPessoas(term: string, setter: (value: PessoaSugestao[]) => void) {
    const trimmed = term.trim();
    if (trimmed.length < 3) {
      setter([]);
      return;
    }
    const list = await props.searchPessoas(trimmed);
    setter(list);
  }

  function resetMessages() {
    setMsg(null);
  }

  async function onSalvarBolsa() {
    resetMessages();

    if (!pessoaId) {
      setMsg({ kind: "err", text: "Selecione a pessoa beneficiaria." });
      return;
    }

    if (ehMenor && !responsavelId) {
      setMsg({ kind: "err", text: "Beneficiario menor: selecione o responsavel legal." });
      return;
    }

    if (acionarA && !responsavelId) {
      setMsg({ kind: "err", text: "Para acionar o formulario A, selecione o responsavel legal." });
      return;
    }

    setBusy(true);
    try {
      const diaVenc = Number.isFinite(diaVencCiclo)
        ? Math.min(28, Math.max(1, Math.trunc(diaVencCiclo)))
        : 1;

      const payload = {
        pessoa_id: pessoaId,
        responsavel_id: responsavelId || null,
        eh_menor: ehMenor,
        acionar_form_responsavel: acionarA,
        acionar_form_aluno_menor: acionarB,
        acionar_form_aluno_maior: acionarC,
        observacoes: observacoes || null,
        concessao: {
          status: concessaoStatus,
          data_inicio: toISODateOrNull(dataInicio) ?? undefined,
          data_fim: toISODateOrNull(dataFim),
          revisao_prevista_em: toISODateOrNull(revisaoPrevista),
          dia_vencimento_ciclo: diaVenc,
          justificativa: justificativa || null,
        },
      };

      const resp = await postJSON<UpsertBeneficiarioResponse>("/api/movimento/beneficiarios/upsert", payload);

      if (!resp.ok) {
        setMsg({ kind: "err", text: resp.error || "Falha ao salvar beneficiario." });
        return;
      }

      const inst = resp.instancias?.map((x) => x.tipo).join(", ") || "nenhuma";
      setMsg({ kind: "ok", text: `Salvo. Beneficiario: ${resp.beneficiario?.id}. Instancias: ${inst}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setMsg({ kind: "err", text: message });
    } finally {
      setBusy(false);
    }
  }

  async function onSalvarAcao() {
    resetMessages();

    if (!acaoTitulo.trim()) {
      setMsg({ kind: "err", text: "Informe o titulo da acao social." });
      return;
    }

    setBusy(true);
    try {
      const resp = await postJSON<CreateAcaoResponse>("/api/movimento/acoes", {
        tipo: acaoTipo,
        titulo: acaoTitulo.trim(),
        descricao: acaoDesc.trim() || null,
        data_inicio: toISODateOrNull(acaoInicio),
        data_fim: toISODateOrNull(acaoFim),
        metricas_json: {},
      });

      if (!resp.ok || !resp.acao?.id) {
        setMsg({ kind: "err", text: resp.error || "Falha ao criar acao." });
        return;
      }

      const acaoId = resp.acao.id;
      if (acaoPessoaId) {
        const r2 = await postJSON<AddParticipanteResponse>(`/api/movimento/acoes/${acaoId}/participantes`, {
          pessoa_id: acaoPessoaId,
          papel: acaoPapel || null,
          observacoes: null,
        });

        if (!r2.ok) {
          setMsg({ kind: "err", text: r2.error || "Acao criada, mas falhou ao adicionar participante." });
          return;
        }

        setMsg({ kind: "ok", text: `Acao criada (${acaoId}) e participante adicionado.` });
        return;
      }

      setMsg({ kind: "ok", text: `Acao criada (${acaoId}).` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setMsg({ kind: "err", text: message });
    } finally {
      setBusy(false);
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-violet-500">MOVIMENTO CONEXAO DANCA</div>
            <div className="mt-1 text-2xl font-semibold">Acoes rapidas</div>
            <div className="mt-1 text-sm text-gray-500">Operacoes institucionais do Movimento.</div>
          </div>
          <button
            className="rounded-full bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
            onClick={props.onClose}
            disabled={busy}
          >
            Fechar
          </button>
        </div>

        <div className="px-6">
          <div className="flex gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm ${aba === "BOLSA" ? "bg-violet-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              onClick={() => setAba("BOLSA")}
              disabled={busy}
            >
              Concessao de oportunidade
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm ${aba === "ACAO" ? "bg-pink-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              onClick={() => setAba("ACAO")}
              disabled={busy}
            >
              Acao social
            </button>
          </div>
        </div>

        <div className="p-6">
          {msg && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {msg.text}
            </div>
          )}

          {aba === "BOLSA" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Beneficiario</div>

                <label className="mt-3 block text-xs text-gray-500">Pessoa</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Digite nome, CPF ou email (min 3)"
                  value={pessoaTerm}
                  onChange={(e) => {
                    setPessoaTerm(e.target.value);
                    void doSearchPessoas(e.target.value, setPessoaSug);
                  }}
                  disabled={busy}
                />
                {pessoaSug.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-auto rounded-xl border">
                    {pessoaSug.map((p) => (
                      <button
                        key={p.id}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setPessoaId(p.id);
                          setPessoaTerm(p.label);
                          setPessoaSug([]);
                        }}
                        disabled={busy}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ehMenor}
                    onChange={(e) => setEhMenor(e.target.checked)}
                    disabled={busy}
                  />
                  <span className="text-sm">Beneficiario e menor de idade</span>
                </div>

                <label className="mt-3 block text-xs text-gray-500">Responsavel legal (quando aplicavel)</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Digite nome, CPF ou email (min 3)"
                  value={respTerm}
                  onChange={(e) => {
                    setRespTerm(e.target.value);
                    void doSearchPessoas(e.target.value, setRespSug);
                  }}
                  disabled={busy}
                />
                {respSug.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-auto rounded-xl border">
                    {respSug.map((p) => (
                      <button
                        key={p.id}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setResponsavelId(p.id);
                          setRespTerm(p.label);
                          setRespSug([]);
                        }}
                        disabled={busy}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                <label className="mt-3 block text-xs text-gray-500">Observacoes</label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={busy}
                />

                <div className="mt-4 rounded-xl bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-600">Formularios (A/B/C)</div>
                  <div className="mt-2 space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={acionarA}
                        onChange={(e) => setAcionarA(e.target.checked)}
                        disabled={busy}
                      />
                      <span>Formulario A (Responsavel legal)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={acionarB}
                        onChange={(e) => setAcionarB(e.target.checked)}
                        disabled={busy}
                      />
                      <span>Formulario B (Aluno menor)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={acionarC}
                        onChange={(e) => setAcionarC(e.target.checked)}
                        disabled={busy}
                      />
                      <span>Formulario C (Aluno 18+)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Concessao de oportunidade (Movimento)</div>

                <label className="mt-3 block text-xs text-gray-500">Status</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={concessaoStatus}
                  onChange={(e) => setConcessaoStatus(e.target.value as ConcessaoStatus)}
                  disabled={busy}
                >
                  <option value="ATIVA">ATIVA</option>
                  <option value="SUSPENSA">SUSPENSA</option>
                  <option value="ENCERRADA">ENCERRADA</option>
                </select>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500">Data de entrada no Movimento</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Dia de vencimento do ciclo (padrao 1)</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="number"
                      min={1}
                      max={28}
                      value={diaVencCiclo}
                      onChange={(e) => setDiaVencCiclo(Number(e.target.value))}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Fim</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Revisao prevista</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="date"
                      value={revisaoPrevista}
                      onChange={(e) => setRevisaoPrevista(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <label className="mt-3 block text-xs text-gray-500">Justificativa</label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={4}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  disabled={busy}
                />

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                    onClick={props.onClose}
                    disabled={busy}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
                    onClick={() => void onSalvarBolsa()}
                    disabled={busy}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Acao social</div>

                <label className="mt-3 block text-xs text-gray-500">Tipo</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={acaoTipo}
                  onChange={(e) => setAcaoTipo(e.target.value as AcaoTipo)}
                  disabled={busy}
                >
                  <option value="CAMPANHA">CAMPANHA</option>
                  <option value="DOACAO">DOACAO</option>
                  <option value="INTERCAMBIO">INTERCAMBIO</option>
                  <option value="ACOLHIMENTO">ACOLHIMENTO</option>
                  <option value="EVENTO">EVENTO</option>
                  <option value="OUTRA">OUTRA</option>
                </select>

                <label className="mt-3 block text-xs text-gray-500">Titulo</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={acaoTitulo}
                  onChange={(e) => setAcaoTitulo(e.target.value)}
                  disabled={busy}
                />

                <label className="mt-3 block text-xs text-gray-500">Descricao</label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  rows={4}
                  value={acaoDesc}
                  onChange={(e) => setAcaoDesc(e.target.value)}
                  disabled={busy}
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500">Inicio</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="date"
                      value={acaoInicio}
                      onChange={(e) => setAcaoInicio(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Fim</label>
                    <input
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      type="date"
                      value={acaoFim}
                      onChange={(e) => setAcaoFim(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                    onClick={props.onClose}
                    disabled={busy}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-xl bg-pink-600 px-4 py-2 text-sm text-white hover:bg-pink-700 disabled:opacity-50"
                    onClick={() => void onSalvarAcao()}
                    disabled={busy}
                  >
                    Criar acao
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Participante (opcional)</div>
                <div className="text-xs text-gray-500">
                  Selecione uma pessoa para vincular como participante ao criar a acao.
                </div>

                <label className="mt-3 block text-xs text-gray-500">Pessoa</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Digite nome, CPF ou email (min 3)"
                  value={acaoPessoaTerm}
                  onChange={(e) => {
                    setAcaoPessoaTerm(e.target.value);
                    void doSearchPessoas(e.target.value, setAcaoPessoaSug);
                  }}
                  disabled={busy}
                />
                {acaoPessoaSug.length > 0 && (
                  <div className="mt-2 max-h-44 overflow-auto rounded-xl border">
                    {acaoPessoaSug.map((p) => (
                      <button
                        key={p.id}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setAcaoPessoaId(p.id);
                          setAcaoPessoaTerm(p.label);
                          setAcaoPessoaSug([]);
                        }}
                        disabled={busy}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                <label className="mt-3 block text-xs text-gray-500">Papel</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={acaoPapel}
                  onChange={(e) => setAcaoPapel(e.target.value)}
                  disabled={busy}
                />

                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  Dica: use papeis como BENEFICIARIO, VOLUNTARIO, DOADOR, EQUIPE.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <div className="text-[11px] text-gray-400">
            Observacao: este modal executa as rotas do Movimento. Links e navegacao serao ajustados depois.
          </div>
        </div>
      </div>
    </div>
  );
}
