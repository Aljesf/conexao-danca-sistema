"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AlvoTipo = "TURMA" | "CURSO_LIVRE" | "PROJETO";

type MatriculaTabela = {
  id: number;
  produto_tipo: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  ano_referencia: number | null;
  titulo: string;
  ativo: boolean;
  created_at: string;
  matricula_tabelas_alvos?: Array<{ alvo_tipo: AlvoTipo; alvo_id: number }>;
};

type CoberturaRow = {
  alvo_tipo: AlvoTipo;
  alvo_id: number;
  matricula_tabelas?: { id: number; ano_referencia: number | null; ativo: boolean; titulo: string } | null;
};

type AlvoOption = { id: number; label: string };

type ApiListResp<T> = { ok?: boolean; data?: T; message?: string };

type AlvosPorTipo = Record<AlvoTipo, AlvoOption[]>;

type Counts = Record<AlvoTipo, number>;

const ALVOS: AlvoTipo[] = ["TURMA", "CURSO_LIVRE", "PROJETO"];

function labelAlvo(tipo: AlvoTipo, row: Record<string, unknown>): AlvoOption {
  if (tipo === "TURMA") {
    const turmaId = Number((row.turma_id ?? row.id) as number);
    const nome = typeof row.nome === "string" && row.nome.trim() ? row.nome : `Turma ${turmaId}`;
    return { id: turmaId, label: `${nome} (ID ${turmaId})` };
  }

  const id = Number(row.id);
  const titulo =
    (typeof row.titulo === "string" && row.titulo.trim()) ||
    (typeof row.nome === "string" && row.nome.trim()) ||
    `Alvo ${id}`;
  return { id, label: `${titulo} (ID ${id})` };
}

function alvoCounts(links?: Array<{ alvo_tipo: AlvoTipo }>): Counts {
  const base: Counts = { TURMA: 0, CURSO_LIVRE: 0, PROJETO: 0 };
  (links ?? []).forEach((l) => {
    base[l.alvo_tipo] += 1;
  });
  return base;
}

