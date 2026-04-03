"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  CoreografiaEstiloResumo,
  CoreografiaFormacaoResumo,
  EventoCoreografiaResumo,
} from "@/components/escola/eventos/types";

type FormacaoTipo = "SOLO" | "DUO" | "TRIO" | "GRUPO" | "TURMA" | "LIVRE";

type NovaCoreografiaPayload = {
  nome: string;
  tipoFormacao: FormacaoTipo;
  estiloId: string;
  modalidade: string | null;
  descricao: string | null;
  duracaoEstimadaSegundos: number | null;
  ativa: boolean;
};

type InscricaoCoreografiaModalProps = {
  open: boolean;
  estilos: CoreografiaEstiloResumo[];
  formacoes: CoreografiaFormacaoResumo[];
  coreografiasDisponiveis: EventoCoreografiaResumo[];
  coreografiasSelecionadasIds: string[];
  onClose: () => void;
  onSelecionarExistente: (vinculo: EventoCoreografiaResumo) => void;
  onCriarNova: (payload: NovaCoreografiaPayload) => Promise<void>;
};

const FORMACAO_PRESETS: Record<
  FormacaoTipo,
  { label: string; descricao: string }
> = {
  SOLO: { label: "Solo", descricao: "Uma participacao individual" },
  DUO: { label: "Duo", descricao: "Participacao em dupla" },
  TRIO: { label: "Trio", descricao: "Participacao em trio" },
  GRUPO: { label: "Grupo", descricao: "Participacao em grupo" },
  TURMA: { label: "Turma", descricao: "Participacao por turma" },
  LIVRE: { label: "Livre", descricao: "Formacao artistica livre" },
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function InscricaoCoreografiaModal({
  open,
  estilos,
  formacoes,
  coreografiasDisponiveis,
  coreografiasSelecionadasIds,
  onClose,
  onSelecionarExistente,
  onCriarNova,
}: InscricaoCoreografiaModalProps) {
  const [modo, setModo] = useState<"existente" | "nova">("existente");
  const [busca, setBusca] = useState("");
  const [filtroFormacao, setFiltroFormacao] = useState<FormacaoTipo | "">("");
  const [novaNome, setNovaNome] = useState("");
  const [novaFormacao, setNovaFormacao] = useState<FormacaoTipo>("SOLO");
  const [novaModalidade, setNovaModalidade] = useState("");
  const [novoEstiloId, setNovoEstiloId] = useState("");
  const [novaDuracao, setNovaDuracao] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const formacoesOrdenadas = useMemo(
    () =>
      formacoes.length > 0
        ? formacoes
        : (Object.entries(FORMACAO_PRESETS).map(([codigo, preset]) => ({
            id: codigo,
            codigo: codigo as FormacaoTipo,
            nome: preset.label,
            quantidade_minima_padrao:
              codigo === "SOLO" ? 1 : codigo === "DUO" ? 2 : codigo === "TRIO" ? 3 : 1,
            quantidade_maxima_padrao:
              codigo === "SOLO" ? 1 : codigo === "DUO" ? 2 : codigo === "TRIO" ? 3 : 20,
            quantidade_fixa: ["SOLO", "DUO", "TRIO"].includes(codigo),
            ativa: true,
            created_at: "",
            updated_at: "",
          })) as CoreografiaFormacaoResumo[]),
    [formacoes],
  );
  const formacaoAtual = useMemo(
    () =>
      formacoesOrdenadas.find((item) => item.codigo === novaFormacao) ?? null,
    [formacoesOrdenadas, novaFormacao],
  );

  const coreografiasFiltradas = useMemo(() => {
    const termo = normalizeText(busca.trim());

    return coreografiasDisponiveis.filter((item) => {
      if (coreografiasSelecionadasIds.includes(item.id)) return false;
      if (filtroFormacao && item.coreografia.tipo_formacao !== filtroFormacao) {
        return false;
      }

      if (!termo) return true;

      const texto = normalizeText(
        [
          item.coreografia.nome,
          item.coreografia.modalidade ?? "",
          item.coreografia.estilo?.nome ?? "",
          item.coreografia.tipo_formacao,
        ].join(" "),
      );

      return texto.includes(termo);
    });
  }, [busca, coreografiasDisponiveis, coreografiasSelecionadasIds, filtroFormacao]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (!novaNome.trim()) {
      setErro("Informe o nome da coreografia.");
      return;
    }

    if (!novoEstiloId) {
      setErro("Selecione o estilo da coreografia.");
      return;
    }

    const nomeNormalizado = normalizeText(novaNome.trim());
    const duplicada = coreografiasDisponiveis.some(
      (item) =>
        normalizeText(item.coreografia.nome) === nomeNormalizado &&
        item.coreografia.tipo_formacao === novaFormacao,
    );

    if (duplicada) {
      setErro(
        "Ja existe uma coreografia com este nome e formacao nesta edicao. Selecione a existente.",
      );
      return;
    }

    setSalvando(true);

    try {
      await onCriarNova({
        nome: novaNome.trim(),
        tipoFormacao: novaFormacao,
        estiloId: novoEstiloId,
        modalidade: novaModalidade.trim() || null,
        descricao: novaDescricao.trim() || null,
        duracaoEstimadaSegundos: novaDuracao.trim()
          ? Number(novaDuracao)
          : null,
        ativa: true,
      });

      setNovaNome("");
      setNovaFormacao("SOLO");
      setNovaModalidade("");
      setNovoEstiloId("");
      setNovaDuracao("");
      setNovaDescricao("");
      setBusca("");
      setFiltroFormacao("");
      setModo("existente");
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a coreografia.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6">
      <div className="w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Participacao artistica
            </h3>
            <p className="text-sm text-zinc-600">
              Selecione uma coreografia existente ou crie uma nova sem sair do
              fluxo da inscricao.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Fechar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-6 pt-5">
          <button
            type="button"
            onClick={() => setModo("existente")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              modo === "existente"
                ? "bg-violet-600 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Selecionar existente
          </button>
          <button
            type="button"
            onClick={() => setModo("nova")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              modo === "nova"
                ? "bg-violet-600 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Criar nova
          </button>
        </div>

        {erro ? (
          <div className="mx-6 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        ) : null}

        {modo === "existente" ? (
          <div className="grid gap-4 px-6 py-5 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, estilo ou modalidade"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <select
                value={filtroFormacao}
                onChange={(event) =>
                  setFiltroFormacao(
                    (event.target.value as FormacaoTipo | "") || "",
                  )
                }
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Todas as formacoes</option>
                {formacoesOrdenadas.map((formacao) => (
                  <option key={formacao.id} value={formacao.codigo}>
                    {formacao.nome}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-600">
                As coreografias ja escolhidas nesta inscricao ficam ocultas para
                evitar duplicidade.
              </div>
            </div>

            <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
              {coreografiasFiltradas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                  Nenhuma coreografia disponivel para o filtro atual.
                </div>
              ) : (
                coreografiasFiltradas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.lotada}
                    onClick={() => {
                      if (item.lotada) return;
                      onSelecionarExistente(item);
                      onClose();
                    }}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-50/60"
                  >
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                        {item.coreografia.formacao?.nome ?? item.coreografia.tipo_formacao}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {item.coreografia.estilo?.nome ?? "Sem estilo"}
                      </span>
                      {item.lotada ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
                          Lotada
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-zinc-900">
                      {item.coreografia.nome}
                    </h4>
                    <p className="mt-1 text-sm text-zinc-600">
                      {item.coreografia.modalidade?.trim()
                        ? item.coreografia.modalidade
                        : "Modalidade nao informada"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Ocupacao atual: {item.ocupacao_atual ?? 0}
                      {typeof item.coreografia.quantidade_maxima_participantes === "number"
                        ? ` / ${item.coreografia.quantidade_maxima_participantes}`
                        : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form className="grid gap-4 px-6 py-5" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={novaNome}
                onChange={(event) => setNovaNome(event.target.value)}
                placeholder="Nome da coreografia"
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 xl:col-span-2"
              />
              <select
                value={novaFormacao}
                onChange={(event) =>
                  setNovaFormacao(event.target.value as FormacaoTipo)
                }
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {formacoesOrdenadas.map((formacao) => (
                  <option key={formacao.id} value={formacao.codigo}>
                    {formacao.nome}
                  </option>
                ))}
              </select>
              <select
                value={novoEstiloId}
                onChange={(event) => setNovoEstiloId(event.target.value)}
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Selecione o estilo</option>
                {estilos.map((estilo) => (
                  <option key={estilo.id} value={estilo.id}>
                    {estilo.nome}
                  </option>
                ))}
              </select>
              <input
                value={novaModalidade}
                onChange={(event) => setNovaModalidade(event.target.value)}
                placeholder="Modalidade artistica"
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <input
                value={novaDuracao}
                onChange={(event) => setNovaDuracao(event.target.value)}
                placeholder="Duracao em segundos"
                type="number"
                min="0"
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 xl:col-span-2">
                {formacaoAtual
                  ? `${formacaoAtual.nome}: ${formacaoAtual.quantidade_fixa ? "quantidade fixa" : "quantidade configuravel"} (${formacaoAtual.quantidade_minima_padrao} a ${formacaoAtual.quantidade_maxima_padrao})`
                  : FORMACAO_PRESETS[novaFormacao].descricao}
              </div>
              <textarea
                value={novaDescricao}
                onChange={(event) => setNovaDescricao(event.target.value)}
                placeholder="Descricao opcional da coreografia"
                className="min-h-[108px] rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:col-span-2 xl:col-span-4"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center rounded-full bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Criando..." : "Criar e usar na inscricao"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
