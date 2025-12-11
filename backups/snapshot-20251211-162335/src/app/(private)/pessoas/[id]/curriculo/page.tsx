import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  buscarDadosBasicosPessoa,
  listarAvaliacoesDoAluno,
  listarExperienciasArtisticas,
  listarFormacoesExternas,
  listarFormacoesInternas,
} from "@/lib/academico/curriculoServer";
import type {
  CurriculoExperienciaArtistica,
  CurriculoFormacaoExterna,
  CurriculoFormacaoInterna,
} from "@/types/curriculo";
import type { ResultadoAvaliacaoAluno } from "@/types/avaliacoes";

function calcularIdade(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const nascimento = new Date(dateStr);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade >= 0 && idade <= 120 ? idade : null;
}

function getInitials(nome?: string | null) {
  if (!nome) return "CD";
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "CD";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ListaInterna({ itens }: { itens: CurriculoFormacaoInterna[] }) {
  if (!itens.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma formação interna cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => {
        const periodo =
          item.data_inicio && item.data_fim
            ? `${item.data_inicio} — ${item.data_fim}`
            : item.data_inicio || item.data_fim || null;

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  {[item.curso, item.nivel].filter(Boolean).join(" • ") ||
                    "Formação interna"}
                </p>
                <p className="text-xs text-slate-600">
                  {[item.tipo_turma, periodo].filter(Boolean).join(" • ") ||
                    "Período não informado"}
                </p>
              </div>
              <p className="text-xs text-slate-600">
                {item.status_conclusao
                  ? `Status: ${item.status_conclusao}`
                  : "Status não informado"}
              </p>
            </div>

            <div className="mt-2 grid gap-2 text-[11px] text-slate-600 md:grid-cols-3">
              <span>
                Carga horária: {item.carga_horaria ?? "—"}{" "}
                {item.carga_horaria ? "h" : ""}
              </span>
              <span>
                Frequência:{" "}
                {item.frequencia_percentual
                  ? `${item.frequencia_percentual}%`
                  : "—"}
              </span>
              <span>{item.avaliacoes_concluidas ?? ""}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListaExterna({ itens }: { itens: CurriculoFormacaoExterna[] }) {
  if (!itens.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma formação externa cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-slate-900">
            {item.nome_formacao || "Formação externa"}
          </p>
          <p className="text-xs text-slate-600">
            {[item.instituicao, item.cidade_pais, item.tipo_formacao]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <div className="mt-2 grid gap-2 text-[11px] text-slate-600 md:grid-cols-3">
            <span>
              Carga horária: {item.carga_horaria ?? "—"}{" "}
              {item.carga_horaria ? "h" : ""}
            </span>
            <span>
              Período:{" "}
              {[item.data_inicio, item.data_fim].filter(Boolean).join(" — ") ||
                "—"}
            </span>
            <span>
              Certificado: {item.certificado_existe ? "Sim" : "Não informado"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListaExperiencias({
  itens,
}: {
  itens: CurriculoExperienciaArtistica[];
}) {
  if (!itens.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma experiência artística cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-slate-900">
            {item.nome_evento || "Experiência artística"}
          </p>
          <p className="text-xs text-slate-600">
            {[item.tipo, item.papel, item.local].filter(Boolean).join(" • ")}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Data: {item.data_evento || "—"}
          </p>
          {item.descricao && (
            <p className="mt-1 text-sm text-slate-700">{item.descricao}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ListaAvaliacoes({ itens }: { itens: ResultadoAvaliacaoAluno[] }) {
  if (!itens.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma avaliação registrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {item.turma_avaliacoes?.avaliacoes_modelo?.nome ?? "Avaliação"}
            </p>
            <p className="text-xs text-slate-600">
              {item.turma_avaliacoes?.turmas?.nome ?? "Turma"} •{" "}
              {item.turma_avaliacoes?.turmas?.curso ?? "Curso"} •{" "}
              {item.turma_avaliacoes?.turmas?.nivel ?? "Nível"}
            </p>
            <p className="text-[11px] text-slate-500">
              Data: {item.turma_avaliacoes?.data_realizada ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.conceito?.rotulo && (
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: item.conceito.cor_hex ?? "#e5e7eb",
                  color: "#111827",
                }}
              >
                {item.conceito.rotulo}
              </span>
            )}
            <Link
              href={`/academico/turmas/${item.turma_avaliacoes?.turma_id ?? item.turma_avaliacao_id}/avaliacoes/${item.turma_avaliacao_id}`}
              className="text-xs text-violet-600 hover:underline"
            >
              Ver detalhes
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function CurriculoPage({
  params,
}: {
  params: { id: string };
}) {
  const pessoaId = Number(params.id);
  if (Number.isNaN(pessoaId)) {
    notFound();
  }

  const [pessoa, internas, externas, experiencias, avaliacoes] =
    await Promise.all([
      buscarDadosBasicosPessoa(pessoaId),
      listarFormacoesInternas(pessoaId),
      listarFormacoesExternas(pessoaId),
      listarExperienciasArtisticas(pessoaId),
      listarAvaliacoesDoAluno(pessoaId),
    ]);

  if (!pessoa) {
    notFound();
  }

  const idade = calcularIdade(pessoa?.nascimento);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-violet-100 bg-white/95 px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {pessoa?.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pessoa.foto_url}
                alt={pessoa.nome ?? "Foto da pessoa"}
                className="h-20 w-20 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-500 shadow-sm">
                {getInitials(pessoa?.nome)}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Currículo
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {pessoa?.nome}
              </h1>
              <p className="text-sm text-slate-600">
                {[idade ? `${idade} anos` : null, pessoa?.email, pessoa?.telefone]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>

          <Link
            href={`/api/curriculo/${pessoaId}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            Gerar PDF
          </Link>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Dados pessoais">
            <dl className="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Nome
                </dt>
                <dd className="font-medium text-slate-900">
                  {pessoa?.nome ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  CPF
                </dt>
                <dd>{pessoa?.cpf ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </dt>
                <dd>{pessoa?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Telefone
                </dt>
                <dd>{pessoa?.telefone ?? "—"}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Formações internas">
            <ListaInterna itens={(internas ?? []) as CurriculoFormacaoInterna[]} />
          </Section>

          <Section title="Formações externas">
            <ListaExterna itens={(externas ?? []) as CurriculoFormacaoExterna[]} />
          </Section>

          <Section title="Experiências artísticas">
            <ListaExperiencias
              itens={(experiencias ?? []) as CurriculoExperienciaArtistica[]}
            />
          </Section>

          <Section title="Avaliações e progresso">
            <ListaAvaliacoes
              itens={(avaliacoes ?? []) as ResultadoAvaliacaoAluno[]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
