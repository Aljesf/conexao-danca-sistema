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

export function CobrancaAuditDetail({ detalhe, loading = false, error = null }: Props) {
  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Carregando trilha auditável...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!detalhe) {
    return <div className="p-6 text-sm text-slate-500">Selecione uma cobrança para inspecionar.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <section className="grid gap-3 md:grid-cols-2">
        <Linha label="Pessoa devedora" value={detalhe.pessoa.nome} />
        <Linha label="Contexto principal" value={detalhe.contexto_principal} />
        <Linha label="Origem detalhada" value={detalhe.origem_label} />
        <Linha
          label="Situação financeira"
          value={`${detalhe.cobranca.status_interno ?? "--"} · ${detalhe.cobranca.status_cobranca ?? "--"}`}
        />
        <Linha label="Vencimento" value={formatDateISO(detalhe.cobranca.vencimento)} />
        <Linha label="Competência" value={detalhe.cobranca.competencia_ano_mes ?? "Sem competência"} />
        <Linha label="Valor total" value={formatBRLFromCents(detalhe.cobranca.valor_centavos)} />
        <Linha label="Saldo aberto" value={formatBRLFromCents(detalhe.cobranca.valor_aberto_centavos)} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Documento / entidade vinculada</h3>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          {detalhe.documento_vinculado ? detalhe.documento_vinculado.label : "Sem documento resolvido"}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Centro de custo</h3>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          {detalhe.centro_custo.nome
            ? `${detalhe.centro_custo.codigo ?? "--"} · ${detalhe.centro_custo.nome}`
            : "Sem centro de custo definido"}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trilha auditável</h3>
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Metadados da cobrança</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Linha label="Origem bruta" value={`${detalhe.cobranca.origem_tipo ?? "--"} / ${detalhe.cobranca.origem_subtipo ?? "--"}`} />
          <Linha label="Origem ID" value={detalhe.cobranca.origem_id ? String(detalhe.cobranca.origem_id) : "Sem origem"} />
          <Linha label="Criada em" value={formatDateTimeISO(detalhe.cobranca.created_at)} />
          <Linha label="Atualizada em" value={formatDateTimeISO(detalhe.cobranca.updated_at)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cartão Conexão / fatura</h3>
        {detalhe.composicao_fatura_conexao ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Linha
                label="Fatura"
                value={`#${detalhe.composicao_fatura_conexao.fatura_id} · ${detalhe.composicao_fatura_conexao.periodo_referencia ?? "sem período"}`}
              />
              <Linha label="Vencimento da fatura" value={formatDateISO(detalhe.composicao_fatura_conexao.data_vencimento)} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="px-3 py-2 font-medium">Referência</th>
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
            Esta cobrança não está vinculada a uma fatura do Cartão Conexão ou ainda não possui composição resolvida.
          </div>
        )}
      </section>
    </div>
  );
}
