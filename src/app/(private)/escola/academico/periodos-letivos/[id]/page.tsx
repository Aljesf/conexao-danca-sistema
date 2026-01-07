"use client";

import { useEffect, useState } from "react";

type Periodo = {
  id: number;
  codigo: string;
  titulo: string;
  ano_referencia: number;
  data_inicio: string;
  data_fim: string;
  inicio_letivo_janeiro: string | null;
  ativo: boolean;
  observacoes: string | null;
};

type Faixa = {
  id: number;
  categoria: string;
  subcategoria: string | null;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  sem_aula: boolean;
  em_avaliacao: boolean;
};

type Excecao = {
  id: number;
  dominio: string;
  categoria: string;
  subcategoria: string | null;
  titulo: string;
  data_inicio: string;
  data_fim: string | null;
  sem_aula: boolean;
  ponto_facultativo: boolean;
  em_avaliacao: boolean;
};

export default function PeriodoLetivoDetalhePage({ params }: { params: { id: string } }) {
  const periodoId = params.id;

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/academico/periodos-letivos/${periodoId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar periodo letivo");
      setPeriodo(json.periodo);
      setFaixas(Array.isArray(json.faixas) ? json.faixas : []);
      setExcecoes(Array.isArray(json.excecoes) ? json.excecoes : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [periodoId]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Periodo letivo</h1>
        <p className="text-sm text-muted-foreground">
          Aqui voce define faixas (semestres/ferias) e excecoes (feriados/pontos facultativos/sem aula) para a Escola.
        </p>
      </div>

      {err ? <div className="rounded-lg border p-4 text-sm text-red-600">{err}</div> : null}
      {loading ? <div className="rounded-lg border p-4 text-sm">Carregando...</div> : null}

      {periodo ? (
        <div className="rounded-lg border p-4">
          <div className="text-lg font-semibold">{periodo.titulo}</div>
          <div className="text-sm text-muted-foreground">
            {periodo.codigo} • {periodo.ano_referencia} • {periodo.data_inicio} {" -> "} {periodo.data_fim} •{" "}
            {periodo.ativo ? "ativo" : "inativo"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Inicio letivo de janeiro: {periodo.inicio_letivo_janeiro ?? "--"}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-semibold mb-2">Faixas do periodo (semestres/ferias)</div>
          {faixas.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma faixa cadastrada.</div>
          ) : (
            <div className="space-y-2">
              {faixas.map((f) => (
                <div key={f.id} className="rounded-md border p-3">
                  <div className="text-sm font-semibold">{f.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.categoria}/{f.subcategoria ?? "--"} • {f.data_inicio} {" -> "} {f.data_fim}
                    {f.sem_aula ? " • sem aula" : ""}
                    {f.em_avaliacao ? " • avaliacoes" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            MVP: criacao via API <code>POST /api/academico/periodos-letivos/{periodoId}/faixas</code>.
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm font-semibold mb-2">Excecoes do periodo (feriados e pontos facultativos)</div>
          {excecoes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma excecao cadastrada.</div>
          ) : (
            <div className="space-y-2">
              {excecoes.map((e) => (
                <div key={e.id} className="rounded-md border p-3">
                  <div className="text-sm font-semibold">{e.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.dominio}/{e.categoria}/{e.subcategoria ?? "--"} • {e.data_inicio}
                    {e.data_fim ? ` -> ${e.data_fim}` : ""}
                    {e.sem_aula ? " • sem aula" : ""}
                    {e.ponto_facultativo ? " • ponto facultativo" : ""}
                    {e.em_avaliacao ? " • em avaliacao" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            MVP: criacao via API <code>POST /api/academico/periodos-letivos/{periodoId}/excecoes</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
