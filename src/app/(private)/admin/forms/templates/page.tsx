import Link from "next/link";
import { headers } from "next/headers";

type TemplateRow = {
  id: string;
  nome: string;
  status: "draft" | "published" | "archived";
  versao: number;
  updated_at: string;
};

function getBaseUrl() {
  const hdrs = headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  return envBase ?? (host ? `${proto}://${host}` : "");
}

async function fetchTemplates(): Promise<TemplateRow[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  const cookie = headers().get("cookie") ?? "";
  const res = await fetch(`${baseUrl}/api/admin/forms/templates`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { data?: TemplateRow[] };
  return json.data ?? [];
}

export default async function AdminFormsTemplatesPage() {
  const rows = await fetchTemplates();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Formularios (Templates)</h1>
        <Link className="px-3 py-2 rounded-lg border" href="/admin/forms/templates/new">
          Novo template
        </Link>
      </div>

      <div className="mt-4 rounded-xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium bg-white/50">
          <div className="col-span-5">Nome</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Versao</div>
          <div className="col-span-3">Atualizado</div>
          <div className="col-span-1">Acoes</div>
        </div>

        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t">
            <div className="col-span-5">{r.nome}</div>
            <div className="col-span-2">{r.status}</div>
            <div className="col-span-1">{r.versao}</div>
            <div className="col-span-3">
              {new Date(r.updated_at).toLocaleString("pt-BR")}
            </div>
            <div className="col-span-1">
              <Link className="underline" href={`/admin/forms/templates/${r.id}`}>
                Abrir
              </Link>
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="px-3 py-6 text-sm opacity-70">Nenhum template cadastrado.</div>
        ) : null}
      </div>
    </div>
  );
}
