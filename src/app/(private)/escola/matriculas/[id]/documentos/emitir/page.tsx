"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmissaoModelo = {
  modelo_id: number;
  titulo: string;
  tipo_documento: string | null;
  versao: string | null;
};

type EmissaoGrupo = {
  grupo_id: number;
  grupo_nome: string;
  modelos: EmissaoModelo[];
};

type EmissaoConjunto = {
  conjunto_id: number;
  conjunto_nome: string;
  grupos: EmissaoGrupo[];
};

type ContextoResponse = {
  ok: boolean;
  data?: { operacao: string; conjuntos: EmissaoConjunto[] };
  error?: string;
};

type EmitirResponse = {
  ok?: boolean;
  error?: string;
  data?: { created?: number; skipped?: number };
};

export default function EmitirDocumentosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matriculaId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [conjuntos, setConjuntos] = useState<EmissaoConjunto[]>([]);
  const [conjuntoId, setConjuntoId] = useState<number | null>(null);
  const [grupoIdAtivo, setGrupoIdAtivo] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const conjuntoAtual = useMemo(
    () => conjuntos.find((c) => c.conjunto_id === conjuntoId) ?? null,
    [conjuntos, conjuntoId],
  );

  const grupos = useMemo(() => conjuntoAtual?.grupos ?? [], [conjuntoAtual]);
  const grupoAtivo = useMemo(
    () => grupos.find((g) => g.grupo_id === grupoIdAtivo) ?? grupos[0] ?? null,
    [grupos, grupoIdAtivo],
  );

  useEffect(() => {
    if (!Number.isFinite(matriculaId)) {
      setMessage("Matricula invalida.");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/documentos/emissao/contexto?matriculaId=${matriculaId}`);
        const json = (await res.json()) as ContextoResponse;
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Falha ao carregar conjuntos.");
        }

        const list = json.data?.conjuntos ?? [];
        setConjuntos(list);

        const first = list[0]?.conjunto_id ?? null;
        setConjuntoId(first);

        const firstGrupo = list[0]?.grupos?.[0]?.grupo_id ?? null;
        setGrupoIdAtivo(firstGrupo);

        setSelected({});
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Erro ao carregar contexto.");
      } finally {
        setLoading(false);
      }
    })();
  }, [matriculaId]);

  async function emitir(modeloIds: number[]) {
    if (!Number.isFinite(matriculaId)) return;
    if (modeloIds.length === 0) {
      setMessage("Selecione ao menos um modelo.");
      return;
    }

    setMessage(null);
    const res = await fetch("/api/documentos/emissao/emitir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula_id: matriculaId, modelo_ids: modeloIds }),
    });
    const json = (await res.json()) as EmitirResponse;
    if (!res.ok || !json?.ok) {
      setMessage(`Falha ao emitir: ${json?.error ?? "erro_desconhecido"}`);
      return;
    }

    setMessage(`Emitidos: ${json.data?.created ?? 0} | Ja existentes: ${json.data?.skipped ?? 0}`);
    router.push(`/escola/matriculas/${matriculaId}/documentos`);
  }

  function toggle(id: number) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const selecionados = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected],
  );

  const todosDoConjunto = useMemo(() => {
    const ids: number[] = [];
    for (const g of grupos) {
      for (const m of g.modelos) ids.push(m.modelo_id);
    }
    return Array.from(new Set(ids));
  }, [grupos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Emissao de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Selecione o conjunto da matricula, escolha os modelos e emita de uma vez.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conjunto de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : conjuntos.length === 0 ? (
              <div className="text-sm text-red-700">Nenhum conjunto disponivel para esta matricula.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium">Conjunto</div>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={conjuntoId ? String(conjuntoId) : ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setConjuntoId(id);
                      const c = conjuntos.find((x) => x.conjunto_id === id);
                      setGrupoIdAtivo(c?.grupos?.[0]?.grupo_id ?? null);
                      setSelected({});
                    }}
                  >
                    <option value="">Selecione...</option>
                    {conjuntos.map((c) => (
                      <option key={c.conjunto_id} value={String(c.conjunto_id)}>
                        {c.conjunto_nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={() => void emitir(selecionados)} disabled={selecionados.length === 0}>
                    Emitir selecionados
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void emitir(todosDoConjunto)}
                    disabled={todosDoConjunto.length === 0}
                  >
                    Emitir todos do conjunto
                  </Button>
                </div>
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {conjuntoAtual ? (
          <Card>
            <CardHeader>
              <CardTitle>Modelos por grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={grupoAtivo?.grupo_id ? String(grupoAtivo.grupo_id) : ""}
                onValueChange={(v) => setGrupoIdAtivo(Number(v))}
              >
                <TabsList>
                  {grupos.map((g) => (
                    <TabsTrigger key={g.grupo_id} value={String(g.grupo_id)}>
                      {g.grupo_nome}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {grupos.map((g) => (
                  <TabsContent key={g.grupo_id} value={String(g.grupo_id)}>
                    {g.modelos.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Nenhum modelo ativo neste grupo.</div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {g.modelos.map((m) => (
                          <label key={m.modelo_id} className="flex items-start gap-3 rounded-lg border bg-white p-3">
                            <input
                              type="checkbox"
                              checked={!!selected[m.modelo_id]}
                              onChange={() => toggle(m.modelo_id)}
                              className="mt-1"
                            />
                            <div>
                              <div className="text-sm font-semibold">{m.titulo}</div>
                              <div className="text-xs text-muted-foreground">
                                {m.tipo_documento ?? "Documento"} {m.versao ? `- ${m.versao}` : ""}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
