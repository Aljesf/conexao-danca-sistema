"use client";

import React from "react";

type Conjunto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  grupos?: Grupo[];
};

type GrupoPapel = "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL";

type Grupo = {
  id: number;
  conjunto_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  obrigatorio: boolean;
  ativo?: boolean | null;
  papel?: GrupoPapel | null;
};

type Modelo = {
  id: number;
  titulo: string;
  formato?: string | null;
  ativo?: boolean | null;
  tipo_documento_id?: number | null;
};

type GrupoModeloLink = {
  grupo_modelo_id: number;
  ordem: number;
  ativo: boolean;
  modelo_id: number;
  documentos_modelo?: Modelo | null;
};

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as ApiResp<T>;
  if (!res.ok || !json.ok) throw new Error(json.message || "Falha na requisicao.");
  return json.data as T;
}

export default function AdminDocumentosConjuntosPage() {
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [conjuntos, setConjuntos] = React.useState<Conjunto[]>([]);
  const [modelosDisponiveis, setModelosDisponiveis] = React.useState<Modelo[]>([]);
  const [modelosDisponiveisLoading, setModelosDisponiveisLoading] = React.useState(false);

  const [cCodigo, setCCodigo] = React.useState("");
  const [cNome, setCNome] = React.useState("");
  const [cDescricao, setCDescricao] = React.useState("");

  const [grupoFormOpenId, setGrupoFormOpenId] = React.useState<number | null>(null);
  const [gCodigo, setGCodigo] = React.useState("");
  const [gNome, setGNome] = React.useState("");
  const [gDescricao, setGDescricao] = React.useState("");
  const [gOrdem, setGOrdem] = React.useState<number>(1);
  const [gObrigatorio, setGObrigatorio] = React.useState(false);
  const [gPapel, setGPapel] = React.useState<GrupoPapel>("OPCIONAL");
  const [gAtivo, setGAtivo] = React.useState(true);

  const [conjuntoEditId, setConjuntoEditId] = React.useState<number | null>(null);
  const [ceNome, setCeNome] = React.useState("");
  const [ceDescricao, setCeDescricao] = React.useState("");
  const [ceAtivo, setCeAtivo] = React.useState(true);
  const [salvandoConjunto, setSalvandoConjunto] = React.useState(false);

  const [grupoEditId, setGrupoEditId] = React.useState<number | null>(null);
  const [grupoEditConjuntoId, setGrupoEditConjuntoId] = React.useState<number | null>(null);
  const [gECodigo, setGECodigo] = React.useState("");
  const [gENome, setGENome] = React.useState("");
  const [gEDescricao, setGEDescricao] = React.useState("");
  const [gEOrdem, setGEOrdem] = React.useState<number>(1);
  const [gEAtivo, setGEAtivo] = React.useState(true);
  const [gEPapel, setGEPapel] = React.useState<GrupoPapel>("OPCIONAL");
  const [salvandoGrupo, setSalvandoGrupo] = React.useState(false);

  const [modelosByGrupo, setModelosByGrupo] = React.useState<Record<number, GrupoModeloLink[]>>({});
  const [modelosLoadingByGrupo, setModelosLoadingByGrupo] = React.useState<Record<number, boolean>>({});
  const [modelosErroByGrupo, setModelosErroByGrupo] = React.useState<Record<number, string | null>>({});
  const [showModelosByGrupo, setShowModelosByGrupo] = React.useState<Record<number, boolean>>({});
  const [selectedModeloByGrupo, setSelectedModeloByGrupo] = React.useState<Record<number, number | "">>({});
  const [ordemByGrupo, setOrdemByGrupo] = React.useState<Record<number, number>>({});
  const [linkingByGrupo, setLinkingByGrupo] = React.useState<Record<number, boolean>>({});
  const [ordemLinkById, setOrdemLinkById] = React.useState<Record<number, number>>({});
  const [updatingLinkById, setUpdatingLinkById] = React.useState<Record<number, boolean>>({});
  const [removingLinkById, setRemovingLinkById] = React.useState<Record<number, boolean>>({});

  async function carregarTudo() {
    setErro(null);
    setLoading(true);
    try {
      const data = await apiGet<Conjunto[]>("/api/documentos/conjuntos?include=grupos");
      setConjuntos(data || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarModelosDisponiveis() {
    setModelosDisponiveisLoading(true);
    try {
      const res = await fetch("/api/documentos/modelos", { cache: "no-store" });
      const json = (await res.json()) as { data?: Modelo[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao carregar modelos.");
      setModelosDisponiveis(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setModelosDisponiveisLoading(false);
    }
  }

  async function carregarModelosGrupo(grupoId: number) {
    setModelosErroByGrupo((prev) => ({ ...prev, [grupoId]: null }));
    setModelosLoadingByGrupo((prev) => ({ ...prev, [grupoId]: true }));
    try {
      const data = await apiGet<GrupoModeloLink[]>(
        `/api/documentos/conjuntos/grupos/${grupoId}/modelos`,
      );
      setModelosByGrupo((prev) => ({ ...prev, [grupoId]: data ?? [] }));
      setOrdemLinkById((prev) => {
        const next = { ...prev };
        for (const link of data ?? []) {
          next[link.grupo_modelo_id] = link.ordem;
        }
        return next;
      });
    } catch (e) {
      setModelosErroByGrupo((prev) => ({
        ...prev,
        [grupoId]: e instanceof Error ? e.message : "Erro ao carregar modelos.",
      }));
    } finally {
      setModelosLoadingByGrupo((prev) => ({ ...prev, [grupoId]: false }));
    }
  }

  function abrirEdicaoConjunto(conjunto: Conjunto) {
    setConjuntoEditId(conjunto.id);
    setCeNome(conjunto.nome);
    setCeDescricao(conjunto.descricao ?? "");
    setCeAtivo(conjunto.ativo);
  }

  async function salvarConjuntoEdicao() {
    if (!conjuntoEditId) return;
    setErro(null);
    setSalvandoConjunto(true);
    try {
      const payload = {
        nome: ceNome.trim(),
        descricao: ceDescricao.trim() || null,
        ativo: ceAtivo,
      };

      if (!payload.nome) {
        setErro("Nome do conjunto e obrigatorio.");
        return;
      }

      const res = await fetch(`/api/documentos/conjuntos/${conjuntoEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao atualizar conjunto.");

      setConjuntoEditId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvandoConjunto(false);
    }
  }

  function abrirEdicaoGrupo(conjuntoId: number, grupo: Grupo) {
    setGrupoEditId(grupo.id);
    setGrupoEditConjuntoId(conjuntoId);
    setGECodigo(grupo.codigo ?? "");
    setGENome(grupo.nome ?? "");
    setGEDescricao(grupo.descricao ?? "");
    setGEOrdem(grupo.ordem ?? 1);
    setGEAtivo(grupo.ativo !== false);
    const papel = (grupo.papel ?? (grupo.obrigatorio ? "OBRIGATORIO" : "OPCIONAL")) as GrupoPapel;
    setGEPapel(papel);
  }

  async function salvarGrupoEdicao() {
    if (!grupoEditId || !grupoEditConjuntoId) return;
    setErro(null);
    setSalvandoGrupo(true);
    try {
      const conjuntoAtual = conjuntos.find((c) => c.id === grupoEditConjuntoId);
      const principalExiste = (conjuntoAtual?.grupos ?? []).some(
        (g) => g.id !== grupoEditId && (g.papel ?? "").toUpperCase() === "PRINCIPAL",
      );
      if (gEPapel === "PRINCIPAL" && principalExiste) {
        setErro("Ja existe um grupo PRINCIPAL neste conjunto.");
        return;
      }

      const obrigatorio = gEPapel === "PRINCIPAL" || gEPapel === "OBRIGATORIO";
      const payload = {
        codigo: gECodigo.trim(),
        nome: gENome.trim(),
        descricao: gEDescricao.trim() || null,
        ordem: Number(gEOrdem) || 1,
        ativo: gEAtivo,
        papel: gEPapel,
        obrigatorio,
      };

      if (!payload.codigo || !payload.nome) {
        setErro("Codigo e nome do grupo sao obrigatorios.");
        return;
      }

      const res = await fetch(`/api/documentos/conjuntos/grupos/${grupoEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao atualizar grupo.");

      setGrupoEditId(null);
      setGrupoEditConjuntoId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvandoGrupo(false);
    }
  }

  async function vincularModelo(grupoId: number) {
    const modeloId = selectedModeloByGrupo[grupoId];
    const ordem = ordemByGrupo[grupoId] ?? 1;

    if (!modeloId) {
      setModelosErroByGrupo((prev) => ({ ...prev, [grupoId]: "Selecione um modelo." }));
      return;
    }

    setLinkingByGrupo((prev) => ({ ...prev, [grupoId]: true }));
    setModelosErroByGrupo((prev) => ({ ...prev, [grupoId]: null }));
    try {
      const res = await fetch(`/api/documentos/conjuntos/grupos/${grupoId}/modelos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo_id: modeloId, ordem }),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao vincular modelo.");
      await carregarModelosGrupo(grupoId);
    } catch (e) {
      setModelosErroByGrupo((prev) => ({
        ...prev,
        [grupoId]: e instanceof Error ? e.message : "Erro ao vincular modelo.",
      }));
    } finally {
      setLinkingByGrupo((prev) => ({ ...prev, [grupoId]: false }));
    }
  }

  async function atualizarVinculo(linkId: number, grupoId: number, payload: { ordem?: number; ativo?: boolean }) {
    setUpdatingLinkById((prev) => ({ ...prev, [linkId]: true }));
    setModelosErroByGrupo((prev) => ({ ...prev, [grupoId]: null }));
    try {
      const res = await fetch(`/api/documentos/conjuntos/grupos/modelos/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao atualizar vinculo.");
      await carregarModelosGrupo(grupoId);
    } catch (e) {
      setModelosErroByGrupo((prev) => ({
        ...prev,
        [grupoId]: e instanceof Error ? e.message : "Erro ao atualizar vinculo.",
      }));
    } finally {
      setUpdatingLinkById((prev) => ({ ...prev, [linkId]: false }));
    }
  }

  async function removerVinculo(linkId: number, grupoId: number) {
    setRemovingLinkById((prev) => ({ ...prev, [linkId]: true }));
    setModelosErroByGrupo((prev) => ({ ...prev, [grupoId]: null }));
    try {
      const res = await fetch(`/api/documentos/conjuntos/grupos/modelos/${linkId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao remover vinculo.");
      await carregarModelosGrupo(grupoId);
    } catch (e) {
      setModelosErroByGrupo((prev) => ({
        ...prev,
        [grupoId]: e instanceof Error ? e.message : "Erro ao remover vinculo.",
      }));
    } finally {
      setRemovingLinkById((prev) => ({ ...prev, [linkId]: false }));
    }
  }

  React.useEffect(() => {
    void carregarTudo();
    void carregarModelosDisponiveis();
  }, []);

  async function criarConjunto() {
    setErro(null);
    setLoading(true);
    try {
      const payload = {
        codigo: cCodigo.trim(),
        nome: cNome.trim(),
        descricao: cDescricao.trim() || null,
        ativo: true,
      };

      const res = await fetch("/api/documentos/conjuntos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao criar conjunto.");

      setCCodigo("");
      setCNome("");
      setCDescricao("");
      await carregarTudo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function criarGrupo(conjuntoId: number) {
    setErro(null);
    setLoading(true);
    try {
      const conjuntoAtual = conjuntos.find((c) => c.id === conjuntoId);
      const principalExiste = (conjuntoAtual?.grupos ?? []).some(
        (g) => (g.papel ?? "").toUpperCase() === "PRINCIPAL",
      );
      if (gPapel === "PRINCIPAL" && principalExiste) {
        setErro("Ja existe um grupo PRINCIPAL neste conjunto.");
        return;
      }

      const obrigatorio =
        gPapel === "PRINCIPAL" || gPapel === "OBRIGATORIO" ? true : Boolean(gObrigatorio);

      const payload = {
        conjunto_id: conjuntoId,
        codigo: gCodigo.trim(),
        nome: gNome.trim(),
        descricao: gDescricao.trim() || null,
        ordem: Number(gOrdem) || 1,
        obrigatorio,
        ativo: gAtivo,
        papel: gPapel,
      };

      const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResp<unknown>;
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao criar grupo.");

      setGrupoFormOpenId(null);
      setGCodigo("");
      setGNome("");
      setGDescricao("");
      setGOrdem(1);
      setGObrigatorio(false);
      setGPapel("OPCIONAL");
      setGAtivo(true);

      await carregarTudo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Documentos - Conjuntos e Grupos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gerencie Conjuntos (blocos) e seus Grupos internos. Tudo em uma unica tela.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Criar conjunto</h2>
          <p className="mt-1 text-sm text-slate-600">Crie um conjunto institucional (ex.: Matricula Regular).</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Codigo</label>
              <input
                className="mt-1 w-full rounded-md border p-2 text-sm"
                placeholder="Ex.: MATRICULA_REGULAR"
                value={cCodigo}
                onChange={(e) => setCCodigo(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Caixa alta. Espacos viram underscore automaticamente (se voce ja trata isso no backend).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Nome</label>
              <input
                className="mt-1 w-full rounded-md border p-2 text-sm"
                placeholder="Ex.: Matricula Regular"
                value={cNome}
                onChange={(e) => setCNome(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Descricao</label>
              <input
                className="mt-1 w-full rounded-md border p-2 text-sm"
                placeholder="Opcional (uso interno)."
                value={cDescricao}
                onChange={(e) => setCDescricao(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={criarConjunto}
              disabled={loading || !cCodigo.trim() || !cNome.trim()}
            >
              Criar conjunto
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Conjuntos cadastrados</h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada card e um Conjunto. Dentro dele, voce cria e organiza os Grupos.
              </p>
            </div>

            <button
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              onClick={carregarTudo}
              disabled={loading}
            >
              {loading ? "Recarregando..." : "Recarregar"}
            </button>
          </div>

          {erro ? <p className="mt-3 text-sm text-red-600">{erro}</p> : null}
          {!erro && loading && conjuntos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Carregando...</p>
          ) : null}

          <div className="mt-4 space-y-4">
            {conjuntos.map((c) => (
              <div key={c.id} id={`conjunto-${c.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-semibold">{c.nome}</p>
                    <p className="text-sm text-slate-600">Codigo: {c.codigo}</p>
                    {c.descricao ? <p className="text-sm text-slate-500">{c.descricao}</p> : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                      type="button"
                      onClick={() => {
                        setGrupoFormOpenId((prev) => (prev === c.id ? null : c.id));
                        setGOrdem((c.grupos?.length || 0) + 1);
                        setGAtivo(true);
                        setGPapel("OPCIONAL");
                        setGObrigatorio(false);
                      }}
                    >
                      + Novo grupo
                    </button>

                    <button
                      className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                      type="button"
                      onClick={() => {
                        if (conjuntoEditId === c.id) {
                          setConjuntoEditId(null);
                          return;
                        }
                        abrirEdicaoConjunto(c);
                      }}
                    >
                      Editar conjunto
                    </button>

                    <a
                      className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                      href={`/admin/config/documentos/conjuntos/${c.id}`}
                      title="Link legado (redireciona para esta pagina)"
                    >
                      Abrir
                    </a>
                  </div>
                </div>

                {conjuntoEditId === c.id ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold">Editar conjunto</p>
                    <p className="mt-1 text-xs text-slate-600">Atualize os dados do conjunto.</p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Nome</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          value={ceNome}
                          onChange={(e) => setCeNome(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-3 md:items-end">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={ceAtivo}
                            onChange={(e) => setCeAtivo(e.target.checked)}
                          />
                          Ativo
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Descricao</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          value={ceDescricao}
                          onChange={(e) => setCeDescricao(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => setConjuntoEditId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                      <button
                        className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        onClick={salvarConjuntoEdicao}
                        disabled={salvandoConjunto || !ceNome.trim()}
                        type="button"
                      >
                        {salvandoConjunto ? "Salvando..." : "Salvar alteracoes"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {grupoFormOpenId === c.id ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold">Cadastrar grupo</p>
                    <p className="mt-1 text-xs text-slate-600">Crie um grupo dentro deste conjunto.</p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Codigo</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          placeholder="Ex.: DOCUMENTO_PRINCIPAL"
                          value={gCodigo}
                          onChange={(e) => setGCodigo(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Nome</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          placeholder="Ex.: Documento principal"
                          value={gNome}
                          onChange={(e) => setGNome(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Descricao</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          placeholder="Opcional (uso interno)."
                          value={gDescricao}
                          onChange={(e) => setGDescricao(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Papel</label>
                        <select
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          value={gPapel}
                          onChange={(e) => {
                            const next = e.target.value as GrupoPapel;
                            setGPapel(next);
                            if (next === "PRINCIPAL" || next === "OBRIGATORIO") {
                              setGObrigatorio(true);
                            }
                            if (next === "OPCIONAL" || next === "ADICIONAL") {
                              setGObrigatorio(false);
                            }
                          }}
                        >
                          <option value="PRINCIPAL">PRINCIPAL</option>
                          <option value="OBRIGATORIO">OBRIGATORIO</option>
                          <option value="OPCIONAL">OPCIONAL</option>
                          <option value="ADICIONAL">ADICIONAL</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={gObrigatorio}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setGObrigatorio(next);
                              if (next && gPapel !== "PRINCIPAL" && gPapel !== "OBRIGATORIO") {
                                setGPapel("OBRIGATORIO");
                              }
                              if (!next && gPapel === "OBRIGATORIO") {
                                setGPapel("OPCIONAL");
                              }
                            }}
                            disabled={gPapel === "PRINCIPAL" || gPapel === "OBRIGATORIO"}
                          />
                          Obrigatorio
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={gAtivo}
                            onChange={(e) => setGAtivo(e.target.checked)}
                          />
                          Ativo
                        </label>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Ordem</label>
                        <input
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                          type="number"
                          value={gOrdem}
                          onChange={(e) => setGOrdem(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => setGrupoFormOpenId(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                      <button
                        className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        onClick={() => criarGrupo(c.id)}
                        disabled={loading || !gCodigo.trim() || !gNome.trim()}
                        type="button"
                      >
                        Criar grupo
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="text-sm font-semibold">Grupos</p>
                  {!c.grupos || c.grupos.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Nenhum grupo cadastrado.</p>
                  ) : (
                    <div className="mt-2 grid gap-2">
                    {c.grupos.map((g) => (
                      <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{g.nome}</p>
                            <p className="text-xs text-slate-600">{g.codigo}</p>
                            <p className="text-xs text-slate-500">
                              Ordem: {g.ordem} | Obrigatorio: {g.obrigatorio ? "Sim" : "Nao"} | Ativo:{" "}
                              {g.ativo === false ? "Nao" : "Sim"}
                              {g.papel ? ` | Papel: ${g.papel}` : ""}
                            </p>
                            {g.descricao ? <p className="mt-1 text-xs text-slate-500">{g.descricao}</p> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {g.papel ? (
                              <span
                                className={[
                                  "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                  g.papel === "PRINCIPAL"
                                    ? "bg-slate-900 text-white"
                                    : g.papel === "OBRIGATORIO"
                                      ? "bg-slate-700 text-white"
                                      : g.papel === "ADICIONAL"
                                        ? "bg-slate-200 text-slate-700"
                                        : "bg-slate-100 text-slate-700",
                                ].join(" ")}
                              >
                                {g.papel}
                              </span>
                            ) : null}
                            <button
                              className="rounded-md border bg-white px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-slate-50"
                              type="button"
                              onClick={() => abrirEdicaoGrupo(c.id, g)}
                            >
                              Editar
                            </button>
                          </div>
                        </div>

                        {grupoEditId === g.id ? (
                          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Editar grupo
                            </p>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="text-xs font-medium">Codigo</label>
                                <input
                                  className="mt-1 w-full rounded-md border p-2 text-xs"
                                  value={gECodigo}
                                  onChange={(e) => setGECodigo(e.target.value)}
                                />
                              </div>

                              <div>
                                <label className="text-xs font-medium">Nome</label>
                                <input
                                  className="mt-1 w-full rounded-md border p-2 text-xs"
                                  value={gENome}
                                  onChange={(e) => setGENome(e.target.value)}
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="text-xs font-medium">Descricao</label>
                                <input
                                  className="mt-1 w-full rounded-md border p-2 text-xs"
                                  value={gEDescricao}
                                  onChange={(e) => setGEDescricao(e.target.value)}
                                />
                              </div>

                              <div>
                                <label className="text-xs font-medium">Papel</label>
                                <select
                                  className="mt-1 w-full rounded-md border p-2 text-xs"
                                  value={gEPapel}
                                  onChange={(e) => setGEPapel(e.target.value as GrupoPapel)}
                                >
                                  <option value="PRINCIPAL">PRINCIPAL</option>
                                  <option value="OBRIGATORIO">OBRIGATORIO</option>
                                  <option value="OPCIONAL">OPCIONAL</option>
                                  <option value="ADICIONAL">ADICIONAL</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-medium">Ordem</label>
                                <input
                                  className="mt-1 w-full rounded-md border p-2 text-xs"
                                  type="number"
                                  min={1}
                                  value={gEOrdem}
                                  onChange={(e) => setGEOrdem(Number(e.target.value))}
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={gEAtivo}
                                    onChange={(e) => setGEAtivo(e.target.checked)}
                                  />
                                  Ativo
                                </label>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                className="rounded-md border bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                                type="button"
                                onClick={() => {
                                  setGrupoEditId(null);
                                  setGrupoEditConjuntoId(null);
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                                type="button"
                                onClick={salvarGrupoEdicao}
                                disabled={salvandoGrupo || !gECodigo.trim() || !gENome.trim()}
                              >
                                {salvandoGrupo ? "Salvando..." : "Salvar"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">Modelos do grupo</p>
                              <button
                                className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50"
                                type="button"
                                onClick={() => {
                                  setShowModelosByGrupo((prev) => {
                                    const next = !prev[g.id];
                                    return { ...prev, [g.id]: next };
                                  });
                                  if (!showModelosByGrupo[g.id]) {
                                    void carregarModelosGrupo(g.id);
                                  }
                                }}
                              >
                                {showModelosByGrupo[g.id] ? "Ocultar modelos" : "Ver modelos"}
                              </button>
                            </div>

                            {showModelosByGrupo[g.id] ? (
                              <div className="mt-2 space-y-2">
                                {modelosErroByGrupo[g.id] ? (
                                  <p className="text-xs text-red-600">{modelosErroByGrupo[g.id]}</p>
                                ) : null}
                                {modelosLoadingByGrupo[g.id] ? (
                                  <p className="text-xs text-slate-500">Carregando modelos...</p>
                                ) : null}

                                {!modelosLoadingByGrupo[g.id] &&
                                (!modelosByGrupo[g.id] || modelosByGrupo[g.id].length === 0) ? (
                                  <p className="text-xs text-slate-500">Nenhum modelo vinculado.</p>
                                ) : (
                                  <div className="grid gap-2">
                                    {(modelosByGrupo[g.id] || []).map((m) => (
                                      <div
                                        key={m.grupo_modelo_id}
                                        className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs"
                                      >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                          <div>
                                            <p className="font-medium text-slate-700">
                                              {m.documentos_modelo?.titulo || `Modelo #${m.modelo_id}`}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                              Ordem: {m.ordem} | Ativo: {m.ativo ? "Sim" : "Nao"}
                                            </p>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2">
                                            <input
                                              className="w-20 rounded-md border p-1 text-xs"
                                              type="number"
                                              min={1}
                                              value={ordemLinkById[m.grupo_modelo_id] ?? m.ordem}
                                              onChange={(e) =>
                                                setOrdemLinkById((prev) => ({
                                                  ...prev,
                                                  [m.grupo_modelo_id]: Number(e.target.value) || 1,
                                                }))
                                              }
                                            />
                                            <button
                                              className="rounded-md border bg-white px-2 py-1 text-[10px] hover:bg-slate-50 disabled:opacity-60"
                                              type="button"
                                              onClick={() =>
                                                atualizarVinculo(m.grupo_modelo_id, g.id, {
                                                  ordem: ordemLinkById[m.grupo_modelo_id] ?? m.ordem,
                                                })
                                              }
                                              disabled={updatingLinkById[m.grupo_modelo_id]}
                                            >
                                              Salvar ordem
                                            </button>
                                            <button
                                              className="rounded-md border bg-white px-2 py-1 text-[10px] hover:bg-slate-50 disabled:opacity-60"
                                              type="button"
                                              onClick={() =>
                                                atualizarVinculo(m.grupo_modelo_id, g.id, {
                                                  ativo: !m.ativo,
                                                })
                                              }
                                              disabled={updatingLinkById[m.grupo_modelo_id]}
                                            >
                                              {m.ativo ? "Desativar" : "Reativar"}
                                            </button>
                                            <button
                                              className="rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-60"
                                              type="button"
                                              onClick={() => removerVinculo(m.grupo_modelo_id, g.id)}
                                              disabled={removingLinkById[m.grupo_modelo_id]}
                                            >
                                              Remover
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-2 grid gap-2 md:grid-cols-6">
                                  <div className="md:col-span-4">
                                    <label className="text-xs font-medium">Vincular modelo</label>
                                    <select
                                      className="mt-1 w-full rounded-md border p-2 text-xs"
                                      value={selectedModeloByGrupo[g.id] ?? ""}
                                      onChange={(e) =>
                                        setSelectedModeloByGrupo((prev) => ({
                                          ...prev,
                                          [g.id]: e.target.value ? Number(e.target.value) : "",
                                        }))
                                      }
                                      disabled={modelosDisponiveisLoading}
                                    >
                                      <option value="">
                                        {modelosDisponiveisLoading ? "Carregando..." : "Selecione..."}
                                      </option>
                                      {modelosDisponiveis.map((m) => (
                                        <option key={m.id} value={m.id}>
                                          {m.titulo} (#{m.id})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="md:col-span-1">
                                    <label className="text-xs font-medium">Ordem</label>
                                    <input
                                      className="mt-1 w-full rounded-md border p-2 text-xs"
                                      type="number"
                                      min={1}
                                      value={ordemByGrupo[g.id] ?? 1}
                                      onChange={(e) =>
                                        setOrdemByGrupo((prev) => ({
                                          ...prev,
                                          [g.id]: Number(e.target.value) || 1,
                                        }))
                                      }
                                    />
                                  </div>

                                  <div className="md:col-span-1 flex items-end">
                                    <button
                                      className="w-full rounded-md bg-slate-800 px-2 py-2 text-xs font-medium text-white disabled:opacity-60"
                                      type="button"
                                      onClick={() => vincularModelo(g.id)}
                                      disabled={linkingByGrupo[g.id]}
                                    >
                                      {linkingByGrupo[g.id] ? "Vinculando..." : "Vincular"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

