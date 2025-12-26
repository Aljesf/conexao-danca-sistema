export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type MatriculaTabela = {
  id: number;
  produto_tipo: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  referencia_tipo: "TURMA" | "PRODUTO" | "PROJETO";
  referencia_id: number;
  ano_referencia: number | null;
  titulo: string;
  ativo: boolean;
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

type Turma = {
  turma_id: number;
  nome?: string | null;
  curso?: string | null;
  nivel?: string | null;
  turno?: string | null;
  dias_semana?: string[] | string | null;
  ano_referencia?: number | null;
};

function formatDias(dias: Turma["dias_semana"]): string | null {
  if (!dias) return null;
  if (Array.isArray(dias)) {
    return dias.length ? dias.join(", ") : null;
  }
  const trimmed = String(dias).trim();
  return trimmed.length ? trimmed : null;
}

function turmaLabel(t: Turma): string {
  const dias = formatDias(t.dias_semana);
  const partes = [
    t.curso ?? null,
    t.nome ?? null,
    t.nivel ?? null,
    t.turno ?? null,
    dias,
    t.ano_referencia ? `Ano ${t.ano_referencia}` : null,
  ].filter(Boolean);
  const base = partes.length ? partes.join(" - ") : "Turma";
  return `${base} (ID ${t.turma_id})`;
}

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

export default async function Page({ params }: { params: { id: string } }) {
  const tabelaId = Number(params.id);
  if (!Number.isFinite(tabelaId) || tabelaId <= 0) {
    redirect("/admin/escola/configuracoes/matriculas/tabelas");
  }

  const supabase = getSupabaseAdmin();

  const { data: tabela, error: tabelaErr } = await supabase
    .from("matricula_tabelas")
    .select("id,produto_tipo,referencia_tipo,referencia_id,ano_referencia,titulo,ativo")
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

  const [{ data: itens, error: itensErr }, { data: turmasData }] = await Promise.all([
    supabase
      .from("matricula_tabela_itens")
      .select("id,tabela_id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem")
      .eq("tabela_id", tabelaId)
      .order("ordem", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("turmas").select("turma_id,nome,curso,nivel,turno,dias_semana,ano_referencia"),
  ]);

  const listaItens = (itens ?? []) as TabelaItem[];
  const turmas = (turmasData ?? []) as Turma[];
  const turma = turmas.find((t) => t.turma_id === (tabela as MatriculaTabela).referencia_id) ?? null;

  const hasMensalidadeAtiva = listaItens.some(
    (i) => i.ativo && i.codigo_item === "MENSALIDADE" && i.tipo_item === "RECORRENTE",
  );

  async function updateTabela(formData: FormData): Promise<void> {
    "use server";

    const supabase2 = getSupabaseAdmin();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const ativo = formData.get("ativo") === "on";
    const anoRaw = String(formData.get("ano_referencia") ?? "").trim();
    const ano = anoRaw ? Number(anoRaw) : null;

    if (!titulo) throw new Error("Titulo e obrigatorio.");

    const { error } = await supabase2
      .from("matricula_tabelas")
      .update({ titulo, ativo, ano_referencia: ano })
      .eq("id", tabelaId);

    if (error) throw new Error(error.message);

    redirect(`/admin/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

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

  const tabelaInfo = tabela as MatriculaTabela;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tabela #{tabelaInfo.id}</h1>
        <p className="text-sm text-muted-foreground">
          {tabelaInfo.produto_tipo} - {tabelaInfo.referencia_tipo}:{tabelaInfo.referencia_id} - Ano:{" "}
          {tabelaInfo.ano_referencia ?? "-"}
        </p>
        {turma ? (
          <p className="text-sm">
            Turma: <b>{turmaLabel(turma)}</b>
          </p>
        ) : null}
      </div>

      {!hasMensalidadeAtiva ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Atencao: esta tabela nao tem MENSALIDADE / RECORRENTE ativa. A matricula vai falhar com 409.
        </div>
      ) : null}

      <form action={updateTabela} className="rounded-md border p-4 space-y-3 max-w-3xl">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Titulo</label>
          <input name="titulo" defaultValue={tabelaInfo.titulo} className="border rounded-md px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Sugestao: inclua curso/turma/ano para facilitar busca.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ano (REGULAR)</label>
            <input
              name="ano_referencia"
              defaultValue={tabelaInfo.ano_referencia ?? ""}
              className="border rounded-md px-3 py-2 text-sm"
              type="number"
            />
          </div>

          <label className="flex items-center gap-2 text-sm mt-7">
            <input name="ativo" type="checkbox" defaultChecked={tabelaInfo.ativo} />
            Ativa
          </label>
        </div>

        <div className="flex justify-end">
          <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
            Salvar tabela
          </button>
        </div>
      </form>

      <div className="rounded-md border p-4 space-y-3">
        <h2 className="font-medium">Itens</h2>
        <p className="text-sm text-muted-foreground">
          Para matricula funcionar, cadastre MENSALIDADE com tipo RECORRENTE e valor em R$.
        </p>

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

        <form action={addItem} className="mt-4 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3 grid gap-1">
            <label className="text-xs font-medium">Codigo</label>
            <input name="codigo_item" className="border rounded-md px-2 py-2 text-sm" defaultValue="MENSALIDADE" />
          </div>

          <div className="col-span-2 grid gap-1">
            <label className="text-xs font-medium">Tipo</label>
            <select name="tipo_item" className="border rounded-md px-2 py-2 text-sm" defaultValue="RECORRENTE">
              <option value="RECORRENTE">RECORRENTE</option>
              <option value="UNICO">UNICO</option>
              <option value="EVENTUAL">EVENTUAL</option>
            </select>
          </div>

          <div className="col-span-2 grid gap-1">
            <label className="text-xs font-medium">Valor (R$)</label>
            <input name="valor_reais" className="border rounded-md px-2 py-2 text-sm" placeholder="220.00" />
            <p className="text-[11px] text-muted-foreground">Ex.: 220.00 = 22000 centavos</p>
          </div>

          <div className="col-span-3 grid gap-1">
            <label className="text-xs font-medium">Descricao</label>
            <input name="descricao" className="border rounded-md px-2 py-2 text-sm" placeholder="Mensalidade 2026" />
          </div>

          <div className="col-span-1 grid gap-1">
            <label className="text-xs font-medium">Ordem</label>
            <input name="ordem" type="number" className="border rounded-md px-2 py-2 text-sm" defaultValue={1} />
          </div>

          <div className="col-span-1 flex items-center gap-2">
            <label className="text-xs font-medium flex items-center gap-2">
              <input name="ativo" type="checkbox" defaultChecked />
              Ativo
            </label>
          </div>

          <div className="col-span-12 flex justify-end">
            <button className="rounded-md bg-black px-3 py-2 text-sm text-white" type="submit">
              Adicionar item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
