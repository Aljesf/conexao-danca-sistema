export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

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

export default async function Page() {
  const supabase = getSupabaseAdmin();

  const [{ data: tabelasData, error: tabelasErr }, { data: turmasData }] = await Promise.all([
    supabase
      .from("matricula_tabelas")
      .select("id,produto_tipo,referencia_tipo,referencia_id,ano_referencia,titulo,ativo,created_at")
      .order("ativo", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("turmas")
      .select("turma_id,nome,curso,nivel,turno,dias_semana,ano_referencia")
      .order("turma_id", { ascending: false }),
  ]);

  const tabelas = (tabelasData ?? []) as MatriculaTabela[];
  const turmas = (turmasData ?? []) as Turma[];
  const turmaById = new Map<number, Turma>(turmas.map((t) => [t.turma_id, t]));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tabelas de matricula</h1>
          <p className="text-sm text-muted-foreground">
            Aqui voce configura o preco oficial por turma/ano. Sem uma tabela ativa com <b>MENSALIDADE / RECORRENTE</b>,
            a matricula falha com 409.
          </p>
        </div>

        <Link
          href="/admin/escola/configuracoes/matriculas/tabelas/nova"
          className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Nova tabela
        </Link>
      </div>

      {tabelasErr ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Falha ao carregar tabelas: {tabelasErr.message}
        </div>
      ) : null}

      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Titulo</div>
          <div className="col-span-2">Produto</div>
          <div className="col-span-4">Turma</div>
          <div className="col-span-1">Ativa</div>
          <div className="col-span-1 text-right">Acoes</div>
        </div>

        {tabelas.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhuma tabela cadastrada.</div>
        ) : (
          <div className="divide-y">
            {tabelas.map((t) => {
              const turma = turmaById.get(t.referencia_id);
              return (
                <div key={t.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                  <div className="col-span-1">{t.id}</div>
                  <div className="col-span-3">{t.titulo}</div>
                  <div className="col-span-2">{t.produto_tipo}</div>
                  <div className="col-span-4">{turma ? turmaLabel(turma) : `TURMA:${t.referencia_id}`}</div>
                  <div className="col-span-1">{t.ativo ? "Sim" : "Nao"}</div>
                  <div className="col-span-1 text-right">
                    <Link className="underline" href={`/admin/escola/configuracoes/matriculas/tabelas/${t.id}`}>
                      Abrir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Nota: no modelo atual, cada tabela se refere a 1 turma/ano. Para compartilhar uma tabela entre turmas, sera
        necessario um relacionamento dedicado no banco.
      </div>
    </div>
  );
}
