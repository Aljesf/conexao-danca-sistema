export type MigracaoContaInternaStatus =
  | "PENDENTE"
  | "MIGRADO"
  | "MANTER_DIRETO"
  | "AMBIGUO"
  | "IGNORAR";

export type BadgeTone = "success" | "warning" | "neutral";

export interface CanonicalOriginInput {
  origemAgrupadorTipo?: string | null;
  origemAgrupadorId?: number | null;
  origemItemTipo?: string | null;
  origemItemId?: number | null;
  contaInternaId?: number | null;
  alunoNome?: string | null;
  matriculaId?: number | null;
  origemLabel?: string | null;
  migracaoContaInternaStatus?: string | null;
  legacyOrigemTipo?: string | null;
  legacyOrigemSubtipo?: string | null;
  legacyOrigemId?: number | null;
  legacyDescricao?: string | null;
  legacyLabel?: string | null;
}

export interface CanonicalOriginDisplay {
  principal: string;
  secondary: string | null;
  technical: string | null;
  badgeLabel: string | null;
  badgeTone: BadgeTone;
  origemLabel: string;
  origemAgrupadorTipo: string | null;
  origemItemTipo: string | null;
  contaInternaId: number | null;
  alunoNome: string | null;
  matriculaId: number | null;
  migracaoContaInternaStatus: string | null;
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function upper(value: unknown): string {
  return textOrNull(value)?.toUpperCase() ?? "";
}

function isTechnicalLabel(value: string | null): boolean {
  if (!value) return false;
  return /^[A-Z0-9_]+(\s+[A-Z0-9_]+)*\s+#\d+$/.test(value.trim());
}

function buildTechnicalLabel(origemTipo: string | null, origemId: number | null | undefined): string | null {
  const tipo = textOrNull(origemTipo);
  if (!tipo) return null;
  if (typeof origemId === "number" && Number.isFinite(origemId) && origemId > 0) {
    return `${tipo} #${origemId}`;
  }
  return tipo;
}

function normalizeItemType(value: string | null | undefined, fallback: CanonicalOriginInput): string {
  const itemType = upper(value);
  if (itemType) return itemType;

  const legacyOrigemTipo = upper(fallback.legacyOrigemTipo);
  const legacySubtipo = upper(fallback.legacyOrigemSubtipo);
  const descricao = upper(fallback.legacyDescricao);

  if (legacyOrigemTipo.startsWith("MATRICULA")) {
    if (descricao.includes("PRO-RATA") || descricao.includes("PRO RATA") || descricao.includes("ENTRADA")) {
      return "PRO_RATA";
    }
    if (legacySubtipo === "CARTAO_CONEXAO") return "MATRICULA";
    return "MATRICULA";
  }

  if (legacyOrigemTipo.includes("FATURA")) return "MENSALIDADE";
  if (legacyOrigemTipo === "CAFE") return "CAFE";
  if (legacyOrigemTipo === "LOJA" || legacyOrigemTipo === "LOJA_VENDA") return "LOJA";
  if (legacyOrigemTipo === "AJUSTE") return "AJUSTE";
  return "OUTRO";
}

function itemLabel(itemType: string): string | null {
  switch (itemType) {
    case "MATRICULA":
      return "Matricula";
    case "MENSALIDADE":
      return "Mensalidade";
    case "CURSO":
      return "Curso";
    case "CAFE":
      return "Cafe";
    case "LOJA":
      return "Loja";
    case "AJUSTE":
      return "Ajuste";
    case "PRO_RATA":
      return "Pro-rata";
    default:
      return null;
  }
}

function migrationBadge(
  status: string | null | undefined,
): Pick<CanonicalOriginDisplay, "badgeLabel" | "badgeTone"> {
  switch (upper(status)) {
    case "MIGRADO":
      return { badgeLabel: "Migrado", badgeTone: "success" };
    case "MANTER_DIRETO":
      return { badgeLabel: "Direto", badgeTone: "neutral" };
    case "AMBIGUO":
    case "PENDENTE":
      return { badgeLabel: "Em revisao", badgeTone: "warning" };
    default:
      return { badgeLabel: null, badgeTone: "neutral" };
  }
}

function cleanedHumanLabel(value: string | null): string | null {
  const label = textOrNull(value);
  if (!label || isTechnicalLabel(label)) return null;
  return label;
}

function isContaInterna(input: CanonicalOriginInput): boolean {
  const agrupador = upper(input.origemAgrupadorTipo);
  const legacyOrigemTipo = upper(input.legacyOrigemTipo);
  const legacySubtipo = upper(input.legacyOrigemSubtipo);

  if (agrupador === "CONTA_INTERNA") return true;
  if (typeof input.contaInternaId === "number" && input.contaInternaId > 0) return true;
  if (legacyOrigemTipo.includes("FATURA")) return true;
  if (legacyOrigemTipo.startsWith("MATRICULA") && legacySubtipo === "CARTAO_CONEXAO") return true;
  if (legacyOrigemTipo === "CAFE" && (legacySubtipo.includes("CONEXAO") || legacySubtipo.includes("CONTA_INTERNA"))) {
    return true;
  }
  if ((legacyOrigemTipo === "LOJA" || legacyOrigemTipo === "LOJA_VENDA") && legacySubtipo.includes("CONEXAO")) {
    return true;
  }
  return false;
}

function contaInternaLabel(input: CanonicalOriginInput): string {
  const legacySubtipo = upper(input.legacyOrigemSubtipo);
  if (legacySubtipo === "CONTA_INTERNA_COLABORADOR" || legacySubtipo === "CARTAO_CONEXAO_COLABORADOR") {
    return "Conta interna do colaborador";
  }
  return "Conta interna do aluno";
}

function directPrincipal(input: CanonicalOriginInput, itemType: string): string | null {
  const agrupador = upper(input.origemAgrupadorTipo);
  if (agrupador !== "VENDA_DIRETA" && agrupador !== "AJUSTE") return null;

  if (itemType === "LOJA") return "Cobranca direta - Loja";
  if (itemType === "CAFE") return "Cobranca direta - Cafe";
  if (itemType === "PRO_RATA") return "Entrada / Pro-rata";
  if (itemType === "AJUSTE") return "Ajuste direto";
  return agrupador === "AJUSTE" ? "Ajuste direto" : "Cobranca direta";
}

export function buildCanonicalOriginDisplay(input: CanonicalOriginInput): CanonicalOriginDisplay {
  try {
    const agrupadorTipo =
      textOrNull(input.origemAgrupadorTipo) ??
      (isContaInterna(input) ? "CONTA_INTERNA" : null);
    const itemType = normalizeItemType(input.origemItemTipo, input);
    const contaInternaId =
      typeof input.contaInternaId === "number" && Number.isFinite(input.contaInternaId) && input.contaInternaId > 0
        ? input.contaInternaId
        : null;
    const alunoNome = cleanedHumanLabel(input.alunoNome ?? null);
    const matriculaId =
      typeof input.matriculaId === "number" && Number.isFinite(input.matriculaId) && input.matriculaId > 0
        ? input.matriculaId
        : null;
    const migracaoContaInternaStatus = textOrNull(input.migracaoContaInternaStatus) ?? "AMBIGUO";
    const badge = migrationBadge(migracaoContaInternaStatus);
    const item = itemLabel(itemType);
    const technical = buildTechnicalLabel(input.legacyOrigemTipo ?? null, input.legacyOrigemId ?? null);
    const humanLabel =
      cleanedHumanLabel(input.origemLabel ?? null) ??
      cleanedHumanLabel(input.legacyLabel ?? null) ??
      cleanedHumanLabel(input.legacyDescricao ?? null);

    if (isContaInterna(input)) {
      const principal = contaInternaLabel(input);
      return {
        principal,
        secondary: item ? `Lancamento: ${item}` : humanLabel,
        technical,
        badgeLabel: badge.badgeLabel,
        badgeTone: badge.badgeTone,
        origemLabel: principal,
        origemAgrupadorTipo: agrupadorTipo,
        origemItemTipo: itemType,
        contaInternaId,
        alunoNome,
        matriculaId,
        migracaoContaInternaStatus,
      };
    }

    const direct = directPrincipal(input, itemType);
    if (direct) {
      return {
        principal: direct,
        secondary: humanLabel && humanLabel !== direct ? humanLabel : null,
        technical,
        badgeLabel: badge.badgeLabel,
        badgeTone: badge.badgeTone,
        origemLabel: direct,
        origemAgrupadorTipo: textOrNull(input.origemAgrupadorTipo),
        origemItemTipo: itemType,
        contaInternaId,
        alunoNome,
        matriculaId,
        migracaoContaInternaStatus,
      };
    }

    if (humanLabel) {
      return {
        principal: humanLabel,
        secondary: item && !humanLabel.toLowerCase().includes(item.toLowerCase()) ? `Lancamento: ${item}` : null,
        technical,
        badgeLabel: badge.badgeLabel,
        badgeTone: badge.badgeTone,
        origemLabel: humanLabel,
        origemAgrupadorTipo: textOrNull(input.origemAgrupadorTipo),
        origemItemTipo: itemType,
        contaInternaId,
        alunoNome,
        matriculaId,
        migracaoContaInternaStatus,
      };
    }

    return {
      principal: "Origem em revisao",
      secondary: item ? `Lancamento: ${item}` : null,
      technical,
      badgeLabel: badge.badgeLabel ?? "Em revisao",
      badgeTone: badge.badgeLabel ? badge.badgeTone : "warning",
      origemLabel: "Origem em revisao",
      origemAgrupadorTipo: textOrNull(input.origemAgrupadorTipo),
      origemItemTipo: itemType,
      contaInternaId,
      alunoNome,
      matriculaId,
      migracaoContaInternaStatus,
    };
  } catch {
    return {
      principal: "Origem em revisao",
      secondary: null,
      technical: buildTechnicalLabel(input.legacyOrigemTipo ?? null, input.legacyOrigemId ?? null),
      badgeLabel: "Em revisao",
      badgeTone: "warning",
      origemLabel: "Origem em revisao",
      origemAgrupadorTipo: textOrNull(input.origemAgrupadorTipo),
      origemItemTipo: textOrNull(input.origemItemTipo) ?? "OUTRO",
      contaInternaId:
        typeof input.contaInternaId === "number" && Number.isFinite(input.contaInternaId) && input.contaInternaId > 0
          ? input.contaInternaId
          : null,
      alunoNome: cleanedHumanLabel(input.alunoNome ?? null),
      matriculaId:
        typeof input.matriculaId === "number" && Number.isFinite(input.matriculaId) && input.matriculaId > 0
          ? input.matriculaId
          : null,
      migracaoContaInternaStatus: "AMBIGUO",
    };
  }
}
