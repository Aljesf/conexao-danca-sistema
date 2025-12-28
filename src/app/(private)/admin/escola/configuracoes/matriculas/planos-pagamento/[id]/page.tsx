export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Plano = {
  id: number;
  titulo: string | null;
  nome: string | null;
  observacoes: string | null;
  ciclo_cobranca: "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL" | null;
  numero_parcelas: number | null;
  termino_cobranca: "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA" | null;
  data_fim_manual: string | null;
  regra_total_devido: "PROPORCIONAL" | "FIXO" | null;
  permite_prorrata: boolean | null;
  ciclo_financeiro: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | null;
  forma_liquidacao_padrao: string | null;
  politica_primeira_cobranca: "NO_ATO" | "PERMITIR_ADIAR_PARA_CICLO" | null;
  ativo: boolean | null;
};

function toBool(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default async function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    redirect("/admin/escola/configuracoes/matriculas/planos-pagamento");
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("matricula_planos_pagamento")
    .select(
      "id,titulo,nome,observacoes,ciclo_cobranca,numero_parcelas,termino_cobranca,data_fim_manual,regra_total_devido,permite_prorrata,ciclo_financeiro,forma_liquidacao_padrao,politica_primeira_cobranca,ativo"
    )
    .eq("id", id)
    .single();

  const plano = data as Plano | null;

  if (error || !plano) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Plano nao encontrado: {error?.message ?? "Erro desconhecido"}
        </div>
      </div>
    );
  }

  async function save(formData: FormData): Promise<void> {
    "use server";
    const supabase2 = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

    const ciclo = String(formData.get("ciclo_cobranca") ?? "").trim();
    const termino = String(formData.get("termino_cobranca") ?? "").trim();
    const dataFimManual = String(formData.get("data_fim_manual") ?? "").trim() || null;

    const regraTotal = String(formData.get("regra_total_devido") ?? "").trim();
    const cicloFinanceiro = String(formData.get("ciclo_financeiro") ?? "").trim();
    const formaLiquidacaoPadrao = String(formData.get("forma_liquidacao_padrao") ?? "").trim() || null;
    const politicaPrimeira = String(formData.get("politica_primeira_cobranca") ?? "NO_ATO").trim();

    const numeroParcelasRaw = toNumberOrNull(formData.get("numero_parcelas"));
    const permiteProrrata = toBool(formData.get("permite_prorrata"));
    const ativo = toBool(formData.get("ativo"));

    if (!titulo) throw new Error("Titulo e obrigatorio.");

    if (!"COBRANCA_UNICA COBRANCA_EM_PARCELAS COBRANCA_MENSAL".split(" ").includes(ciclo)) {
      throw new Error("Ciclo de cobranca invalido.");
    }

    if (!"PROPORCIONAL FIXO".split(" ").includes(regraTotal)) {
      throw new Error("Regra total devido invalida.");
    }

    if (!"MENSAL BIMESTRAL TRIMESTRAL SEMESTRAL ANUAL".split(" ").includes(cicloFinanceiro)) {
      throw new Error("Ciclo financeiro invalido.");
    }

    if (!"NO_ATO PERMITIR_ADIAR_PARA_CICLO".split(" ").includes(politicaPrimeira)) {
      throw new Error("Politica da primeira cobranca invalida.");
    }

    let numeroParcelas: number | null = null;
    if (ciclo === "COBRANCA_EM_PARCELAS") {
      if (!numeroParcelasRaw || numeroParcelasRaw <= 0) {
        throw new Error("Numero de parcelas invalido.");
      }
      numeroParcelas = numeroParcelasRaw;
    }

    let terminoFinal: string | null = null;
    let dataFimFinal: string | null = null;
    if (ciclo === "COBRANCA_MENSAL") {
      if (!"FIM_TURMA_CURSO FIM_PROJETO FIM_ANO_LETIVO DATA_ESPECIFICA".split(" ").includes(termino)) {
        throw new Error("Termino de cobranca invalido.");
      }
      terminoFinal = termino;
      if (termino === "DATA_ESPECIFICA") {
        if (!dataFimManual) throw new Error("Data fim manual obrigatoria para DATA_ESPECIFICA.");
        dataFimFinal = dataFimManual;
      }
    }

    const { error: updateErr } = await supabase2
      .from("matricula_planos_pagamento")
      .update({
        titulo,
        nome: titulo,
        observacoes,
        ciclo_cobranca: ciclo,
        numero_parcelas: numeroParcelas,
        termino_cobranca: terminoFinal,
        data_fim_manual: dataFimFinal,
        regra_total_devido: regraTotal,
        permite_prorrata: permiteProrrata,
        ciclo_financeiro: cicloFinanceiro,
        forma_liquidacao_padrao: formaLiquidacaoPadrao,
        politica_primeira_cobranca: politicaPrimeira,
        ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) throw new Error(updateErr.message);
    redirect(`/admin/escola/configuracoes/matriculas/planos-pagamento/${id}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader
        title={`Plano #${plano.id}`}
        description="Edite as regras do plano de pagamento (ciclo, prorrogacao e politica da primeira cobranca)."
        actions={
          <Link
            href="/admin/escola/configuracoes/matriculas/planos-pagamento"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          >
            Voltar
          </Link>
        }
      />

      <form action={save} className="space-y-4">
        <SectionCard title="Identificacao">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Titulo</label>
              <input
                name="titulo"
                defaultValue={plano.titulo || plano.nome || ""}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Observacoes (opcional)</label>
              <textarea
                name="observacoes"
                defaultValue={plano.observacoes ?? ""}
                className="border rounded-md px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Ciclo e termino">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ciclo de cobranca</label>
              <select
                name="ciclo_cobranca"
                className="border rounded-md px-3 py-2 text-sm"
                defaultValue={plano.ciclo_cobranca ?? ""}
              >
                <option value="">Selecione</option>
                <option value="COBRANCA_UNICA">COBRANCA_UNICA</option>
                <option value="COBRANCA_EM_PARCELAS">COBRANCA_EM_PARCELAS</option>
                <option value="COBRANCA_MENSAL">COBRANCA_MENSAL</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Numero de parcelas</label>
              <input
                name="numero_parcelas"
                type="number"
                defaultValue={plano.numero_parcelas ?? ""}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Termino da cobranca mensal</label>
              <select
                name="termino_cobranca"
                className="border rounded-md px-3 py-2 text-sm"
                defaultValue={plano.termino_cobranca ?? ""}
              >
                <option value="">Selecione</option>
                <option value="FIM_TURMA_CURSO">FIM_TURMA_CURSO</option>
                <option value="FIM_PROJETO">FIM_PROJETO</option>
                <option value="FIM_ANO_LETIVO">FIM_ANO_LETIVO</option>
                <option value="DATA_ESPECIFICA">DATA_ESPECIFICA</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Data fim (manual)</label>
              <input
                name="data_fim_manual"
                type="date"
                defaultValue={plano.data_fim_manual ?? ""}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Regras financeiras">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Regra do total devido</label>
              <select
                name="regra_total_devido"
                className="border rounded-md px-3 py-2 text-sm"
                defaultValue={plano.regra_total_devido ?? ""}
              >
                <option value="">Selecione</option>
                <option value="PROPORCIONAL">PROPORCIONAL</option>
                <option value="FIXO">FIXO</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Ciclo financeiro</label>
              <select
                name="ciclo_financeiro"
                className="border rounded-md px-3 py-2 text-sm"
                defaultValue={plano.ciclo_financeiro ?? ""}
              >
                <option value="">Selecione</option>
                <option value="MENSAL">MENSAL</option>
                <option value="BIMESTRAL">BIMESTRAL</option>
                <option value="TRIMESTRAL">TRIMESTRAL</option>
                <option value="SEMESTRAL">SEMESTRAL</option>
                <option value="ANUAL">ANUAL</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Liquidacao e primeira cobranca">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Forma de liquidacao (padrao)</label>
              <input
                name="forma_liquidacao_padrao"
                defaultValue={plano.forma_liquidacao_padrao ?? ""}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Politica da primeira cobranca</label>
              <select
                name="politica_primeira_cobranca"
                className="border rounded-md px-3 py-2 text-sm"
                defaultValue={plano.politica_primeira_cobranca ?? "NO_ATO"}
              >
                <option value="NO_ATO">NO_ATO</option>
                <option value="PERMITIR_ADIAR_PARA_CICLO">PERMITIR_ADIAR_PARA_CICLO</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input name="permite_prorrata" type="checkbox" defaultChecked={plano.permite_prorrata ?? false} />
              Permite prorrata (somente na primeira cobranca)
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input name="ativo" type="checkbox" defaultChecked={plano.ativo ?? true} />
              Plano ativo
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Acoes">
          <div className="flex justify-end">
            <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
              Salvar plano
            </button>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
