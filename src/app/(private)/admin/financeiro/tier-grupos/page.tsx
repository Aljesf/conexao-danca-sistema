"use client";

import { useEffect, useMemo, useState } from "react";

type Tier = {
  tier_id: number;
  tier_grupo_id: number;
  ordem: number;
  valor_centavos: number;
  ativo: boolean;
};

type TierGrupo = {
  tier_grupo_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  tiers: Tier[];
};

type Servico = {
  id: number;
  titulo: string | null;
  tipo: string;
  ativo: boolean;
  tier_grupo_id: number | null;
};

type TierGrupoResp = {
  ok: boolean;
  grupos?: TierGrupo[];
  warning?: string;
  message?: string;
};

type ServicosResp = {
  ok: boolean;
  servicos?: Servico[];
  warning?: string;
  message?: string;
};

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyToCentavos(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `HTTP ${status}`;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error && typeof record.error === "object") {
    const errObj = record.error as Record<string, unknown>;
    if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message;
  }
  return `HTTP ${status}`;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data as T;
}

type NovoGrupo = {
  nome: string;
  descricao: string;
  ativo: boolean;
};

type TierForm = {
  ordem: string;
  valor: string;
  ativo: boolean;
};

export default function AdminFinanceiroTierGruposPage() {
  const [grupos, setGrupos] = useState<TierGrupo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvandoTier, setSalvandoTier] = useState<number | null>(null);
  const [salvandoServicoId, setSalvandoServicoId] = useState<number | null>(null);

  const [novoGrupo, setNovoGrupo] = useState<NovoGrupo>({
    nome: "",
    descricao: "",
    ativo: true,
  });

  const [tiersForm, setTiersForm] = useState<Record<number, TierForm>>({});

  const grupoOptions = useMemo(
    () => grupos.map((g) => ({ id: g.tier_grupo_id, label: g.nome })),
    [grupos],
  );

  async function carregarGrupos() {
    setErro(null);
    setLoading(true);
    try {
      const data = await fetchJSON<TierGrupoResp>("/api/admin/financeiro/tier-grupos");
      if (!data.ok) throw new Error(data.message ?? "Falha ao carregar grupos.");
      setGrupos(data.grupos ?? []);
      setWarning(data.warning ?? null);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar grupos.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarServicos() {
    setErro(null);
    setLoading(true);
    try {
      const data = await fetchJSON<ServicosResp>("/api/admin/financeiro/tier-grupos/servicos");
      if (!data.ok) throw new Error(data.message ?? "Falha ao carregar servicos.");
      setServicos(data.servicos ?? []);
      setWarning((prev) => data.warning ?? prev);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar servicos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarGrupos();
    void carregarServicos();
  }, []);

  async function criarGrupo() {
    setErro(null);
    if (!novoGrupo.nome.trim()) {
      setErro("Nome do grupo e obrigatorio.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        nome: novoGrupo.nome.trim(),
        descricao: novoGrupo.descricao.trim() || null,
        ativo: novoGrupo.ativo,
      };
      const data = await fetchJSON<{ ok: boolean; grupo?: TierGrupo; message?: string }>(
        "/api/admin/financeiro/tier-grupos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok || !data.grupo) throw new Error(data.message ?? "Falha ao criar grupo.");
      setNovoGrupo({ nome: "", descricao: "", ativo: true });
      await carregarGrupos();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao criar grupo.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarTier(grupoId: number) {
    const form = tiersForm[grupoId];
    if (!form) {
      setErro("Preencha ordem e valor do tier.");
      return;
    }
    const ordem = Number(form.ordem);
    const valorCentavos = parseMoneyToCentavos(form.valor);
    if (!Number.isInteger(ordem) || ordem <= 0) {
      setErro("Ordem invalida.");
      return;
    }
    if (valorCentavos === null || valorCentavos <= 0) {
      setErro("Valor invalido.");
      return;
    }
    setErro(null);
    setSalvandoTier(grupoId);
    try {
      const payload = { ordem, valor_centavos: valorCentavos, ativo: form.ativo };
      const data = await fetchJSON<{ ok: boolean; message?: string }>(
        `/api/admin/financeiro/tier-grupos/${grupoId}/tiers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok) throw new Error(data.message ?? "Falha ao salvar tier.");
      setTiersForm((prev) => ({ ...prev, [grupoId]: { ordem: "", valor: "", ativo: true } }));
      await carregarGrupos();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar tier.");
    } finally {
      setSalvandoTier(null);
    }
  }

  async function atualizarServicoTier(servicoId: number, tierGrupoId: number | null) {
    setErro(null);
    setSalvandoServicoId(servicoId);
    try {
      const data = await fetchJSON<{ ok: boolean; servico?: Servico; message?: string }>(
        "/api/admin/financeiro/tier-grupos/servicos",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servico_id: servicoId, tier_grupo_id: tierGrupoId }),
        },
      );
      if (!data.ok || !data.servico) throw new Error(data.message ?? "Falha ao atualizar servico.");
      setServicos((prev) => prev.map((s) => (s.id === servicoId ? (data.servico as Servico) : s)));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar servico.");
    } finally {
      setSalvandoServicoId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Financeiro - Tier dinamico</h1>
        <p className="text-sm text-muted-foreground">
          Configure grupos e tiers para precificacao por multiplas modalidades.
        </p>
      </div>

      {warning ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{warning}</div>
      ) : null}
      {erro ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div> : null}

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Novo grupo</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Nome</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoGrupo.nome}
              onChange={(e) => setNovoGrupo((prev) => ({ ...prev, nome: e.target.value }))}
              disabled={loading}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Descricao</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoGrupo.descricao}
              onChange={(e) => setNovoGrupo((prev) => ({ ...prev, descricao: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={novoGrupo.ativo}
              onChange={(e) => setNovoGrupo((prev) => ({ ...prev, ativo: e.target.checked }))}
              disabled={loading}
            />
            Ativo
          </label>
          <button
            type="button"
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void criarGrupo()}
            disabled={loading}
          >
            Criar grupo
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {grupos.map((g) => {
          const form = tiersForm[g.tier_grupo_id] ?? { ordem: "", valor: "", ativo: true };
          const tiersOrdenados = [...(g.tiers ?? [])].sort((a, b) => a.ordem - b.ordem);
          return (
            <div key={g.tier_grupo_id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{g.nome}</h3>
                  {g.descricao ? <p className="text-xs text-muted-foreground">{g.descricao}</p> : null}
                </div>
                <span className="text-xs text-muted-foreground">{g.ativo ? "Ativo" : "Inativo"}</span>
              </div>

              <div className="rounded-md border">
                <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  <div className="col-span-2">Ordem</div>
                  <div className="col-span-4">Valor</div>
                  <div className="col-span-2">Ativo</div>
                </div>
                {tiersOrdenados.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum tier cadastrado.</div>
                ) : (
                  <div className="divide-y">
                    {tiersOrdenados.map((t) => (
                      <div key={t.tier_id} className="grid grid-cols-12 px-3 py-2 text-sm">
                        <div className="col-span-2">{t.ordem}</div>
                        <div className="col-span-4">{formatBRL(t.valor_centavos)}</div>
                        <div className="col-span-2">{t.ativo ? "Sim" : "Nao"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <div>
                  <label className="text-xs font-medium">Ordem</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                    value={form.ordem}
                    onChange={(e) =>
                      setTiersForm((prev) => ({ ...prev, [g.tier_grupo_id]: { ...form, ordem: e.target.value } }))
                    }
                    placeholder="1"
                    disabled={salvandoTier === g.tier_grupo_id}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium">Valor (R$)</label>
                  <input
                    className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                    value={form.valor}
                    onChange={(e) =>
                      setTiersForm((prev) => ({ ...prev, [g.tier_grupo_id]: { ...form, valor: e.target.value } }))
                    }
                    placeholder="120,00"
                    disabled={salvandoTier === g.tier_grupo_id}
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) =>
                      setTiersForm((prev) => ({ ...prev, [g.tier_grupo_id]: { ...form, ativo: e.target.checked } }))
                    }
                    disabled={salvandoTier === g.tier_grupo_id}
                  />
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
                <div className="md:col-span-2 mt-6">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-xs hover:bg-muted disabled:opacity-50"
                    onClick={() => void salvarTier(g.tier_grupo_id)}
                    disabled={salvandoTier === g.tier_grupo_id}
                  >
                    {salvandoTier === g.tier_grupo_id ? "Salvando..." : "Salvar tier"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-semibold">Servicos e grupos</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Servico</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Ativo</th>
                <th className="px-3 py-2 text-left">Grupo</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.titulo ?? `Servico #${s.id}`}</div>
                    <div className="text-[11px] text-muted-foreground">ID {s.id}</div>
                  </td>
                  <td className="px-3 py-2">{s.tipo}</td>
                  <td className="px-3 py-2">{s.ativo ? "Sim" : "Nao"}</td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      value={s.tier_grupo_id ?? ""}
                      onChange={(e) =>
                        void atualizarServicoTier(s.id, e.target.value ? Number(e.target.value) : null)
                      }
                      disabled={salvandoServicoId === s.id}
                    >
                      <option value="">Sem grupo</option>
                      {grupoOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {servicos.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={4}>
                    Nenhum servico encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{loading ? "Carregando..." : `Total: ${grupos.length} grupos`}</div>
    </div>
  );
}
