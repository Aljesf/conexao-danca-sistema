import Link from "next/link";

type SaldoRow = {
  competencia: string;
  tipo_credito: "CR_REGULAR" | "CR_LIVRE" | "CR_PROJETO";
  origem: "INSTITUCIONAL_AUTOMATICA" | "EXTERNA";
  quantidade_total: number;
  quantidade_alocada: number;
  saldo_disponivel: number;
};

type DeficitRow = {
  tipo_credito: string;
  origem_credito: string;
  creditos_sem_lote: number | null;
  quantidade_sem_lote: number | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as T;
}

export default async function MovimentoAdminPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const saldosResp = await fetchJson<{ ok: boolean; data: SaldoRow[] }>(
    `${baseUrl}/api/admin/movimento/saldos`,
  ).catch(() => ({ ok: false, data: [] as SaldoRow[] }));

  const deficitResp = await fetchJson<{ ok: boolean; data: DeficitRow[] }>(
    `${baseUrl}/api/admin/movimento/deficit`,
  ).catch(() => ({ ok: false, data: [] as DeficitRow[] }));

  const saldos = saldosResp.ok ? saldosResp.data : [];
  const deficits = deficitResp.ok ? deficitResp.data : [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Movimento Conexao Danca</h1>
              <p className="text-sm text-slate-600">
                Visao geral do banco de creditos: saldo tecnico, alocacao e deficit institucional.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/admin/movimento/beneficiarios"
                className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Beneficiarios
              </Link>
              <Link
                href="/admin/movimento/creditos"
                className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Conceder creditos
              </Link>
              <Link
                href="/admin/movimento/lotes"
                className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Lotes
              </Link>
              <Link
                href="/admin/movimento/saldos"
                className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Saldos
              </Link>
              <Link
                href="/admin/movimento/deficit"
                className="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Deficit
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Saldo por competencia</h2>
              <p className="text-sm text-slate-600">
                Disponivel por competencia/tipo/origem (pool institucional).
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4">Competencia</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Alocado</th>
                  <th className="py-2 pr-4">Disponivel</th>
                </tr>
              </thead>
              <tbody>
                {saldos.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={6}>
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        Sem saldos no momento. Quando o motor mensal gerar lotes (ou houver fonte externa confirmada),
                        os valores aparecerao aqui.
                      </div>
                    </td>
                  </tr>
                ) : (
                  saldos.map((r) => (
                    <tr key={`${r.competencia}-${r.tipo_credito}-${r.origem}`} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{r.competencia}</td>
                      <td className="py-2 pr-4">{r.tipo_credito}</td>
                      <td className="py-2 pr-4">{r.origem}</td>
                      <td className="py-2 pr-4">{r.quantidade_total}</td>
                      <td className="py-2 pr-4">{r.quantidade_alocada}</td>
                      <td className="py-2 pr-4 font-semibold text-slate-900">{r.saldo_disponivel}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Deficit institucional</h2>
            <p className="text-sm text-slate-600">
              Creditos concedidos sem lastro em lote (leitura institucional, nao punitiva).
            </p>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4">Creditos sem lote</th>
                  <th className="py-2 pr-4">Quantidade sem lote</th>
                </tr>
              </thead>
              <tbody>
                {deficits.length === 0 ? (
                  <tr>
                    <td className="py-3" colSpan={4}>
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Sem deficit registrado. Ao conceder creditos sem lote (permitir deficit), os indicadores
                        aparecerao aqui.
                      </div>
                    </td>
                  </tr>
                ) : (
                  deficits.map((d) => (
                    <tr key={`${d.tipo_credito}-${d.origem_credito}`} className="border-b border-slate-100">
                      <td className="py-2 pr-4">{d.tipo_credito}</td>
                      <td className="py-2 pr-4">{d.origem_credito}</td>
                      <td className="py-2 pr-4">{d.creditos_sem_lote ?? 0}</td>
                      <td className="py-2 pr-4 font-semibold text-slate-900">{d.quantidade_sem_lote ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
