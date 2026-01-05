"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Origem =
  | "ALUNO"
  | "RESPONSAVEL_FINANCEIRO"
  | "MATRICULA"
  | "TURMA"
  | "ESCOLA"
  | "FINANCEIRO"
  | "MANUAL";
type Tipo = "TEXTO" | "MONETARIO" | "DATA";

type DocumentoVariavel = {
  id: number;
  codigo: string;
  descricao: string;
  origem: Origem;
  tipo: Tipo;
  path_origem: string | null;
  formato: string | null;
  ativo: boolean;
  root_table: string | null;
  root_pk_column: string | null;
  join_path: JoinEdge[] | null;
  target_table: string | null;
  target_column: string | null;
  display_label: string | null;
  path_labels: PathLabels | null;
  ai_gerada?: boolean;
  mapeamento_pendente?: boolean;
};

type JoinEdge = {
  direction?: JoinDirection;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
};

type JoinDirection = "IN" | "OUT" | "IN_GUESS" | "OUT_GUESS";

type SchemaRoot = {
  key: string;
  label: string;
  pk: string;
};

type SchemaAdj = {
  direction: JoinDirection;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
};

type SchemaColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

type PathLabels = {
  root_label?: string;
  hop1_label?: string;
  hop2_label?: string;
  hop3_label?: string;
  target_label?: string;
};

type ColecaoItem = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ativo: boolean;
};

const ORIGEM_LABELS: Record<Origem, string> = {
  ALUNO: "Aluno (dados da pessoa)",
  RESPONSAVEL_FINANCEIRO: "Responsavel financeiro",
  MATRICULA: "Matricula",
  TURMA: "Turma / Curso",
  ESCOLA: "Escola / Instituicao",
  FINANCEIRO: "Snapshot financeiro",
  MANUAL: "Digitado manualmente",
};

const ORIGEM_HINTS: Record<Origem, string> = {
  ALUNO: "Use o wizard para navegar a partir de matriculas ate a coluna desejada.",
  RESPONSAVEL_FINANCEIRO: "Use o wizard para navegar a partir de matriculas ate a coluna desejada.",
  MATRICULA: "Selecione diretamente colunas de matriculas.",
  TURMA: "Use o wizard para navegar a partir de matriculas ate turmas.",
  ESCOLA: "Use o wizard para navegar a partir de matriculas ate a tabela da escola.",
  FINANCEIRO: "Use o wizard para navegar ou mantenha via snapshot financeiro.",
  MANUAL: "Nao precisa de join; sera preenchido na emissao.",
};

const TIPOS: Tipo[] = ["TEXTO", "MONETARIO", "DATA"];
const MAX_HOPS = 3;

const isInDirection = (direction?: JoinDirection) =>
  direction === "IN" || direction === "IN_GUESS";

const getNextTable = (edge: { direction?: JoinDirection; from_table: string; to_table: string }) =>
  isInDirection(edge.direction) ? edge.from_table : edge.to_table;

const getNextColumn = (edge: { direction?: JoinDirection; from_column: string; to_column: string }) =>
  isInDirection(edge.direction) ? edge.from_column : edge.to_column;

const humanizeLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join(" ");

const getRootLabel = (root: SchemaRoot | undefined, fallbackKey: string) => {
  const labelRaw = root?.label ?? fallbackKey;
  if (!labelRaw) return "";
  const trimmed = labelRaw.split("(")[0].trim();
  if (!trimmed) return "";
  if (fallbackKey && trimmed.toLowerCase() === fallbackKey.toLowerCase()) {
    return humanizeLabel(trimmed);
  }
  return trimmed;
};

const normalizePathLabels = (raw: unknown): PathLabels => {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  return {
    root_label: typeof rec.root_label === "string" ? rec.root_label : undefined,
    hop1_label: typeof rec.hop1_label === "string" ? rec.hop1_label : undefined,
    hop2_label: typeof rec.hop2_label === "string" ? rec.hop2_label : undefined,
    hop3_label: typeof rec.hop3_label === "string" ? rec.hop3_label : undefined,
    target_label: typeof rec.target_label === "string" ? rec.target_label : undefined,
  };
};

export default function AdminDocumentosVariaveisPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<DocumentoVariavel[]>([]);
  const [roots, setRoots] = useState<SchemaRoot[]>([]);
  const [rootsLoading, setRootsLoading] = useState(true);
  const [adjCache, setAdjCache] = useState<Record<string, SchemaAdj[]>>({});
  const [columns, setColumns] = useState<SchemaColumn[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [mostrarPendentes, setMostrarPendentes] = useState(false);
  const [colecoes, setColecoes] = useState<ColecaoItem[]>([]);
  const [colecoesLoading, setColecoesLoading] = useState(false);
  const [colecoesErro, setColecoesErro] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [displayLabelTouched, setDisplayLabelTouched] = useState(false);
  const [origem, setOrigem] = useState<Origem>("MATRICULA");
  const [origemJoin, setOrigemJoin] = useState<Origem>("MATRICULA");
  const [tipo, setTipo] = useState<Tipo>("TEXTO");
  const [formato, setFormato] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [rootTable, setRootTable] = useState("matriculas");
  const [rootPkColumn, setRootPkColumn] = useState("id");
  const [joinPath, setJoinPath] = useState<JoinEdge[]>([]);
  const [hopLabels, setHopLabels] = useState<string[]>(["", "", ""]);
  const [targetColumn, setTargetColumn] = useState("");
  const [mapeamentoPendente, setMapeamentoPendente] = useState(false);
  const [aiGerada, setAiGerada] = useState(false);

  const precisaJoin = origem !== "MANUAL";
  const origemHint = ORIGEM_HINTS[origem];

  const opcoesFormato = useMemo(() => {
    if (tipo === "MONETARIO") return ["BRL"];
    if (tipo === "DATA") return ["DATA_CURTA"];
    return [];
  }, [tipo]);

  const rootLabel = useMemo(() => {
    const selected = roots.find((r) => r.key === rootTable);
    return getRootLabel(selected, rootTable);
  }, [roots, rootTable]);

  const getDefaultHopLabel = (edge: SchemaAdj | JoinEdge) => {
    const nextTable = getNextTable(edge);
    return nextTable ? humanizeLabel(nextTable) : "";
  };

  const tablesPath = useMemo(() => {
    const tables = [rootTable];
    for (const edge of joinPath) {
      tables.push(getNextTable(edge) || "");
    }
    return tables;
  }, [rootTable, joinPath]);

  const targetTable = tablesPath[tablesPath.length - 1] || rootTable;

  const edgeKey = (edge: SchemaAdj | JoinEdge) => {
    const direction = edge.direction ?? "OUT";
    return `${direction}:${edge.from_table}.${edge.from_column}->${edge.to_table}.${edge.to_column}`;
  };

  const hopTables = useMemo(
    () => [tablesPath[0] ?? "", tablesPath[1] ?? "", tablesPath[2] ?? ""],
    [tablesPath],
  );

  const humanPathLabel = useMemo(() => {
    if (!precisaJoin) return "";
    const parts: string[] = [];
    if (rootLabel) parts.push(rootLabel);
    joinPath.forEach((edge, index) => {
      const override = hopLabels[index]?.trim() ?? "";
      const label = override || getDefaultHopLabel(edge);
      if (label) parts.push(label);
    });
    if (targetColumn) parts.push(targetColumn);
    return parts.join(" -> ");
  }, [precisaJoin, rootLabel, joinPath, hopLabels, targetColumn]);

  const technicalPathLabel = useMemo(() => {
    if (!precisaJoin) return "";
    const parts: string[] = [];
    if (rootTable && rootPkColumn) parts.push(`${rootTable}.${rootPkColumn}`);
    joinPath.forEach((edge) => {
      const nextTable = getNextTable(edge);
      const nextColumn = getNextColumn(edge);
      if (nextTable && nextColumn) parts.push(`${nextTable}.${nextColumn}`);
    });
    if (targetTable && targetColumn) parts.push(`${targetTable}.${targetColumn}`);
    return parts.join(" -> ");
  }, [precisaJoin, rootTable, rootPkColumn, joinPath, targetTable, targetColumn]);

  const displayLabelValue = displayLabelTouched ? displayLabel : humanPathLabel;

  const isJoinEdge = (edge: unknown): edge is JoinEdge => {
    if (!edge || typeof edge !== "object") return false;
    const rec = edge as Record<string, unknown>;
    const directionOk =
      typeof rec.direction === "undefined" ||
      (typeof rec.direction === "string" &&
        ["IN", "OUT", "IN_GUESS", "OUT_GUESS"].includes(rec.direction));
    return (
      directionOk &&
      typeof rec.from_table === "string" &&
      typeof rec.from_column === "string" &&
      typeof rec.to_table === "string" &&
      typeof rec.to_column === "string"
    );
  };

  const carregarRoots = useCallback(async () => {
    setRootsLoading(true);
    try {
      const res = await fetch("/api/documentos/schema/roots");
      const json = (await res.json()) as { ok?: boolean; data?: SchemaRoot[]; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao carregar roots.");
      const list = json.data ?? [];
      setRoots(list);
      if (list.length > 0) {
        const current = list.find((r) => r.key === rootTable) ?? list[0];
        setRootTable(current.key);
        setRootPkColumn(current.pk || "id");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar roots.");
    } finally {
      setRootsLoading(false);
    }
  }, [rootTable]);

  const carregarAdj = useCallback(
    async (table: string) => {
      if (!table || adjCache[table]) return;
      try {
        const res = await fetch(`/api/documentos/schema/adj?table=${encodeURIComponent(table)}`);
        const json = (await res.json()) as { ok?: boolean; data?: SchemaAdj[]; message?: string };
        if (!res.ok || !json.ok) {
          throw new Error(json.message ?? "Falha ao carregar adjacencias.");
        }
        setAdjCache((prev) => ({ ...prev, [table]: json.data ?? [] }));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar adjacencias.");
      }
    },
    [adjCache],
  );

  const carregarColumns = useCallback(async (table: string) => {
    if (!table) return;
    setColumnsLoading(true);
    try {
      const res = await fetch(`/api/documentos/schema/columns?table=${encodeURIComponent(table)}`);
      const json = (await res.json()) as { ok?: boolean; data?: SchemaColumn[]; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Falha ao carregar colunas.");
      }
      setColumns(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar colunas.");
    } finally {
      setColumnsLoading(false);
    }
  }, []);

  const handleRootChange = (value: string) => {
    const selected = roots.find((r) => r.key === value);
    const nextTable = selected?.key ?? value;
    setRootTable(nextTable);
    setRootPkColumn(selected?.pk ?? "id");
    setJoinPath([]);
    setHopLabels(["", "", ""]);
    setTargetColumn("");
  };

  const handleHopChange = (index: number, value: string) => {
    const table = hopTables[index];
    if (!table) return;
    if (!value) {
      setJoinPath((prev) => prev.slice(0, index));
      setHopLabels((prev) => {
        const next = prev.slice(0, index);
        while (next.length < MAX_HOPS) next.push("");
        return next;
      });
      setTargetColumn("");
      return;
    }
    const options = adjCache[table] ?? [];
    const selected = options.find((edge) => edgeKey(edge) === value);
    if (!selected) return;
    setJoinPath((prev) => {
      const next = prev.slice(0, index);
      next[index] = selected;
      return next;
    });
    setHopLabels((prev) => {
      const next = prev.slice(0, index);
      next[index] = getDefaultHopLabel(selected);
      while (next.length < MAX_HOPS) next.push("");
      return next;
    });
    setTargetColumn("");
  };

  const handleHopLabelChange = (index: number, value: string) => {
    setHopLabels((prev) => {
      const next = prev.slice(0);
      next[index] = value;
      return next;
    });
  };

  const handleDisplayLabelChange = (value: string) => {
    if (!value.trim()) {
      setDisplayLabel("");
      setDisplayLabelTouched(false);
      return;
    }
    setDisplayLabel(value);
    setDisplayLabelTouched(true);
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/variaveis");
      const json = (await res.json()) as { data?: DocumentoVariavel[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar variaveis.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarColecoes = useCallback(async () => {
    setColecoesLoading(true);
    setColecoesErro(null);
    try {
      const res = await fetch("/api/documentos/colecoes", { cache: "no-store" });
      const json = (await res.json()) as { data?: ColecaoItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar colecoes.");
      setColecoes(json.data ?? []);
    } catch (e) {
      setColecoesErro(e instanceof Error ? e.message : "Erro ao carregar colecoes.");
    } finally {
      setColecoesLoading(false);
    }
  }, []);

  const limparFormulario = () => {
    setEditingId(null);
    setCodigo("");
    setDescricao("");
    setDisplayLabel("");
    setDisplayLabelTouched(false);
    setOrigem("MATRICULA");
    setOrigemJoin("MATRICULA");
    setTipo("TEXTO");
    setFormato("");
    setAtivo(true);
    const defaultRoot = roots.find((r) => r.key === "matriculas") ?? roots[0];
    setRootTable(defaultRoot?.key ?? "matriculas");
    setRootPkColumn(defaultRoot?.pk ?? "id");
    setJoinPath([]);
    setHopLabels(["", "", ""]);
    setTargetColumn("");
    setMapeamentoPendente(false);
    setAiGerada(false);
  };

  const editar = (item: DocumentoVariavel) => {
    setEditingId(item.id);
    setCodigo(item.codigo);
    setDescricao(item.descricao);
    const display = item.display_label ?? "";
    setDisplayLabel(display);
    setDisplayLabelTouched(Boolean(display));
    setOrigem(item.origem);
    if (item.origem !== "MANUAL") setOrigemJoin(item.origem);
    setTipo(item.tipo);
    setFormato(item.formato ?? "");
    setAtivo(item.ativo);
    setRootTable(item.root_table ?? "matriculas");
    setRootPkColumn(item.root_pk_column ?? "id");
    const safeJoin = Array.isArray(item.join_path)
      ? item.join_path.filter(isJoinEdge)
      : [];
    setJoinPath(safeJoin);
    const labels = normalizePathLabels(item.path_labels);
    setHopLabels([
      labels.hop1_label ?? "",
      labels.hop2_label ?? "",
      labels.hop3_label ?? "",
    ]);
    setTargetColumn(item.target_column ?? "");
    setMapeamentoPendente(Boolean(item.mapeamento_pendente));
    setAiGerada(Boolean(item.ai_gerada));
    setOkMsg(null);
    setErro(null);
  };

  const salvar = async () => {
    setSaving(true);
    setErro(null);
    setOkMsg(null);

    if (!codigo.trim() || !descricao.trim()) {
      setErro("Codigo e descricao sao obrigatorios.");
      setSaving(false);
      return;
    }

    if (precisaJoin && !targetColumn.trim()) {
      setErro("Selecione a coluna de destino.");
      setSaving(false);
      return;
    }

    if (precisaJoin && !rootTable.trim()) {
      setErro("Selecione o root.");
      setSaving(false);
      return;
    }

    const resolveHopLabel = (edge: JoinEdge | undefined, override: string | undefined) => {
      if (!edge) return null;
      const trimmed = (override ?? "").trim();
      if (trimmed) return trimmed;
      const nextTable = getNextTable(edge);
      return nextTable ? humanizeLabel(nextTable) : null;
    };

    const pathLabels = precisaJoin
      ? {
          root_label: rootLabel || (rootTable ? humanizeLabel(rootTable) : null),
          hop1_label: resolveHopLabel(joinPath[0], hopLabels[0]),
          hop2_label: resolveHopLabel(joinPath[1], hopLabels[1]),
          hop3_label: resolveHopLabel(joinPath[2], hopLabels[2]),
          target_label: targetColumn ? targetColumn.trim() : null,
        }
      : null;

    const displayLabelPayload = displayLabelTouched ? displayLabel.trim() : "";

    const payload = {
      id: editingId ?? undefined,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      origem,
      tipo,
      formato: formato.trim() || null,
      ativo,
      mapeamento_pendente: false,
      root_table: precisaJoin ? rootTable.trim() : null,
      root_pk_column: precisaJoin ? rootPkColumn.trim() || "id" : null,
      join_path: precisaJoin ? joinPath : null,
      target_table: precisaJoin ? targetTable.trim() : null,
      target_column: precisaJoin ? targetColumn.trim() : null,
      display_label: displayLabelPayload || null,
      path_labels: pathLabels,
    };

    try {
      const res = await fetch("/api/documentos/variaveis", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar variavel.");
      setOkMsg(editingId ? "Variavel atualizada com sucesso." : "Variavel criada com sucesso.");
      limparFormulario();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const desativar = async (id: number) => {
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/documentos/variaveis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao desativar.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    void carregarRoots();
  }, [carregarRoots]);

  useEffect(() => {
    void carregarColecoes();
  }, [carregarColecoes]);

  useEffect(() => {
    if (rootTable) void carregarAdj(rootTable);
  }, [rootTable, carregarAdj]);

  useEffect(() => {
    for (const edge of joinPath) {
      const nextTable = getNextTable(edge);
      if (nextTable) void carregarAdj(nextTable);
    }
  }, [joinPath, carregarAdj]);

  useEffect(() => {
    if (!precisaJoin) {
      setColumns([]);
      return;
    }
    setColumns([]);
    if (targetTable) void carregarColumns(targetTable);
  }, [precisaJoin, targetTable, carregarColumns]);

  useEffect(() => {
    if (columns.length === 0) return;
    setTargetColumn((prev) =>
      prev && columns.some((c) => c.column_name === prev) ? prev : "",
    );
  }, [columns]);

  const pendentesCount = useMemo(
    () => itens.filter((item) => item.mapeamento_pendente).length,
    [itens],
  );

  const itensFiltrados = useMemo(
    () => (mostrarPendentes ? itens.filter((item) => item.mapeamento_pendente) : itens),
    [itens, mostrarPendentes],
  );

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Variaveis"
        subtitle="Cadastre variaveis reutilizaveis para gerar placeholders automaticamente."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Use codigo em CAIXA ALTA, ex: ALUNO_NOME.",
          "Origem MANUAL dispensa wizard de joins.",
          "Variaveis inativas nao aparecem para selecao nos modelos.",
        ]}
      />

      <SystemSectionCard
        title={editingId ? "Editar variavel" : "Cadastrar variavel"}
        description="Defina origem, tipo e o caminho por joins do schema."
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={limparFormulario} disabled={saving}>
              Limpar
            </Button>
            <Button onClick={() => void salvar()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar variavel"}
            </Button>
          </div>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {okMsg}
          </div>
        ) : null}
        {editingId && (mapeamentoPendente || aiGerada) ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {mapeamentoPendente ? "Variavel pendente de mapeamento." : null}
            {mapeamentoPendente && aiGerada ? " " : null}
            {aiGerada ? "Origem: IA." : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Codigo</label>
            <div className="mt-1">
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ALUNO_NOME" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <div className="mt-1">
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Nome do aluno" />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">De onde vem o valor?</label>
            <div className="mt-1">
              <Input
                value={displayLabelValue}
                onChange={(e) => handleDisplayLabelChange(e.target.value)}
                placeholder="Nome humano da variavel (origem construida)"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Nome humano da variavel. Se vazio, usa o caminho humano do wizard.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={origem === "MANUAL"}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (origem !== "MANUAL") setOrigemJoin(origem);
                    setOrigem("MANUAL");
                  } else {
                    setOrigem(origemJoin !== "MANUAL" ? origemJoin : "MATRICULA");
                  }
                }}
              />
              <span className="text-sm">Variavel manual (preenchida na emissao)</span>
            </div>
            {origem === "MANUAL" ? (
              <p className="mt-1 text-xs text-slate-500">{origemHint}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Formato</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              disabled={opcoesFormato.length === 0}
            >
              <option value="">Sem formato</option>
              {opcoesFormato.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {precisaJoin ? (
            <div className="md:col-span-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Ponto de partida (root)</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={rootTable}
                    onChange={(e) => handleRootChange(e.target.value)}
                    disabled={rootsLoading}
                  >
                    {rootsLoading ? <option>Carregando...</option> : null}
                    {!rootsLoading && roots.length === 0 ? <option value="">Sem roots</option> : null}
                    {roots.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">PK do root</label>
                  <Input value={rootPkColumn} onChange={(e) => setRootPkColumn(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                <div className="text-sm font-semibold">Wizard (ate 3 saltos)</div>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {Array.from({ length: MAX_HOPS }).map((_, index) => {
                    const table = hopTables[index];
                    const options = table ? adjCache[table] ?? [] : [];
                    const selectedEdge = joinPath[index];
                    const selectedValue = selectedEdge ? edgeKey(selectedEdge) : "";
                    const disabled = index > 0 && !joinPath[index - 1];
                    const defaultHopLabel = selectedEdge ? getDefaultHopLabel(selectedEdge) : "";

                    return (
                      <div key={`hop-${index}`}>
                        <label className="text-xs font-medium">Hop {index + 1}</label>
                        <select
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          value={selectedValue}
                          onChange={(e) => handleHopChange(index, e.target.value)}
                          disabled={!table || disabled}
                        >
                          <option value="">Parar aqui</option>
                          {options.map((edge) => (
                            <option key={edgeKey(edge)} value={edgeKey(edge)}>
                              {edge.direction}: {edge.from_table}.{edge.from_column} {"->"} {edge.to_table}.
                              {edge.to_column}
                            </option>
                          ))}
                        </select>
                        <label className="mt-2 block text-xs text-slate-500">Nome do hop (opcional)</label>
                        <Input
                          className="mt-1"
                          value={hopLabels[index] ?? ""}
                          onChange={(e) => handleHopLabelChange(index, e.target.value)}
                          placeholder={defaultHopLabel || "Nome do hop"}
                          disabled={!selectedEdge || disabled}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div>Caminho humano: {humanPathLabel || "(nenhum)"}</div>
                  <div>Caminho tecnico: {technicalPathLabel || "(nenhum)"}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Coluna de destino ({targetTable})</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  disabled={columnsLoading || !targetTable}
                >
                  <option value="">Selecione...</option>
                  {columns.map((col) => (
                    <option key={col.column_name} value={col.column_name}>
                      {col.column_name} ({col.data_type})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">{origemHint}</p>
              </div>
            </div>
          ) : (
            <div className="md:col-span-3">
              <p className="text-xs text-slate-500">{origemHint}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="text-sm">Ativo</span>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Variaveis cadastradas" description="Edite ou desative variaveis existentes.">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma variavel cadastrada.</p>
        ) : (
          <div className="grid gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={mostrarPendentes}
                onChange={(e) => setMostrarPendentes(e.target.checked)}
              />
              Mostrar apenas pendentes de mapeamento ({pendentesCount})
            </label>

            {itensFiltrados.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {item.codigo} <span className="text-xs text-slate-600">({item.tipo})</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {item.descricao} | Origem: {ORIGEM_LABELS[item.origem] ?? item.origem} | Ativo:{" "}
                      {item.ativo ? "Sim" : "Nao"}
                    </div>
                    {item.mapeamento_pendente ? (
                      <div className="mt-1 text-xs text-amber-700">Pendente de mapeamento</div>
                    ) : null}
                    {item.ai_gerada ? (
                      <div className="mt-1 text-xs text-slate-500">Gerada por IA</div>
                    ) : null}
                    {item.root_table ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Root: {item.root_table}.{item.root_pk_column ?? "id"}
                      </div>
                    ) : null}
                    {item.target_table && item.target_column ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Destino: {item.target_table}.{item.target_column}
                      </div>
                    ) : null}
                    {!item.root_table && item.path_origem ? (
                      <div className="mt-1 text-xs text-slate-500">Path: {item.path_origem}</div>
                    ) : null}
                    {item.join_path && item.join_path.length > 0 ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Saltos: {item.join_path.length}
                      </div>
                    ) : null}
                    {item.formato ? (
                      <div className="mt-1 text-xs text-slate-500">Formato: {item.formato}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => editar(item)}>
                      Editar
                    </Button>
                    {item.ativo ? (
                      <Button variant="secondary" onClick={() => void desativar(item.id)}>
                        Desativar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>

      <SystemSectionCard
        title="Colecoes cadastradas"
        description="Atalho para editar colecoes usadas nos templates."
      >
        {colecoesErro ? <p className="text-sm text-red-600">{colecoesErro}</p> : null}
        {colecoesLoading ? (
          <p className="text-sm text-slate-600">Carregando colecoes...</p>
        ) : colecoes.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma colecao cadastrada.</p>
        ) : (
          <div className="grid gap-3">
            {colecoes.map((col) => (
              <div key={col.codigo} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{col.nome}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {col.codigo} | Root: {col.root_tipo} | Ativo: {col.ativo ? "Sim" : "Nao"}
                    </div>
                    {col.descricao ? (
                      <div className="mt-1 text-xs text-slate-500">{col.descricao}</div>
                    ) : null}
                  </div>
                  <Link
                    className="text-sm underline text-slate-600"
                    href={`/admin/config/documentos/colecoes?edit=${col.id}`}
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
