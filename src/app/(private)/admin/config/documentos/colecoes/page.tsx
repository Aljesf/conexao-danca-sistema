"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ColecaoColunaForm = {
  id?: number;
  codigo: string;
  label: string;
  tipo: string;
  formato: string | null;
  ordem: number;
  ativo: boolean;
};

type ColecaoItem = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  root_tipo: string;
  ordem: number;
  ativo: boolean;
  colunas: ColecaoColunaForm[];
};

type ApiResp<T> = { data?: T; error?: string };

const ROOT_LABELS: Record<string, string> = {
  MATRICULA: "Matricula",
  CREDITO_CONEXAO_FATURA: "Fatura (Credito Conexao)",
};

function formatRootLabel(rootTipo: string): string {
  const key = rootTipo.trim().toUpperCase();
  return ROOT_LABELS[key] ?? rootTipo;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildExampleTable(c: ColecaoItem): string {
  const headers = c.colunas
    .map((col) => `    <th>${escapeHtml(col.label || col.codigo)}</th>`)
    .join("\n");
  const cells = c.colunas.map((col) => `    <td>{{${col.codigo}}}</td>`).join("\n");
  return [
    "<table>",
    "  <thead>",
    "  <tr>",
    headers,
    "  </tr>",
    "  </thead>",
    "  <tbody>",
    `  {{#${c.codigo}}}`,
    "  <tr>",
    cells,
    "  </tr>",
    `  {{/${c.codigo}}}`,
    "  </tbody>",
    "</table>",
  ].join("\n");
}

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [colecoes, setColecoes] = useState<ColecaoItem[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [rootTipo, setRootTipo] = useState("");
  const [ordem, setOrdem] = useState<number>(0);
  const [ativo, setAtivo] = useState(true);
  const [colunas, setColunas] = useState<ColecaoColunaForm[]>([]);

  const carregarColecoes = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/colecoes", { cache: "no-store" });
      const json = (await res.json()) as ApiResp<ColecaoItem[]>;
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar colecoes.");
      setColecoes(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar colecoes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarEdicao = useCallback(async (id: number) => {
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/documentos/colecoes/${id}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp<ColecaoItem>;
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar colecao.");
      const data = json.data;
      if (!data) return;
      setEditingId(data.id);
      setCodigo(data.codigo ?? "");
      setNome(data.nome ?? "");
      setDescricao(data.descricao ?? "");
      setRootTipo(data.root_tipo ?? "");
      setOrdem(Number(data.ordem ?? 0));
      setAtivo(Boolean(data.ativo));
      setColunas((data.colunas ?? []).map((col) => ({ ...col })));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar colecao.");
    }
  }, []);

  const limparEdicao = useCallback(() => {
    setEditingId(null);
    setCodigo("");
    setNome("");
    setDescricao("");
    setRootTipo("");
    setOrdem(0);
    setAtivo(true);
    setColunas([]);
    setOkMsg(null);
    setErro(null);
    router.push("/admin/config/documentos/colecoes");
  }, [router]);

  const salvar = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    setErro(null);
    setOkMsg(null);
    try {
      if (!codigo.trim() || !nome.trim() || !rootTipo.trim()) {
        throw new Error("Codigo, nome e root sao obrigatorios.");
      }

      const payload = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        root_tipo: rootTipo.trim(),
        ordem,
        ativo,
        colunas: colunas.map((col) => ({
          codigo: col.codigo.trim(),
          label: col.label.trim(),
          tipo: col.tipo.trim(),
          formato: col.formato?.trim() || null,
          ordem: Number.isFinite(Number(col.ordem)) ? Number(col.ordem) : 0,
          ativo: col.ativo,
        })),
      };

      const res = await fetch(`/api/documentos/colecoes/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar colecao.");
      setOkMsg("Colecao atualizada com sucesso.");
      await carregarColecoes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar colecao.");
    } finally {
      setSaving(false);
    }
  }, [ativo, carregarColecoes, codigo, colunas, descricao, editingId, nome, ordem, rootTipo]);

  useEffect(() => {
    void carregarColecoes();
  }, [carregarColecoes]);

  useEffect(() => {
    const raw = searchParams.get("edit");
    const id = raw ? Number(raw) : NaN;
    if (Number.isFinite(id) && id > 0) {
      void carregarEdicao(id);
    }
  }, [carregarEdicao, searchParams]);

  const rootOptions = useMemo(
    () => Array.from(new Set(colecoes.map((c) => c.root_tipo).filter(Boolean))).sort(),
    [colecoes],
  );

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Colecoes de Documento"
        subtitle="Catalogo tecnico e edicao das colecoes usadas nos modelos."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Colecoes sao listas automaticas vinculadas a uma operacao (ex.: matricula ou fatura).",
          "O codigo da colecao deve bater com o que o template usa: {{#CODIGO}} ... {{/CODIGO}}.",
          "Edite com cuidado: alterar o codigo impacta modelos existentes.",
        ]}
      />

      <SystemSectionCard
        title={editingId ? `Editar colecao #${editingId}` : "Selecione uma colecao para editar"}
        description="Atualize metadados e colunas. As alteracoes nao mudam modelos ja emitidos."
        footer={
          editingId ? (
            <div className="flex w-full flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={limparEdicao} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={() => void salvar()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar colecao"}
              </Button>
            </div>
          ) : null
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

        {!editingId ? (
          <p className="text-sm text-slate-600">
            Use o botao &quot;Editar&quot; em uma colecao cadastrada para abrir o formulario.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Codigo (template)</label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="MATRICULA_PARCELAS" />
            </div>

            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Matricula - Parcelas" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Descricao</label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descricao funcional da colecao"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Root</label>
              <Input
                value={rootTipo}
                onChange={(e) => setRootTipo(e.target.value)}
                list="roots-documentos-colecoes"
                placeholder="MATRICULA"
              />
              <datalist id="roots-documentos-colecoes">
                {rootOptions.map((root) => (
                  <option key={root} value={root} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-sm font-medium">Ordem</label>
              <Input type="number" value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span className="text-sm">Ativo</span>
            </div>

            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">Colunas da colecao</div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setColunas((prev) => [
                      ...prev,
                      { codigo: "", label: "", tipo: "", formato: null, ordem: prev.length + 1, ativo: true },
                    ])
                  }
                >
                  Adicionar coluna
                </Button>
              </div>

              <div className="mt-3 grid gap-3">
                {colunas.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma coluna cadastrada.</p>
                ) : (
                  colunas.map((col, index) => (
                    <div key={`${col.codigo}-${index}`} className="grid gap-2 md:grid-cols-6">
                      <div>
                        <label className="text-xs text-slate-500">Codigo</label>
                        <Input
                          value={col.codigo}
                          onChange={(e) =>
                            setColunas((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, codigo: e.target.value } : item)),
                            )
                          }
                          placeholder="VALOR"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-500">Label</label>
                        <Input
                          value={col.label}
                          onChange={(e) =>
                            setColunas((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, label: e.target.value } : item)),
                            )
                          }
                          placeholder="Valor"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Tipo</label>
                        <Input
                          value={col.tipo}
                          onChange={(e) =>
                            setColunas((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, tipo: e.target.value } : item)),
                            )
                          }
                          placeholder="MONETARIO"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Formato</label>
                        <Input
                          value={col.formato ?? ""}
                          onChange={(e) =>
                            setColunas((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, formato: e.target.value || null } : item,
                              ),
                            )
                          }
                          placeholder="BRL"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Ordem</label>
                        <Input
                          type="number"
                          value={col.ordem}
                          onChange={(e) =>
                            setColunas((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, ordem: Number(e.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={col.ativo}
                            onChange={(e) =>
                              setColunas((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, ativo: e.target.checked } : item,
                                ),
                              )
                            }
                          />
                          Ativo
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SystemSectionCard>

      <SystemSectionCard
        title="Colecoes cadastradas"
        description="Catalogo tecnico (clique para editar)."
      >
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : colecoes.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhuma colecao encontrada. Verifique se a migration foi aplicada e se o endpoint esta respondendo.
          </p>
        ) : (
          <div className="grid gap-3">
            {colecoes.map((c) => (
              <details key={c.codigo} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{c.nome}</div>
                      <div className="mt-1 text-xs text-slate-600">{c.descricao ?? "Sem descricao."}</div>
                      <div className="mt-1 text-xs text-slate-500">Root: {formatRootLabel(c.root_tipo)}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">{c.codigo}</div>
                  </div>
                </summary>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-700">Colunas disponiveis</div>
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/admin/config/documentos/colecoes?edit=${c.id}`)}
                    >
                      Editar
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {c.colunas.map((col) => (
                      <div
                        key={col.codigo}
                        className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      >
                        <div className="font-mono text-slate-700">{col.codigo}</div>
                        <div>
                          {col.label} ({col.tipo}
                          {col.formato ? ` / ${col.formato}` : ""})
                        </div>
                      </div>
                    ))}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-500">Exemplo de tabela (visual)</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                      {buildExampleTable(c)}
                    </pre>
                  </details>
                </div>
              </details>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
