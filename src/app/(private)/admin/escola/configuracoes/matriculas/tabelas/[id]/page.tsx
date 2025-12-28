export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import TabelaMatriculaEditForm from "./TabelaMatriculaEditForm";
import PoliticaPadraoItensSection from "./PoliticaPadraoItensSection";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type ProdutoTipo = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type MatriculaTabela = {
  id: number;
  produto_tipo: ProdutoTipo;
  ano_referencia: number | null;
  titulo: string;
  ativo: boolean;
  referencia_id: number | null;
};

type TabelaItem = {
  id: number;
  tabela_id: number;
  codigo_item: string;
  descricao: string | null;
  tipo_item: "RECORRENTE" | "UNICO" | "EVENTUAL";
  valor_centavos: number;
  ativo: boolean;
  ordem: number;
};

type TabelaAlvo = {
  alvo_tipo: AlvoTipo;
  alvo_id: number;
};

const PRODUTO_TO_SERVICO: Record<ProdutoTipo, ServicoTipo> = {
  REGULAR: "CURSO_REGULAR",
  CURSO_LIVRE: "CURSO_LIVRE",
  PROJETO_ARTISTICO: "PROJETO_ARTISTICO",
};

const SERVICO_LABEL: Record<ServicoTipo, string> = {
  CURSO_REGULAR: "Curso regular",
  CURSO_LIVRE: "Curso livre",
  PROJETO_ARTISTICO: "Projeto artistico",
};

