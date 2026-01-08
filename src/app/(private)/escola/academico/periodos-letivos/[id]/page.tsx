"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SectionCard, StatCard, pillAccent, pillNeutral } from "@/components/ui/conexao-cards";

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
  descricao?: string | null;
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
  descricao?: string | null;
  data_inicio: string;
  data_fim: string | null;
  sem_aula: boolean;
  ponto_facultativo: boolean;
  em_avaliacao: boolean;
};

export default function PeriodoLetivoConstrutorPage() {
  const params = useParams<{ id: string }>();
  const periodoId = params?.id;

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [faixas, setFaixas] = useState<Faixa[]>([]);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  // form faixa
  const [fxCategoria, setFxCategoria] = useState("SEMESTRE");
  const [fxSub, setFxSub] = useState<string>("SEMESTRE_1");
  const [fxTitulo, setFxTitulo] = useState<string>("1º Semestre");
  const [fxIni, setFxIni] = useState<string>("2026-01-12");
  const [fxFim, setFxFim] = useState<string>("2026-06-19");
  const [fxSemAula, setFxSemAula] = useState(false);
  const [fxAval, setFxAval] = useState(false);

  // form exceção
  const [exDominio, setExDominio] = useState("INSTITUCIONAL");
  const [exCategoria, setExCategoria] = useState("FERIADO");
  const [exSub, setExSub] = useState<string>(""); // opcional
  const [exTitulo, setExTitulo] = useState<string>("Feriado");
  const [exIni, setExIni] = useState<string>("2026-02-16");
  const [exFim, setExFim] = useState<string>("");
  const [exSemAula, setExSemAula] = useState(true);
  const [exPf, setExPf] = useState(false);
  const [exAval, setExAval] = useState(false);

  async function load() {
    if (!periodoId) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/academico/periodos-letivos/${periodoId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar período letivo");

      setPeriodo(json.periodo ?? null);
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

  const counts = useMemo(() => {
    const semAulaFaixas = faixas.filter((f) => f.sem_aula).length;
    const semAulaEx = excecoes.filter((e) => e.sem_aula).length;
    const pf = excecoes.filter((e) => e.ponto_facultativo).length;
    return {
      faixas: faixas.length,
      excecoes: excecoes.length,
      semAula: semAulaFaixas + semAulaEx,
      pontoFacultativo: pf,
    };
  }, [faixas, excecoes]);

  async function criarFaixa() {
    if (!periodoId) return;
    setMsg(null);
    setErr(null);
    try {
      const payload = {
        categoria: fxCategoria,
        subcategoria: fxSub || null,
        titulo: fxTitulo,
        data_inicio: fxIni,
        data_fim: fxFim,
        sem_aula: fxSemAula,
        em_avaliacao: fxAval,
      };

      const res = await fetch(`/api/academico/periodos-letivos/${periodoId}/faixas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao criar faixa");
      setMsg("Faixa criada com sucesso.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    }
  }

  async function criarExcecao() {
    if (!periodoId) return;
    setMsg(null);
    setErr(null);
    try {
      const payload = {
        dominio: exDominio,
        categoria: exCategoria,
        subcategoria: exSub ? exSub : null,
        titulo: exTitulo,
        data_inicio: exIni,
        data_fim: exFim ? exFim : null,
        sem_aula: exSemAula,
        ponto_facultativo: exPf,
        em_avaliacao: exAval,
      };

      const res = await fetch(`/api/academico/periodos-letivos/${periodoId}/excecoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao criar exceção");
      setMsg("Exceção criada com sucesso.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Período letivo"
        subtitle="Construtor"
        description="Construa o ano letivo com faixas (semestres/férias) e exceções (feriados, ponto facultativo, sem aula)."
        actions={
          <Link className={pillNeutral} href="/escola/academico/periodos-letivos">
            Voltar
          </Link>
        }
      >
        <div className="text-xs text-slate-500">
          Use este painel para publicar as faixas e exceções que abastecem o calendário institucional.
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard title="Carregando" subtitle="Status" description="Buscando dados do período letivo.">
          <div className="text-sm text-slate-600">Carregando…</div>
        </SectionCard>
      ) : null}
      {err ? (
        <SectionCard title="Falha" subtitle="Status" description="Não foi possível carregar o período letivo." className="border-rose-200 bg-rose-50/70">
          <div className="text-sm text-rose-700">{err}</div>
        </SectionCard>
      ) : null}
      {msg ? (
        <SectionCard title="Atualização" subtitle="Status">
          <div className="text-sm text-slate-700">{msg}</div>
        </SectionCard>
      ) : null}

      {periodo ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <SectionCard
            title="Período"
            subtitle="Resumo"
            className="lg:col-span-2"
            description={`${periodo.codigo} • ${periodo.ano_referencia} • ${periodo.data_inicio} → ${periodo.data_fim}`}
          >
            <div className="text-lg font-semibold">{periodo.titulo}</div>
            <div className="text-xs text-slate-500 mt-2">
              Início letivo de janeiro (pró-rata): {periodo.inicio_letivo_janeiro ?? "—"} • {periodo.ativo ? "ativo" : "inativo"}
            </div>
          </SectionCard>

          <StatCard label="Faixas" value={counts.faixas} description="semestres / férias" tone="violet" />
          <StatCard
            label="Exceções"
            value={counts.excecoes}
            description={`sem aula: ${counts.semAula} • PF: ${counts.pontoFacultativo}`}
            tone="amber"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard
          title="Semestres, férias e blocos oficiais"
          subtitle="Faixas"
          description="Ex.: 1º semestre, férias (sem aula), 2º semestre, avaliações finais."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Categoria</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={fxCategoria}
                onChange={(e) => setFxCategoria(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Subcategoria</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={fxSub}
                onChange={(e) => setFxSub(e.target.value)}
                placeholder="SEMESTRE_1"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">Título</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={fxTitulo}
                onChange={(e) => setFxTitulo(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Início</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                type="date"
                value={fxIni}
                onChange={(e) => setFxIni(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Fim</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                type="date"
                value={fxFim}
                onChange={(e) => setFxFim(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={fxSemAula} onChange={(e) => setFxSemAula(e.target.checked)} />
              Sem aula (férias/recesso)
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={fxAval} onChange={(e) => setFxAval(e.target.checked)} />
              Avaliações
            </label>

            <button className={`${pillAccent} ml-auto`} onClick={() => void criarFaixa()}>
              Adicionar faixa
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden mt-4">
            <div className="p-3 border-b text-sm font-semibold">Faixas cadastradas</div>
            {faixas.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Nenhuma faixa cadastrada.</div>
            ) : (
              <div className="divide-y">
                {faixas.map((f) => (
                  <div key={f.id} className="p-3">
                    <div className="text-sm font-semibold">{f.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.categoria}/{f.subcategoria ?? "—"} • {f.data_inicio} → {f.data_fim}
                      {f.sem_aula ? " • sem aula" : ""}
                      {f.em_avaliacao ? " • avaliações" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Feriados, ponto facultativo, sem aula"
          subtitle="Exceções"
          description="Exceções são dias (ou intervalos) que alteram a rotina do ano letivo."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Domínio</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={exDominio}
                onChange={(e) => setExDominio(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Categoria</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={exCategoria}
                onChange={(e) => setExCategoria(e.target.value)}
                placeholder="FERIADO"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">Subcategoria (opcional)</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={exSub}
                onChange={(e) => setExSub(e.target.value)}
                placeholder="CARNAVAL"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">Título</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={exTitulo}
                onChange={(e) => setExTitulo(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Data início</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                type="date"
                value={exIni}
                onChange={(e) => setExIni(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">Data fim (opcional)</div>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                type="date"
                value={exFim}
                onChange={(e) => setExFim(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={exSemAula} onChange={(e) => setExSemAula(e.target.checked)} />
              Sem aula
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={exPf} onChange={(e) => setExPf(e.target.checked)} />
              Ponto facultativo
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={exAval} onChange={(e) => setExAval(e.target.checked)} />
              Em avaliação
            </label>

            <button className={`${pillAccent} ml-auto`} onClick={() => void criarExcecao()}>
              Adicionar exceção
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden mt-4">
            <div className="p-3 border-b text-sm font-semibold">Exceções cadastradas</div>
            {excecoes.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Nenhuma exceção cadastrada.</div>
            ) : (
              <div className="divide-y">
                {excecoes.map((e) => (
                  <div key={e.id} className="p-3">
                    <div className="text-sm font-semibold">{e.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.dominio}/{e.categoria}/{e.subcategoria ?? "—"} • {e.data_inicio}{e.data_fim ? ` → ${e.data_fim}` : ""}
                      {e.sem_aula ? " • sem aula" : ""}
                      {e.ponto_facultativo ? " • ponto facultativo" : ""}
                      {e.em_avaliacao ? " • em avaliação" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-4">
            Dica: carnaval pode ser uma exceção de intervalo (data_inicio e data_fim), e &quot;quarta de cinzas&quot; outra exceção de 1 dia.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
