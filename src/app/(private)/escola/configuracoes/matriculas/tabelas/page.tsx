export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";

type MatriculaTabela = {
  id: number;
  produto_tipo: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  referencia_tipo: "TURMA" | "PRODUTO" | "PROJETO";
  referencia_id: number;
  ano_referencia: number | null;
  titulo: string;
  ativo: boolean;
  created_at: string;
};

export default async function Page() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("matricula_tabelas")
    .select("id,produto_tipo,referencia_tipo,referencia_id,ano_referencia,titulo,ativo,created_at")
    .order("ativo", { ascending: false })
    .order("created_at", { ascending: false });

  const tabelas = (data ?? []) as MatriculaTabela[];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tabelas de matricula</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre a tabela ativa por turma e ano. A matricula depende disso para calcular mensalidade e pro-rata.
          </p>
        </div>

        <Link
          href="/escola/configuracoes/matriculas/tabelas/nova"
          className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Nova tabela
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Falha ao carregar tabelas: {error.message}
        </div>
      ) : null}

      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Titulo</div>
          <div className="col-span-2">Produto</div>
          <div className="col-span-2">Referencia</div>
          <div className="col-span-2">Ano</div>
          <div className="col-span-1">Ativa</div>
          <div className="col-span-1 text-right">Acoes</div>
        </div>

        {tabelas.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhuma tabela cadastrada.</div>
        ) : (
          <div className="divide-y">
            {tabelas.map((t) => (
              <div key={t.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                <div className="col-span-1">{t.id}</div>
                <div className="col-span-3">{t.titulo}</div>
                <div className="col-span-2">{t.produto_tipo}</div>
                <div className="col-span-2">
                  {t.referencia_tipo}:{t.referencia_id}
                </div>
                <div className="col-span-2">{t.ano_referencia ?? "-"}</div>
                <div className="col-span-1">{t.ativo ? "Sim" : "Nao"}</div>
                <div className="col-span-1 text-right">
                  <Link className="underline" href={`/escola/configuracoes/matriculas/tabelas/${t.id}`}>
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
