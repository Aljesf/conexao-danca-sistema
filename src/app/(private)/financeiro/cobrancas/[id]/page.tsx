import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: { id: string };
};

type CobrancaDetalhe = {
  id: number;
  pessoa_id: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
  status: string | null;
  valor_centavos: number | null;
  vencimento: string | null;
  created_at: string | null;
};

export default async function CobrancaDetalhePage({ params }: PageProps) {
  const idNum = Number(params.id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  const supabase = await createClient();
  const { data: cobranca, error } = await supabase
    .from("cobrancas")
    .select("id,pessoa_id,origem_tipo,origem_id,status,valor_centavos,vencimento,created_at")
    .eq("id", idNum)
    .maybeSingle<CobrancaDetalhe>();

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Cobranca #{idNum}</h1>
        <p className="mt-2 text-sm text-rose-600">Erro ao carregar cobranca: {error.message}</p>
        <Link className="mt-4 inline-block underline" href="/financeiro/contas-a-receber">
          Voltar
        </Link>
      </div>
    );
  }

  if (!cobranca) return notFound();

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Cobranca #{cobranca.id}</h1>

      <div className="mt-4 rounded-xl border bg-white p-4">
        <div className="text-sm text-slate-600">Pessoa #{cobranca.pessoa_id ?? "-"}</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="text-sm">
            <span className="font-medium">Vencimento:</span> {cobranca.vencimento ?? "-"}
          </div>
          <div className="text-sm">
            <span className="font-medium">Status:</span> {cobranca.status ?? "-"}
          </div>
          <div className="text-sm">
            <span className="font-medium">Valor:</span>{" "}
            {(Number(cobranca.valor_centavos ?? 0) / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <div className="text-sm">
            <span className="font-medium">Origem:</span> {cobranca.origem_tipo ?? "-"}{" "}
            {cobranca.origem_id ? `#${cobranca.origem_id}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link className="underline" href="/financeiro/contas-a-receber">
          Voltar para Contas a Receber
        </Link>
      </div>
    </div>
  );
}
