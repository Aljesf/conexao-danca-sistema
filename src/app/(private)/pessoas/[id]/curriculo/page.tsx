import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
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

type MatriculaPessoaItem = {
  id: number;
  ano_referencia: number | null;
  status: string | null;
  created_at: string | null;
  servico_nome: string | null;
  unidade_execucao_label: string | null;
};

function getStatusInfo(status: string | null) {
  const value = (status ?? "").toUpperCase();
  switch (value) {
    case "ATIVA":
      return { label: "ATIVA", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case "TRANCADA":
      return { label: "TRANCADA", className: "border-amber-200 bg-amber-50 text-amber-700" };
    case "CANCELADA":
      return { label: "CANCELADA", className: "border-rose-200 bg-rose-50 text-rose-700" };
    case "CONCLUIDA":
      return { label: "CONCLUIDA", className: "border-slate-200 bg-slate-100 text-slate-700" };
    default:
      return { label: status ?? "-", className: "border-slate-200 bg-slate-100 text-slate-600" };
  }
}

function getMatriculasResumo(items: MatriculaPessoaItem[]) {
  if (!items.length) return [];
  const anos = items
    .map((item) => item.ano_referencia ?? 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  const latestAno = anos.length ? Math.max(...anos) : null;
  let base = latestAno ? items.filter((item) => item.ano_referencia === latestAno) : items;
  const ativas = base.filter((item) => (item.status ?? "").toUpperCase() === "ATIVA");
  if (ativas.length) base = ativas;
  return base;
}

async function fetchMatriculasPessoa(pessoaId: number, cookieHeader: string, baseUrl: string) {
  if (!baseUrl) return [] as MatriculaPessoaItem[];
  const headersInit: Record<string, string> = {};
  if (cookieHeader) headersInit.cookie = cookieHeader;

  const res = await fetch(`${baseUrl}/api/pessoas/${pessoaId}/matriculas`, {
    headers: headersInit,
    cache: "no-store",
  });

  if (!res.ok) {
    return [] as MatriculaPessoaItem[];
  }

  const json = (await res.json()) as { items?: MatriculaPessoaItem[] };
  return Array.isArray(json.items) ? json.items : [];
}

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
              href={`/escola/academico/turmas/${item.turma_avaliacoes?.turma_id ?? item.turma_avaliacao_id}/avaliacoes/${item.turma_avaliacao_id}`}
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

  const headersList = headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : "";
  const cookieHeader = cookies().toString();

  const [pessoa, internas, externas, experiencias, avaliacoes, matriculas] =
    await Promise.all([
      buscarDadosBasicosPessoa(pessoaId),
      listarFormacoesInternas(pessoaId),
      listarFormacoesExternas(pessoaId),
      listarExperienciasArtisticas(pessoaId),
      listarAvaliacoesDoAluno(pessoaId),
      fetchMatriculasPessoa(pessoaId, cookieHeader, baseUrl),
    ]);

  if (!pessoa) {
    notFound();
  }

  const matriculasResumo = getMatriculasResumo(matriculas);
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

          <Section title="Vinculos escolares (Matriculas)">
            {matriculasResumo.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma matricula encontrada.
              </p>
            ) : (
              <div className="space-y-3">
                {matriculasResumo.map((item) => {
                  const badge = getStatusInfo(item.status);
                  const detalhes = [
                    item.unidade_execucao_label,
                    item.ano_referencia ? `Ano ${item.ano_referencia}` : null,
                  ]
                    .filter(Boolean)
                    .join(" - ");

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.servico_nome || "Servico"}
                          </p>
                          <p className="text-xs text-slate-600">
                            {detalhes || "Turma nao informada"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "rounded-full border px-3 py-1 text-[11px] font-semibold " +
                              badge.className
                            }
                          >
                            {badge.label}
                          </span>
                          <Link
                            href={`/escola/matriculas/${item.id}`}
                            className="text-xs text-violet-600 hover:underline"
                          >
                            Abrir
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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







