import { redirect } from "next/navigation";

export default async function Page(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  redirect(`/admin/financeiro/credito-conexao/faturas/${id}`);
}