export default function Page() {
  const [ano, setAno] = useState<number>(() => new Date().getFullYear());
  const [tabelas, setTabelas] = useState<MatriculaTabela[]>([]);
  const [tabelasErro, setTabelasErro] = useState<string | null>(null);
  const [tabelasLoading, setTabelasLoading] = useState(false);

  const [cobertura, setCobertura] = useState<CoberturaRow[]>([]);
  const [coberturaErro, setCoberturaErro] = useState<string | null>(null);
  const [coberturaLoading, setCoberturaLoading] = useState(false);

  const [alvosPorTipo, setAlvosPorTipo] = useState<AlvosPorTipo>({
    TURMA: [],
    CURSO_LIVRE: [],
    PROJETO: [],
  });
  const [alvosErro, setAlvosErro] = useState<string | null>(null);
  const [alvosLoading, setAlvosLoading] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setTabelasErro(null);
        setTabelasLoading(true);
        const res = await fetch("/api/matriculas/tabelas");
        const json = (await res.json()) as ApiListResp<MatriculaTabela[]>;
        if (!ativo) return;
        if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar tabelas.");
        setTabelas(json.data ?? []);
      } catch (e: unknown) {
        if (ativo) setTabelasErro(e instanceof Error ? e.message : "Falha ao carregar tabelas.");
      } finally {
        if (ativo) setTabelasLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setAlvosErro(null);
        setAlvosLoading(true);
        const results = await Promise.all(
          ALVOS.map(async (tipo) => {
            const res = await fetch(`/api/matriculas/tabelas/alvos?tipo=${tipo}`);
            const json = (await res.json()) as ApiListResp<Record<string, unknown>[]>;
            if (!res.ok || !json.ok) {
              throw new Error(json.message || `Falha ao carregar alvos ${tipo}.`);
            }
            const items = (json.data ?? []).map((row) => labelAlvo(tipo, row));
            return [tipo, items] as const;
          }),
        );
        if (!ativo) return;
        const next: AlvosPorTipo = { TURMA: [], CURSO_LIVRE: [], PROJETO: [] };
        results.forEach(([tipo, items]) => {
          next[tipo] = items;
        });
        setAlvosPorTipo(next);
      } catch (e: unknown) {
        if (ativo) setAlvosErro(e instanceof Error ? e.message : "Falha ao carregar alvos.");
      } finally {
        if (ativo) setAlvosLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setCoberturaErro(null);
        setCoberturaLoading(true);
        const res = await fetch(`/api/matriculas/tabelas/cobertura?ano=${ano}`);
        const json = (await res.json()) as ApiListResp<CoberturaRow[]>;
        if (!ativo) return;
        if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar cobertura.");
        setCobertura(json.data ?? []);
      } catch (e: unknown) {
        if (ativo) setCoberturaErro(e instanceof Error ? e.message : "Falha ao carregar cobertura.");
      } finally {
        if (ativo) setCoberturaLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [ano]);

  const coberturaSet = useMemo(() => {
    const set = new Set<string>();
    cobertura.forEach((c) => set.add(`${c.alvo_tipo}:${c.alvo_id}`));
    return set;
  }, [cobertura]);

  const pendencias = useMemo(() => {
    const result: Record<AlvoTipo, AlvoOption[]> = {
      TURMA: [],
      CURSO_LIVRE: [],
      PROJETO: [],
    };
    ALVOS.forEach((tipo) => {
      const list = alvosPorTipo[tipo] ?? [];
      result[tipo] = list.filter((item) => !coberturaSet.has(`${tipo}:${item.id}`));
    });
    return result;
  }, [alvosPorTipo, coberturaSet]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tabelas de precos (Escola)</h1>
          <p className="text-sm text-muted-foreground">
            Configure as tabelas oficiais por alvo/ano. Sem uma tabela ativa com <b>MENSALIDADE / RECORRENTE</b>, a
            matricula falha com 409.
          </p>
        </div>

        <Link
          href="/admin/escola/configuracoes/matriculas/tabelas/nova"
          className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm text-white"
        >
          Nova tabela
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Ano</label>
        <input
          type="number"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="w-28 rounded-md border px-3 py-1.5 text-sm"
        />
        {coberturaLoading ? <span className="text-xs text-muted-foreground">Atualizando cobertura...</span> : null}
      </div>

      {tabelasErro ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{tabelasErro}</div>
      ) : null}

      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Titulo</div>
          <div className="col-span-2">Produto</div>
          <div className="col-span-2">Ano</div>
          <div className="col-span-3">Vinculos</div>
          <div className="col-span-1 text-right">Acoes</div>
        </div>

        {tabelasLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Carregando tabelas...</div>
        ) : tabelas.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhuma tabela cadastrada.</div>
        ) : (
          <div className="divide-y">
            {tabelas.map((t) => {
              const counts = alvoCounts(t.matricula_tabelas_alvos);
              return (
                <div key={t.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                  <div className="col-span-1">{t.id}</div>
                  <div className="col-span-3">{t.titulo}</div>
                  <div className="col-span-2">{t.produto_tipo}</div>
                  <div className="col-span-2">{t.ano_referencia ?? "-"}</div>
                  <div className="col-span-3 text-xs text-muted-foreground">
                    Turmas: {counts.TURMA} | Cursos livres: {counts.CURSO_LIVRE} | Projetos: {counts.PROJETO}
                  </div>
                  <div className="col-span-1 text-right">
                    <Link className="underline" href={`/admin/escola/configuracoes/matriculas/tabelas/${t.id}`}>
                      Abrir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Pendencias de cobertura</h2>
          {coberturaErro ? <span className="text-sm text-red-700">{coberturaErro}</span> : null}
        </div>

        {alvosErro ? <div className="text-sm text-red-700">{alvosErro}</div> : null}

        {alvosLoading ? (
          <div className="text-sm text-muted-foreground">Carregando alvos...</div>
        ) : (
          <div className="space-y-4">
            {ALVOS.map((tipo) => {
              const lista = pendencias[tipo] ?? [];
              return (
                <div key={tipo} className="space-y-2">
                  <div className="text-sm font-medium">{tipo}</div>
                  {lista.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sem pendencias.</div>
                  ) : (
                    <div className="space-y-2">
                      {lista.map((alvo) => (
                        <div key={alvo.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>{alvo.label}</span>
                          <Link
                            className="rounded-md border px-3 py-1 text-xs"
                            href={`/admin/escola/configuracoes/matriculas/tabelas/nova?alvo_tipo=${tipo}&alvo_id=${alvo.id}&ano=${ano}`}
                          >
                            Criar tabela e vincular
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
