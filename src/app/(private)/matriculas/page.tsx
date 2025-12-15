import { cookies } from "next/headers";
import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

type MatriculaRow = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number | null;
  tipo_matricula: string;
  vinculo_id: number | null;
  ano_referencia: number | null;
  data_matricula: string | null;
  status: string | null;
};

export const dynamic = "force-dynamic";

export default async function MatriculasPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data, error } = await supabase
    .from("matriculas")
    .select(
      "id, pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id, ano_referencia, data_matricula, status"
    )
    .order("id", { ascending: false })
    .limit(50);

  const matriculas = (data ?? []) as MatriculaRow[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
      {/* Cabeçalho */}
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Matrículas
          </h1>
          <p className="mt-1 text-sm md:text-base text-slate-500">
            Visão geral das matrículas registradas no sistema. Esta tela ainda
            está na versão inicial, focada em IDs — depois vamos enriquecer com
            nomes de pessoas, turmas e status mais amigáveis.
          </p>
        </div>

        <div className="flex md:justify-end">
          <Link
            href="/matriculas/novo"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            + Nova matrícula
          </Link>
        </div>
      </header>

      {/* Card com tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Últimas matrículas
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Exibindo até 50 registros mais recentes.
            </p>
          </div>

          {error && (
            <span className="text-xs text-rose-600">
              Erro ao carregar matrículas.
            </span>
          )}
        </div>

        {matriculas.length === 0 ? (
          <div className="px-4 md:px-6 py-6 md:py-8 text-sm text-slate-500">
            Nenhuma matrícula encontrada. Clique em{" "}
            <span className="font-semibold">“Nova matrícula”</span> para criar a
            primeira.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Pessoa
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Turma
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Ano
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Data matrícula
                  </th>
                  <th className="px-4 md:px-6 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {matriculas.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60"
                  >
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-900">
                      {m.id}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.pessoa_id}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.vinculo_id ?? "-"}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.tipo_matricula}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.ano_referencia ?? "-"}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.data_matricula ?? "-"}
                    </td>
                    <td className="px-4 md:px-6 py-2.5 align-middle text-xs text-slate-700">
                      {m.status ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
