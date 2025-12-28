type UnidadeExecucaoLabelInput = {
  unidadeExecucaoId?: number | null;
  origemTipo?: string | null;
  turmaId?: number | null;
  turmaNome?: string | null;
  unidadeDenominacao?: string | null;
  unidadeNome?: string | null;
};

function joinDenominacaoNome(denominacao?: string | null, nome?: string | null): string {
  const den = denominacao?.trim() || "";
  const nom = nome?.trim() || "";
  if (den && nom) return `${den}: ${nom}`;
  return den || nom || "-";
}

export function formatUnidadeExecucaoLabel(input: UnidadeExecucaoLabelInput): string {
  const origemTipo = input.origemTipo?.trim().toUpperCase() || "";
  const nomeBase =
    input.turmaNome?.trim() ||
    joinDenominacaoNome(input.unidadeDenominacao, input.unidadeNome);
  const ueId = input.unidadeExecucaoId ? `[UE: ${input.unidadeExecucaoId}]` : "[UE: -]";
  const turmaId = input.turmaId ? `[Turma: ${input.turmaId}]` : "[Turma: -]";

  if (origemTipo === "TURMA" || input.turmaId) {
    return `Turma: ${nomeBase} ${ueId} ${turmaId}`.trim();
  }

  return `Grupo/Coreografia: ${nomeBase} ${ueId}`.trim();
}