function parseReaisToCentavos(input: string): number | null {
  const normalized = input.replace(",", ".").trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function formatCentavos(value: number): string {
  return (value / 100).toFixed(2);
}

function isMissingRelation(err: unknown): boolean {
  const e = err as { code?: string } | null;
  return !!e && e.code === "42P01";
}

function normalizeNumberArray(values: unknown[]): number[] {
  return Array.from(new Set(values.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)));
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = await Promise.resolve(params);
  const tabelaId = Number(id);
  if (!Number.isFinite(tabelaId) || tabelaId <= 0) {
    redirect("/admin/escola/configuracoes/matriculas/tabelas");
  }

  const supabase = getSupabaseAdmin();

  const { data: tabela, error: tabelaErr } = await supabase
    .from("matricula_tabelas")
    .select("id,produto_tipo,ano_referencia,titulo,ativo,referencia_id")
    .eq("id", tabelaId)
    .single();

  if (tabelaErr || !tabela) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Tabela nao encontrada: {tabelaErr?.message ?? "Erro desconhecido"}
        </div>
      </div>
    );
  }

  const [{ data: itens, error: itensErr }, { data: alvosData, error: alvosErr }] = await Promise.all([
    supabase
      .from("matricula_tabela_itens")
      .select("id,tabela_id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem")
      .eq("tabela_id", tabelaId)
      .order("ordem", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("matricula_tabelas_alvos").select("alvo_tipo,alvo_id").eq("tabela_id", tabelaId),
  ]);

  let unidadesExecucaoIds: number[] = [];
  let unidadesErrMsg: string | null = null;
  const { data: unidadesData, error: unidadesErr } = await supabase
    .from("matricula_tabelas_unidades_execucao")
    .select("unidade_execucao_id")
    .eq("tabela_id", tabelaId);

  if (unidadesErr) {
    if (!isMissingRelation(unidadesErr)) {
      unidadesErrMsg = unidadesErr.message;
    }
  } else {
    const rows = (unidadesData ?? []) as Array<{ unidade_execucao_id: number }>;
    unidadesExecucaoIds = normalizeNumberArray(rows.map((r) => r.unidade_execucao_id));
  }

  const listaItens = (itens ?? []) as TabelaItem[];
  const alvos = (alvosData ?? []) as TabelaAlvo[];
  const tabelaInfo = tabela as MatriculaTabela;

  const warnings: string[] = [];
  const produtoTipo = tabelaInfo.produto_tipo as ProdutoTipo;
  let servicoTipo = PRODUTO_TO_SERVICO[produtoTipo];
  if (!servicoTipo) {
    servicoTipo = "CURSO_REGULAR";
    warnings.push("produto_tipo invalido; usando CURSO_REGULAR.");
  }

  let servicoId: number | null = Number(tabelaInfo.referencia_id ?? 0);
  if (!Number.isFinite(servicoId) || servicoId <= 0) servicoId = null;

  const alvoTipos = Array.from(new Set(alvos.map((a) => a.alvo_tipo)));
  const alvoTipo = alvoTipos[0] ?? "TURMA";
  const alvoIds = normalizeNumberArray(alvos.filter((a) => a.alvo_tipo === alvoTipo).map((a) => a.alvo_id));
  const turmaIds = normalizeNumberArray(alvos.filter((a) => a.alvo_tipo === "TURMA").map((a) => a.alvo_id));

  if (alvoTipos.length > 1) {
    warnings.push("Atencao: esta tabela possui mais de um tipo de alvo legado.");
  }
  if (alvosErr) {
    warnings.push(`Falha ao carregar alvos legados: ${alvosErr.message}`);
  }

  if (!servicoId && alvos.length > 0 && alvoTipos.length === 1) {
    if (alvoTipo === "CURSO_LIVRE") {
      servicoTipo = "CURSO_LIVRE";
      servicoId = alvoIds[0] ?? null;
    }
    if (alvoTipo === "PROJETO") {
      servicoTipo = "PROJETO_ARTISTICO";
      servicoId = alvoIds[0] ?? null;
    }
    if ((alvoTipo === "CURSO_LIVRE" || alvoTipo === "PROJETO") && alvoIds.length > 1) {
      warnings.push("Mais de um alvo legado foi encontrado; usando o primeiro para o servico.");
    }
  }

  if (!servicoId && turmaIds.length > 0) {
    const { data: turmas, error: turmasErr } = await supabase
      .from("turmas")
      .select("turma_id, produto_id")
      .in("turma_id", turmaIds);

    if (turmasErr) {
      if (isMissingRelation(turmasErr)) {
        warnings.push("Tabela turmas nao encontrada (migracao pendente).");
      } else {
        warnings.push(`Falha ao carregar turmas: ${turmasErr.message}`);
      }
    } else {
      const rows = (turmas ?? []) as Array<{ turma_id: number; produto_id: number | null }>;
      const encontrados = new Set(rows.map((t) => Number(t.turma_id)));
      const faltantes = turmaIds.filter((id) => !encontrados.has(id));
      if (faltantes.length) {
        const preview = faltantes.slice(0, 5).join(", ");
        warnings.push(`Turmas nao encontradas: ${preview}${faltantes.length > 5 ? "..." : ""}.`);
      }

      const produtoIds = new Set(
        rows.map((t) => Number(t.produto_id)).filter((id) => Number.isFinite(id) && id > 0),
      );
      if (produtoIds.size === 1) {
        servicoId = Array.from(produtoIds)[0];
        servicoTipo = "CURSO_REGULAR";
      } else if (produtoIds.size > 1) {
        warnings.push("As turmas vinculadas pertencem a servicos diferentes.");
      }
    }
  }

  if (unidadesExecucaoIds.length === 0 && turmaIds.length > 0) {
    let query = supabase
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id, origem_id")
      .eq("origem_tipo", "TURMA")
      .in("origem_id", turmaIds);
    if (servicoId) {
      query = query.eq("servico_id", servicoId);
    }

    const { data: ueData, error: ueErr } = await query;
    if (ueErr) {
      if (isMissingRelation(ueErr)) {
        warnings.push("Tabela escola_unidades_execucao nao encontrada (migracao pendente).");
      } else {
        warnings.push(`Falha ao carregar unidades de execucao: ${ueErr.message}`);
      }
    } else {
      const rows = (ueData ?? []) as Array<{ unidade_execucao_id: number; origem_id: number }>;
      unidadesExecucaoIds = normalizeNumberArray(rows.map((r) => r.unidade_execucao_id));
      const foundTurmas = new Set(rows.map((r) => Number(r.origem_id)));
      const missingTurmas = turmaIds.filter((id) => !foundTurmas.has(id));
      if (missingTurmas.length) {
        warnings.push("Algumas turmas nao possuem unidade de execucao vinculada.");
      }
    }
  }

  if (!servicoId && alvos.length > 0) {
    warnings.push("Servico nao foi resolvido a partir dos dados atuais.");
  }

  const hasMensalidadeAtiva = listaItens.some(
    (i) => i.ativo && i.codigo_item === "MENSALIDADE" && i.tipo_item === "RECORRENTE",
  );

  async function addItem(formData: FormData): Promise<void> {
    "use server";

    const supabase2 = getSupabaseAdmin();

    const codigoRaw = String(formData.get("codigo_item") ?? "");
    const codigo_item = codigoRaw.trim().toUpperCase();
    const tipo_item = String(formData.get("tipo_item") ?? "").trim();
    const valorReais = String(formData.get("valor_reais") ?? "").trim();
    const valor_centavos = parseReaisToCentavos(valorReais);
    const descricaoRaw = String(formData.get("descricao") ?? "").trim();
    const descricao = descricaoRaw.length ? descricaoRaw : null;
    const ordem = Number(formData.get("ordem") ?? 0);
    const ativo = formData.get("ativo") === "on";

    if (!codigo_item) throw new Error("Codigo obrigatorio.");
    if (!["RECORRENTE", "UNICO", "EVENTUAL"].includes(tipo_item)) throw new Error("Tipo invalido.");
    if (valor_centavos === null) throw new Error("Valor (R$) invalido. Use exemplo: 220.00");

    const { error } = await supabase2.from("matricula_tabela_itens").insert({
      tabela_id: tabelaId,
      codigo_item,
      tipo_item,
      valor_centavos,
      descricao,
      ordem: Number.isFinite(ordem) ? ordem : 0,
      ativo,
    });

    if (error) throw new Error(error.message);

    redirect(`/admin/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

  const servicoLabel = SERVICO_LABEL[servicoTipo] ?? servicoTipo;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Tabela #${tabelaInfo.id}`}
        description="Configure categoria, servico e unidades de execucao. Cadastre itens de cobranca (ex.: MENSALIDADE recorrente)."
        actions={
          <Link
            href="/admin/escola/configuracoes/matriculas/tabelas"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          >
            Voltar para lista
          </Link>
        }
      />

      <SectionCard title="Vinculo e escopo">
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>
            Categoria: <span className="text-slate-900">{servicoLabel}</span> - Ano:{" "}
            <span className="text-slate-900">{tabelaInfo.ano_referencia ?? "-"}</span>
          </div>
          {servicoId ? (
            <div>
              Servico: <span className="text-slate-900">#{servicoId}</span>
            </div>
          ) : (
            <div>Servico nao definido.</div>
          )}
          {unidadesExecucaoIds.length > 0 ? (
            <div>
              Unidades selecionadas: <span className="text-slate-900">{unidadesExecucaoIds.join(", ")}</span>
            </div>
          ) : (
            <div>Aplica a todas as unidades de execucao.</div>
          )}
          {unidadesErrMsg ? <div className="text-red-700">Falha ao carregar unidades: {unidadesErrMsg}</div> : null}
        </div>

        {warnings.length ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            {warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          <TabelaMatriculaEditForm
            tabelaId={tabelaInfo.id}
            titulo={tabelaInfo.titulo}
            anoReferencia={tabelaInfo.ano_referencia}
            ativo={tabelaInfo.ativo}
            servicoTipo={servicoTipo}
            servicoId={servicoId}
            unidadeExecucaoIds={unidadesExecucaoIds}
            variant="plain"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Itens"
        description="Para matricula funcionar, cadastre MENSALIDADE com tipo RECORRENTE e valor em R$."
      >
        {!hasMensalidadeAtiva ? (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Atencao: esta tabela nao tem MENSALIDADE / RECORRENTE ativa. A matricula vai falhar com 409.
          </div>
        ) : null}

        {itensErr ? <div className="text-sm text-red-700">Falha ao carregar itens: {itensErr.message}</div> : null}

        {listaItens.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum item cadastrado.</div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Codigo</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Valor</div>
              <div className="col-span-2">Ativo</div>
              <div className="col-span-2">Ordem</div>
            </div>
            <div className="divide-y">
              {listaItens.map((i) => (
                <div key={i.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                  <div className="col-span-1">{i.id}</div>
                  <div className="col-span-3">{i.codigo_item}</div>
                  <div className="col-span-2">{i.tipo_item}</div>
                  <div className="col-span-2">R$ {formatCentavos(i.valor_centavos)}</div>
                  <div className="col-span-2">{i.ativo ? "Sim" : "Nao"}</div>
                  <div className="col-span-2">{i.ordem}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form action={addItem} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-3 grid gap-1">
            <label className="text-xs font-medium">Codigo</label>
            <input name="codigo_item" className="border rounded-md px-2 py-2 text-sm" defaultValue="MENSALIDADE" />
          </div>

          <div className="md:col-span-2 grid gap-1">
            <label className="text-xs font-medium">Tipo</label>
            <select name="tipo_item" className="border rounded-md px-2 py-2 text-sm" defaultValue="RECORRENTE">
              <option value="RECORRENTE">RECORRENTE</option>
              <option value="UNICO">UNICO</option>
              <option value="EVENTUAL">EVENTUAL</option>
            </select>
          </div>

          <div className="md:col-span-2 grid gap-1">
            <label className="text-xs font-medium">Valor (R$)</label>
            <input name="valor_reais" className="border rounded-md px-2 py-2 text-sm" placeholder="220.00" />
            <p className="text-[11px] text-muted-foreground">Ex.: 220.00 = 22000 centavos</p>
          </div>

          <div className="md:col-span-3 grid gap-1">
            <label className="text-xs font-medium">Descricao</label>
            <input name="descricao" className="border rounded-md px-2 py-2 text-sm" placeholder="Mensalidade 2026" />
          </div>

          <div className="md:col-span-1 grid gap-1">
            <label className="text-xs font-medium">Ordem</label>
            <input name="ordem" type="number" className="border rounded-md px-2 py-2 text-sm" defaultValue={1} />
          </div>

          <div className="md:col-span-1 flex items-center gap-2">
            <label className="text-xs font-medium flex items-center gap-2">
              <input name="ativo" type="checkbox" defaultChecked />
              Ativo
            </label>
          </div>

          <div className="md:col-span-12 flex justify-end">
            <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
              Adicionar item
            </button>
          </div>
        </form>
      </SectionCard>

      <PoliticaPadraoItensSection tabelaId={tabelaInfo.id} itens={listaItens} />
    </div>
  );
}

