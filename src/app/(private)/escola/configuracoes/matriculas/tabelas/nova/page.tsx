export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default function Page() {
  async function create(formData: FormData): Promise<void> {
    "use server";

    const supabase = await getSupabaseServer();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const produtoTipo = String(formData.get("produto_tipo") ?? "REGULAR").trim();
    const referenciaTipo = String(formData.get("referencia_tipo") ?? "TURMA").trim();
    const referenciaId = Number(formData.get("referencia_id") ?? 0);
    const anoRaw = String(formData.get("ano_referencia") ?? "").trim();
    const anoReferencia = anoRaw ? Number(anoRaw) : null;
    const ativo = formData.get("ativo") === "on";

    if (!titulo) throw new Error("Titulo e obrigatorio.");
    if (!Number.isFinite(referenciaId) || referenciaId <= 0) {
      throw new Error("referencia_id invalido.");
    }
    if (!['REGULAR','CURSO_LIVRE','PROJETO_ARTISTICO'].includes(produtoTipo)) {
      throw new Error("produto_tipo invalido.");
    }
    if (!['TURMA','PRODUTO','PROJETO'].includes(referenciaTipo)) {
      throw new Error("referencia_tipo invalido.");
    }
    if (produtoTipo === "REGULAR" && (anoReferencia === null || !Number.isFinite(anoReferencia))) {
      throw new Error("ano_referencia e obrigatorio para REGULAR.");
    }
    if (anoReferencia !== null && !Number.isFinite(anoReferencia)) {
      throw new Error("ano_referencia invalido.");
    }

    const { data, error } = await supabase
      .from("matricula_tabelas")
      .insert({
        titulo,
        produto_tipo: produtoTipo,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        ano_referencia: anoReferencia,
        ativo,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Falha ao criar tabela.");

    redirect(`/escola/configuracoes/matriculas/tabelas/${data.id}`);
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Nova tabela de matricula</h1>
        <p className="text-sm text-muted-foreground">Crie a tabela ativa por referencia e ano.</p>
      </div>

      <form action={create} className="space-y-4 rounded-md border p-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Titulo</label>
          <input
            name="titulo"
            className="border rounded-md px-3 py-2 text-sm"
            placeholder="Ex.: Ballet Turma 6 / 2026"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Produto</label>
            <select name="produto_tipo" className="border rounded-md px-3 py-2 text-sm" defaultValue="REGULAR">
              <option value="REGULAR">REGULAR</option>
              <option value="CURSO_LIVRE">CURSO_LIVRE</option>
              <option value="PROJETO_ARTISTICO">PROJETO_ARTISTICO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Referencia</label>
            <select name="referencia_tipo" className="border rounded-md px-3 py-2 text-sm" defaultValue="TURMA">
              <option value="TURMA">TURMA</option>
              <option value="PRODUTO">PRODUTO</option>
              <option value="PROJETO">PROJETO</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Referencia ID</label>
            <input name="referencia_id" type="number" className="border rounded-md px-3 py-2 text-sm" placeholder="Ex.: 6" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ano (REGULAR)</label>
            <input name="ano_referencia" type="number" className="border rounded-md px-3 py-2 text-sm" placeholder="Ex.: 2026" />
          </div>

          <label className="flex items-center gap-2 text-sm mt-7">
            <input name="ativo" type="checkbox" defaultChecked />
            Ativa
          </label>
        </div>

        <div className="flex justify-end">
          <button className="rounded-md bg-black px-3 py-2 text-white text-sm" type="submit">
            Criar tabela
          </button>
        </div>
      </form>
    </div>
  );
}
