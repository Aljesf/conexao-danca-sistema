import Link from "next/link";
import { headers } from "next/headers";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type TemplateRow = {
  id: string;
  nome: string;
  status: "draft" | "published" | "archived";
  versao: number;
  updated_at: string;
};

async function getBaseUrl() {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  return envBase ?? (host ? `${proto}://${host}` : "");
}

async function fetchTemplates(): Promise<TemplateRow[]> {
  const baseUrl = await getBaseUrl();
  if (!baseUrl) return [];

  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Formularios (Templates)"
        description="Crie templates e organize as perguntas do formulario."
        actions={
          <Link
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            href="/admin/forms/templates/new"
          >
            Novo template
          </Link>
        }
      />

      <SectionCard title="Templates cadastrados">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Nome</th>
                <th className="py-2 pr-3 text-left">Status</th>
                <th className="py-2 pr-3 text-left">Versao</th>
                <th className="py-2 pr-3 text-left">Atualizado</th>
                <th className="py-2 pr-3 text-left">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-3">{r.nome}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3">{r.versao}</td>
                  <td className="py-2 pr-3">
                    {new Date(r.updated_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-3">
                      <Link className="underline" href={`/admin/forms/templates/${r.id}`}>
                        Abrir
                      </Link>
                      <Link className="underline" href={`/admin/forms/templates/${r.id}/responses`}>
                        Respostas
                      </Link>
                      <Link className="underline" href={`/admin/forms/templates/${r.id}/analytics`}>
                        Analytics
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={5}>
                    Nenhum template cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
