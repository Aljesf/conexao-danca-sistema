"use client";

import { formatDateISO, formatDateTimeISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { DetalheCobrancaAuditoria } from "@/lib/financeiro/contas-receber-auditoria";

type Props = {
  detalhe: DetalheCobrancaAuditoria | null;
  loading?: boolean;
  error?: string | null;
};

function Linha({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function migrationBadgeClass(tone: DetalheCobrancaAuditoria["cobranca"]["origem_badge_tone"]) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function centroCustoLabel(value: { codigo: string | null; nome: string | null }) {
  if (!value.nome) return "Sem centro definido";
  return `${value.codigo ?? "--"} | ${value.nome}`;
}

export function CobrancaAuditDetail({ detalhe, loading = false, error = null }: Props) {
  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Carregando trilha auditavel...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!detalhe) {
    return <div className="p-6 text-sm text-slate-500">Selecione uma cobranca para inspecionar.</div>;
  }

  const origemPrincipal = detalhe.cobranca.contaInternaId
    ? `Conta interna #${detalhe.cobranca.contaInternaId}`
    : detalhe.origem_label || detalhe.cobranca.origemLabel || detalhe.cobranca.origem_tecnica || "Origem em revisao";

  return (
    <div className="space-y-6 p-6">
      <section className="grid gap-3 md:grid-cols-2">
        <Linha label="Pessoa devedora" value={detalhe.pessoa.nome} />
        <Linha label="Contexto principal" value={detalhe.contexto_principal} />
        <Linha label="Origem principal" value={origemPrincipal} />
        <Linha label="Origem secundaria" value={detalhe.cobranca.origem_secundaria ?? "Sem complemento semantico"} />
        <Linha label="Aluno relacionado" value={detalhe.cobranca.alunoNome ?? "Nao identificado"} />
        <Linha
          label="Matricula relacionada"
          value={detalhe.cobranca.matriculaId ? `#${detalhe.cobranca.matriculaId}` : "Nao identificada"}
        />
        <Linha
          label="Situacao financeira"
          value={`${detalhe.cobranca.status_interno ?? "--"} | ${detalhe.cobranca.status_cobranca ?? "--"}`}
        />
        <Linha label="Vencimento" value={formatDateISO(detalhe.cobranca.vencimento)} />
        <Linha label="Vencimento original" value={formatDateISO(detalhe.cobranca.vencimentoOriginal)} />
        <Linha
          label="Ultimo ajuste"
          value={
            detalhe.cobranca.vencimentoAjustadoEm
              ? `${formatDateTimeISO(detalhe.cobranca.vencimentoAjustadoEm)}${detalhe.cobranca.vencimentoAjusteMotivo ? ` | ${detalhe.cobranca.vencimentoAjusteMotivo}` : ""}`
              : "Sem ajuste manual"
          }
        />
        <Linha label="Competencia" value={detalhe.cobranca.competencia_ano_mes ?? "Sem competencia"} />
        <Linha label="Valor total" value={formatBRLFromCents(detalhe.cobranca.valor_centavos)} />
        <Linha label="Saldo aberto" value={formatBRLFromCents(detalhe.cobranca.valor_aberto_centavos)} />
        <Linha
          label="Cancelamento"
          value={
            detalhe.cobranca.canceladaEm || detalhe.cobranca.cancelamentoTipo || detalhe.cobranca.cancelamentoMotivo
              ? `${formatDateTimeISO(detalhe.cobranca.canceladaEm)}${detalhe.cobranca.cancelamentoTipo ? ` | ${detalhe.cobranca.cancelamentoTipo}` : ""}${detalhe.cobranca.cancelamentoMotivo ? ` | ${detalhe.cobranca.cancelamentoMotivo}` : ""}`
              : "Titulo ativo"
          }
        />
        <Linha
          label="Matricula relacionada"
          value={
            detalhe.cobranca.matriculaId
              ? `#${detalhe.cobranca.matriculaId}${detalhe.cobranca.matriculaStatus ? ` | ${detalhe.cobranca.matriculaStatus}` : ""}${detalhe.cobranca.matriculaCancelamentoTipo ? ` | ${detalhe.cobranca.matriculaCancelamentoTipo}` : ""}`
              : "Nao identificada"
          }
        />
      </section>

      {detalhe.cobranca.origem_badge_label || detalhe.cobranca.migracao_conta_interna_observacao ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Migracao da origem</h3>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
            {detalhe.cobranca.origem_badge_label ? (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${migrationBadgeClass(detalhe.cobranca.origem_badge_tone)}`}
              >
                {detalhe.cobranca.origem_badge_label}
              </span>
            ) : null}
            {detalhe.cobranca.migracao_conta_interna_observacao ? (
              <div className={detalhe.cobranca.origem_badge_label ? "mt-3" : ""}>
                {detalhe.cobranca.migracao_conta_interna_observacao}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Documento vinculado</h3>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          {detalhe.documento_vinculado ? detalhe.documento_vinculado.label : "Sem documento resolvido"}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Centro de custo</h3>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 md:grid-cols-3">
          <Linha label="Agrupador / conta interna" value={centroCustoLabel(detalhe.centro_custo.agrupador)} />
          <Linha label="Lancamento real" value={centroCustoLabel(detalhe.centro_custo.lancamento)} />
          <Linha
            label="Cobranca derivada"
            value={centroCustoLabel({
              codigo: detalhe.centro_custo.codigo,
              nome: detalhe.centro_custo.nome,
            })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trilha auditavel</h3>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          {detalhe.trilha_auditavel.map((item) => (
            <div key={`${item.titulo}-${item.valor}`} className="grid gap-1 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
              <span className="text-xs uppercase tracking-wide text-slate-500">{item.titulo}</span>
              <span className="text-sm text-slate-800">{item.valor}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Metadados da cobranca</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Linha label="Origem bruta" value={`${detalhe.cobranca.origem_tipo ?? "--"} / ${detalhe.cobranca.origem_subtipo ?? "--"}`} />
          <Linha label="Origem tecnica" value={detalhe.cobranca.origem_tecnica ?? "Sem label tecnica"} />
          <Linha label="Origem ID" value={detalhe.cobranca.origem_id ? String(detalhe.cobranca.origem_id) : "Sem origem"} />
          <Linha label="Agrupador tipo" value={detalhe.cobranca.origemAgrupadorTipo ?? "--"} />
          <Linha
            label="Agrupador ID"
            value={detalhe.cobranca.origemAgrupadorId ? String(detalhe.cobranca.origemAgrupadorId) : "Sem agrupador"}
          />
          <Linha label="Item tipo" value={detalhe.cobranca.origemItemTipo ?? "--"} />
          <Linha label="Item ID" value={detalhe.cobranca.origemItemId ? String(detalhe.cobranca.origemItemId) : "Sem item"} />
          <Linha
            label="Conta interna"
            value={detalhe.cobranca.contaInternaId ? `#${detalhe.cobranca.contaInternaId}` : "Nao associada"}
          />
          <Linha label="Aluno" value={detalhe.cobranca.alunoNome ?? "Nao identificado"} />
          <Linha label="Matricula" value={detalhe.cobranca.matriculaId ? `#${detalhe.cobranca.matriculaId}` : "Nao identificada"} />
          <Linha label="Status da matricula" value={detalhe.cobranca.matriculaStatus ?? "Sem status"} />
          <Linha label="Cancelamento da matricula" value={detalhe.cobranca.matriculaCancelamentoTipo ?? "Sem classificacao"} />
          <Linha label="Status migracao" value={detalhe.cobranca.migracaoContaInternaStatus ?? "Sem status"} />
          <Linha label="Cancelada por" value={detalhe.cobranca.canceladaPor ?? "Sem usuario"} />
          <Linha label="Criada em" value={formatDateTimeISO(detalhe.cobranca.created_at)} />
          <Linha label="Atualizada em" value={formatDateTimeISO(detalhe.cobranca.updated_at)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cartao Conexao / fatura</h3>
        {detalhe.composicao_fatura_conexao ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Linha
                label="Fatura"
                value={`#${detalhe.composicao_fatura_conexao.fatura_id} | ${detalhe.composicao_fatura_conexao.periodo_referencia ?? "sem periodo"}`}
              />
              <Linha label="Vencimento da fatura" value={formatDateISO(detalhe.composicao_fatura_conexao.data_vencimento)} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Descricao</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="px-3 py-2 font-medium">Referencia</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.composicao_fatura_conexao.itens.map((item) => (
                    <tr key={item.lancamento_id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-800">{item.descricao}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.origem_sistema ?? "--"}
                        {item.origem_id ? ` #${item.origem_id}` : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.referencia_item ?? "--"}</td>
                      <td className="px-3 py-2 text-slate-700">{formatBRLFromCents(item.valor_centavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Esta cobranca nao esta vinculada a uma fatura do Cartao Conexao ou ainda nao possui composicao resolvida.
          </div>
        )}
      </section>
    </div>
  );
}
