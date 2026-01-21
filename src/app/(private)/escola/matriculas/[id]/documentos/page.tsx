import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { formatDateTimeISO } from "@/lib/formatters/date";
import EmitirDocumentosClient from "./EmitirDocumentosClient";

type DocumentoEmitidoRow = {
  id: number;
  matricula_id: number | null;
  contrato_modelo_id: number | null;
  status_assinatura: string | null;
  created_at: string | null;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: { emitir?: string };
}) {
  const { id } = await params;
  const matriculaId = Number(id);
  if (!Number.isFinite(matriculaId) || matriculaId <= 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Documentos da Matricula</h1>
        <p className="mt-2 text-sm text-muted-foreground">ID de matricula invalido.</p>
      </div>
    );
  }

  if (searchParams?.emitir === "1") {
    return <EmitirDocumentosClient matriculaId={matriculaId} />;
  }

  const supabase = await getSupabaseServer();
  const { data: emitidos, error } = await supabase
    .from("documentos_emitidos")
    .select("id, matricula_id, contrato_modelo_id, status_assinatura, created_at")
    .eq("matricula_id", matriculaId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Documentos da Matricula</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Erro ao carregar documentos emitidos: {error.message}
        </p>
      </div>
    );
  }

  const lista = (emitidos ?? []) as DocumentoEmitidoRow[];
  const emitirDocs = `/escola/matriculas/${matriculaId}/documentos?emitir=1`;

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Documentos da Matricula #{matriculaId}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emissao, reprocessamento e acesso rapido aos documentos emitidos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/escola/matriculas/${matriculaId}`}
            className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:underline"
          >
            Voltar
          </Link>
          <Link
            href={emitirDocs}
            className="rounded-md border border-slate-800 px-3 py-2 text-sm font-medium"
          >
            Emitir novo documento
          </Link>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Documentos emitidos</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum documento emitido encontrado para esta matricula.
          </p>
        ) : (
          <div className="grid gap-3">
            {lista.map((doc) => {
              const modeloId = doc.contrato_modelo_id ?? null;
              return (
                <Link
                  key={doc.id}
                  href={`/admin/config/documentos/emitidos/${doc.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold">Documento #{doc.id}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Status: {doc.status_assinatura ?? "-"} | Modelo: {modeloId ?? "-"} | Criado em:{" "}
                    {doc.created_at ? formatDateTimeISO(doc.created_at) : "-"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
