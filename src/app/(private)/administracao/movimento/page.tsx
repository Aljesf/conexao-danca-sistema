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
  const data = (await res.json()) as T;
  return data;
}

export default async function MovimentoAdminPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const saldosResp = await fetchJson<{ ok: boolean; data: SaldoRow[] }>(
    `${baseUrl}/api/admin/movimento/saldos`
  ).catch(() => ({ ok: false, data: [] as SaldoRow[] }));

  const deficitResp = await fetchJson<{ ok: boolean; data: DeficitRow[] }>(
    `${baseUrl}/api/admin/movimento/deficit`
  ).catch(() => ({ ok: false, data: [] as DeficitRow[] }));

  const saldos = saldosResp.ok ? saldosResp.data : [];
  const deficits = deficitResp.ok ? deficitResp.data : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Movimento Conexao Danca</h1>
          <p className="text-sm text-muted-foreground">
            Visao geral do banco de creditos (saldo tecnico e deficit institucional).
          </p>
        </div>

        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/beneficiarios">
            Beneficiarios
          </Link>
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/creditos">
            Conceder creditos
          </Link>
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/lotes">
            Lotes
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="text-base font-medium mb-3">Saldo por competencia</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b">
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
                  <td className="py-3 text-muted-foreground" colSpan={6}>
                    Nenhum saldo disponivel (ou permissao/ambiente ainda nao configurados).
                  </td>
                </tr>
              ) : (
                saldos.map((r) => (
                  <tr key={`${r.competencia}-${r.tipo_credito}-${r.origem}`} className="border-b">
                    <td className="py-2 pr-4">{r.competencia}</td>
                    <td className="py-2 pr-4">{r.tipo_credito}</td>
                    <td className="py-2 pr-4">{r.origem}</td>
                    <td className="py-2 pr-4">{r.quantidade_total}</td>
                    <td className="py-2 pr-4">{r.quantidade_alocada}</td>
                    <td className="py-2 pr-4 font-medium">{r.saldo_disponivel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="text-base font-medium mb-3">
          Deficit institucional (creditos concedidos sem lote)
        </h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr className="border-b">
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Origem</th>
                <th className="py-2 pr-4">Creditos sem lote</th>
                <th className="py-2 pr-4">Quantidade sem lote</th>
              </tr>
            </thead>
            <tbody>
              {deficits.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={4}>
                    Nenhum registro de deficit (ou view ainda sem dados).
                  </td>
                </tr>
              ) : (
                deficits.map((d) => (
                  <tr key={`${d.tipo_credito}-${d.origem_credito}`} className="border-b">
                    <td className="py-2 pr-4">{d.tipo_credito}</td>
                    <td className="py-2 pr-4">{d.origem_credito}</td>
                    <td className="py-2 pr-4">{d.creditos_sem_lote ?? 0}</td>
                    <td className="py-2 pr-4 font-medium">{d.quantidade_sem_lote ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Observacao: deficit e leitura institucional (nao punitiva).
        </div>
      </section>
    </div>
  );
}
