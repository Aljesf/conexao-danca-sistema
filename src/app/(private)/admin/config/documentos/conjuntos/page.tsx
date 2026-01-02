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
  papel?: GrupoPapel | null;
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

  const [cCodigo, setCCodigo] = React.useState("");
  const [cNome, setCNome] = React.useState("");
  const [cDescricao, setCDescricao] = React.useState("");

  const [grupoFormOpenId, setGrupoFormOpenId] = React.useState<number | null>(null);
  const [gCodigo, setGCodigo] = React.useState("");
  const [gNome, setGNome] = React.useState("");
  const [gDescricao, setGDescricao] = React.useState("");
  const [gOrdem, setGOrdem] = React.useState<number>(1);
  const [gObrigatorio, setGObrigatorio] = React.useState(false);

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

  React.useEffect(() => {
    void carregarTudo();
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
      const payload = {
        conjunto_id: conjuntoId,
        codigo: gCodigo.trim(),
        nome: gNome.trim(),
        descricao: gDescricao.trim() || null,
        ordem: Number(gOrdem) || 1,
        obrigatorio: Boolean(gObrigatorio),
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
                      }}
                    >
                      + Novo grupo
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

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={gObrigatorio}
                            onChange={(e) => setGObrigatorio(e.target.checked)}
                          />
                          Obrigatorio
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
                                Ordem: {g.ordem} | Obrigatorio: {g.obrigatorio ? "Sim" : "Nao"}
                                {g.papel ? ` | Papel: ${g.papel}` : ""}
                              </p>
                              {g.descricao ? <p className="mt-1 text-xs text-slate-500">{g.descricao}</p> : null}
                            </div>
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

