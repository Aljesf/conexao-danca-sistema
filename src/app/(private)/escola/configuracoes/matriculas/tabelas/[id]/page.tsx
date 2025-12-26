export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

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

function isValidProdutoTipo(value: string): value is MatriculaTabela["produto_tipo"] {
  return value === "REGULAR" || value === "CURSO_LIVRE" || value === "PROJETO_ARTISTICO";
}

function isValidReferenciaTipo(value: string): value is MatriculaTabela["referencia_tipo"] {
  return value === "TURMA" || value === "PRODUTO" || value === "PROJETO";
}

function isValidTipoItem(value: string): value is TabelaItem["tipo_item"] {
  return value === "RECORRENTE" || value === "UNICO" || value === "EVENTUAL";
}

function parseNumberField(value: FormDataEntryValue | null): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTextField(value: FormDataEntryValue | null): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  return raw.length ? raw : null;
}

function formatCentavos(value: number): string {
  return (value / 100).toFixed(2);
}

export default async function Page({ params }: { params: { id: string } }) {
  const tabelaId = Number(params.id);
  if (!Number.isFinite(tabelaId) || tabelaId <= 0) {
    redirect("/escola/configuracoes/matriculas/tabelas");
  }

  const supabase = await getSupabaseServer();

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

  const { data: itens, error: itensErr } = await supabase
    .from("matricula_tabela_itens")
    .select("id,tabela_id,codigo_item,descricao,tipo_item,valor_centavos,ativo,ordem")
    .eq("tabela_id", tabelaId)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  const listaItens = (itens ?? []) as TabelaItem[];

  const hasMensalidadeAtiva = listaItens.some(
    (item) => item.ativo && item.codigo_item.toUpperCase() === "MENSALIDADE" && item.tipo_item === "RECORRENTE",
  );

  async function updateTabela(formData: FormData): Promise<void> {
    "use server";

    const supabaseServer = await getSupabaseServer();

    const titulo = parseTextField(formData.get("titulo"));
    const produtoTipoRaw = parseTextField(formData.get("produto_tipo"));
    const referenciaTipoRaw = parseTextField(formData.get("referencia_tipo"));
    const referenciaId = parseNumberField(formData.get("referencia_id"));
    const anoReferencia = parseNumberField(formData.get("ano_referencia"));
    const ativo = formData.get("ativo") === "on";

    if (!titulo) throw new Error("Titulo e obrigatorio.");
    if (!produtoTipoRaw || !isValidProdutoTipo(produtoTipoRaw)) throw new Error("produto_tipo invalido.");
    if (!referenciaTipoRaw || !isValidReferenciaTipo(referenciaTipoRaw)) {
      throw new Error("referencia_tipo invalido.");
    }
    if (referenciaId === null || referenciaId <= 0) {
      throw new Error("referencia_id invalido.");
    }
    if (produtoTipoRaw === "REGULAR" && anoReferencia === null) {
      throw new Error("ano_referencia e obrigatorio para REGULAR.");
    }

    const { error } = await supabaseServer
      .from("matricula_tabelas")
      .update({
        titulo,
        produto_tipo: produtoTipoRaw,
        referencia_tipo: referenciaTipoRaw,
        referencia_id: referenciaId,
        ano_referencia: anoReferencia,
        ativo,
      })
      .eq("id", tabelaId);

    if (error) throw new Error(error.message);

    redirect(`/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

  async function addItem(formData: FormData): Promise<void> {
    "use server";

    const supabaseServer = await getSupabaseServer();

    const codigoItemRaw = parseTextField(formData.get("codigo_item"));
    const tipoItemRaw = parseTextField(formData.get("tipo_item"));
    const valorCentavos = parseNumberField(formData.get("valor_centavos"));
    const descricao = parseTextField(formData.get("descricao"));
    const ordem = parseNumberField(formData.get("ordem")) ?? 0;
    const ativo = formData.get("ativo") === "on";

    if (!codigoItemRaw) throw new Error("codigo_item obrigatorio.");
    if (!tipoItemRaw || !isValidTipoItem(tipoItemRaw)) throw new Error("tipo_item invalido.");
    if (valorCentavos === null || valorCentavos <= 0) {
      throw new Error("valor_centavos invalido.");
    }

    const { error } = await supabaseServer.from("matricula_tabela_itens").insert({
      tabela_id: tabelaId,
      codigo_item: codigoItemRaw.toUpperCase(),
      tipo_item: tipoItemRaw,
      valor_centavos: valorCentavos,
      descricao,
      ordem,
      ativo,
    });

    if (error) throw new Error(error.message);

    redirect(`/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

  async function updateItem(formData: FormData): Promise<void> {
    "use server";

    const supabaseServer = await getSupabaseServer();

    const itemId = parseNumberField(formData.get("item_id"));
    const codigoItemRaw = parseTextField(formData.get("codigo_item"));
    const tipoItemRaw = parseTextField(formData.get("tipo_item"));
    const valorCentavos = parseNumberField(formData.get("valor_centavos"));
    const descricao = parseTextField(formData.get("descricao"));
    const ordem = parseNumberField(formData.get("ordem")) ?? 0;
    const ativo = formData.get("ativo") === "on";

    if (!itemId || itemId <= 0) throw new Error("item_id invalido.");
    if (!codigoItemRaw) throw new Error("codigo_item obrigatorio.");
    if (!tipoItemRaw || !isValidTipoItem(tipoItemRaw)) throw new Error("tipo_item invalido.");
    if (valorCentavos === null || valorCentavos <= 0) {
      throw new Error("valor_centavos invalido.");
    }

    const { error } = await supabaseServer
      .from("matricula_tabela_itens")
      .update({
        codigo_item: codigoItemRaw.toUpperCase(),
        tipo_item: tipoItemRaw,
        valor_centavos: valorCentavos,
        descricao,
        ordem,
        ativo,
      })
      .eq("id", itemId)
      .eq("tabela_id", tabelaId);

    if (error) throw new Error(error.message);

    redirect(`/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

  async function deleteItem(formData: FormData): Promise<void> {
    "use server";

    const supabaseServer = await getSupabaseServer();
    const itemId = parseNumberField(formData.get("item_id"));

    if (!itemId || itemId <= 0) throw new Error("item_id invalido.");

    const { error } = await supabaseServer
      .from("matricula_tabela_itens")
      .delete()
      .eq("id", itemId)
      .eq("tabela_id", tabelaId);

    if (error) throw new Error(error.message);

    redirect(`/escola/configuracoes/matriculas/tabelas/${tabelaId}`);
  }

  const tabelaInfo = tabela as MatriculaTabela;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tabela #{tabelaInfo.id}</h1>
        <p className="text-sm text-muted-foreground">
          {tabelaInfo.produto_tipo} — {tabelaInfo.referencia_tipo}:{tabelaInfo.referencia_id} — Ano: {tabelaInfo.ano_referencia ?? "-"}
        </p>
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
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Produto</label>
            <select name="produto_tipo" className="border rounded-md px-3 py-2 text-sm" defaultValue={tabelaInfo.produto_tipo}>
              <option value="REGULAR">REGULAR</option>
              <option value="CURSO_LIVRE">CURSO_LIVRE</option>
              <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Referencia</label>
            <select name="referencia_tipo" className="border rounded-md px-3 py-2 text-sm" defaultValue={tabelaInfo.referencia_tipo}>
              <option value="TURMA">TURMA</option>
              <option value="PRODUTO">PRODUTO</option>
              <option value="PROJETO">PROJETO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Referencia ID</label>
            <input
              name="referencia_id"
              type="number"
              className="border rounded-md px-3 py-2 text-sm"
              defaultValue={tabelaInfo.referencia_id}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <button className="rounded-md bg-black px-3 py-2 text-white text-sm" type="submit">
            Salvar tabela
          </button>
        </div>
      </form>

      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Itens</h2>
        </div>

        {itensErr ? <div className="text-sm text-red-700">Falha ao carregar itens: {itensErr.message}</div> : null}

        {listaItens.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum item cadastrado.</div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
              <div className="col-span-1">ID</div>
              <div className="col-span-2">Codigo</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-2">Valor</div>
              <div className="col-span-2">Ativo</div>
              <div className="col-span-2">Ordem</div>
              <div className="col-span-1 text-right">Acoes</div>
            </div>
            <div className="divide-y">
              {listaItens.map((item) => (
                <form key={item.id} action={updateItem} className="grid grid-cols-12 px-3 py-2 text-sm items-center gap-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <div className="col-span-1">{item.id}</div>
                  <div className="col-span-2">
                    <input name="codigo_item" className="border rounded-md px-2 py-1 text-sm w-full" defaultValue={item.codigo_item} />
                  </div>
                  <div className="col-span-2">
                    <select name="tipo_item" className="border rounded-md px-2 py-1 text-sm w-full" defaultValue={item.tipo_item}>
                      <option value="RECORRENTE">RECORRENTE</option>
                      <option value="UNICO">UNICO</option>
                      <option value="EVENTUAL">EVENTUAL</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      name="valor_centavos"
                      type="number"
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      defaultValue={item.valor_centavos}
                    />
                    <div className="text-[10px] text-muted-foreground">R$ {formatCentavos(item.valor_centavos)}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input name="ativo" type="checkbox" defaultChecked={item.ativo} />
                      {item.ativo ? "Sim" : "Nao"}
                    </label>
                  </div>
                  <div className="col-span-2">
                    <input name="ordem" type="number" className="border rounded-md px-2 py-1 text-sm w-full" defaultValue={item.ordem} />
                  </div>
                  <div className="col-span-1 flex justify-end gap-2">
                    <button className="underline" type="submit">
                      Salvar
                    </button>
                    <button className="text-red-600 underline" formAction={deleteItem} type="submit">
                      Remover
                    </button>
                  </div>
                  <div className="col-span-12">
                    <input
                      name="descricao"
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      defaultValue={item.descricao ?? ""}
                      placeholder="Descricao"
                    />
                  </div>
                </form>
              ))}
            </div>
          </div>
        )}

        <form action={addItem} className="mt-4 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3 grid gap-1">
            <label className="text-xs font-medium">Codigo</label>
            <input name="codigo_item" className="border rounded-md px-2 py-2 text-sm" placeholder="MENSALIDADE" />
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
            <label className="text-xs font-medium">Valor (centavos)</label>
            <input name="valor_centavos" type="number" className="border rounded-md px-2 py-2 text-sm" placeholder="25000" />
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
            <button className="rounded-md bg-black px-3 py-2 text-white text-sm" type="submit">
              Adicionar item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
