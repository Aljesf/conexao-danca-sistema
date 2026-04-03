import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolverContaInternaDoAlunoOuResponsavel,
  resolverContaInternaDoColaborador,
} from "@/lib/financeiro/conta-interna";

type SupabaseLike = Pick<SupabaseClient, "from">;

export type TipoQuitacaoPessoaContaInterna =
  | "PAGAMENTO_IMEDIATO"
  | "PAGAMENTO_PARCIAL"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR";

export type PessoaContaInternaElegibilidade = {
  pessoaId: number;
  possuiContaInternaAluno: boolean;
  possuiContaInternaColaborador: boolean;
  contaInternaAlunoId: number | null;
  contaInternaColaboradorId: number | null;
  tiposQuitacaoPermitidos: TipoQuitacaoPessoaContaInterna[];
};

export async function resolverElegibilidadeContaInterna(
  supabase: SupabaseLike,
  pessoaId: number,
): Promise<PessoaContaInternaElegibilidade> {
  const [contaAluno, contaColaborador] = await Promise.all([
    resolverContaInternaDoAlunoOuResponsavel({
      supabase,
      alunoPessoaId: pessoaId,
    }),
    resolverContaInternaDoColaborador({
      supabase,
      colaboradorPessoaId: pessoaId,
    }),
  ]);

  const possuiContaInternaAluno = Boolean(contaAluno.elegivel && contaAluno.conta_id);
  const possuiContaInternaColaborador = Boolean(
    contaColaborador.elegivel && contaColaborador.conta_id,
  );

  const tiposQuitacaoPermitidos: TipoQuitacaoPessoaContaInterna[] = [
    "PAGAMENTO_IMEDIATO",
    "PAGAMENTO_PARCIAL",
  ];

  if (possuiContaInternaAluno) {
    tiposQuitacaoPermitidos.push("CONTA_INTERNA_ALUNO");
  }

  if (possuiContaInternaColaborador) {
    tiposQuitacaoPermitidos.push("CONTA_INTERNA_COLABORADOR");
  }

  return {
    pessoaId,
    possuiContaInternaAluno,
    possuiContaInternaColaborador,
    contaInternaAlunoId: contaAluno.conta_id ?? null,
    contaInternaColaboradorId: contaColaborador.conta_id ?? null,
    tiposQuitacaoPermitidos,
  };
}
