"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

export default function PeriodosLetivosPage() {
  const [items, setItems] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showInativos, setShowInativos] = useState(false);

  // formulário embutido
  const [codigo, setCodigo] = useState("2026");
  const [titulo, setTitulo] = useState("Período Letivo 2026");
  const [ano, setAno] = useState(2026);
  const [dataInicio, setDataInicio] = useState("2026-01-12");
  const [dataFim, setDataFim] = useState("2026-12-19");
  const [inicioJaneiro, setInicioJaneiro] = useState("2026-01-12");
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = showInativos ? "?include_inativos=1" : "";
      const res = await fetch(`/api/academico/periodos-letivos${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar períodos letivos");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [showInativos]);

  const ativos = useMemo(() => items.filter((p) => p.ativo), [items]);
  const inativos = useMemo(() => items.filter((p) => !p.ativo), [items]);

  const ultimoAno = useMemo(() => {
    if (!items.length) return null;
    return items.reduce((max, p) => (p.ano_referencia > max ? p.ano_referencia : max), items[0].ano_referencia);
  }, [items]);

  async function criar() {
    setSaving(true);
    setErr(null);
    setCreatedId(null);
    try {
      const payload = {
        codigo,
        titulo,
        ano_referencia: ano,
        data_inicio: dataInicio,
        data_fim: dataFim,
        inicio_letivo_janeiro: inicioJaneiro || null,
        ativo: true,
      };

      const res = await fetch("/api/academico/periodos-letivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao criar período letivo");

      setCreatedId(Number(json.id));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Acadêmico</p>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Períodos letivos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Construa o ano letivo da Escola: faixas (semestres/férias) e exceções (feriados, pontos facultativos, sem aula).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={pillNeutral} onClick={() => setShowInativos((v) => !v)}>
              {showInativos ? "Ocultar inativos" : "Mostrar inativos"}
            </button>
            <a className={pillAccent} href="#criar-periodo">
              Criar período letivo
            </a>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={items.length} description="períodos cadastrados" />
        <StatCard label="Ativos" value={ativos.length} description="em uso na escola" tone="violet" />
        <StatCard label="Inativos" value={inativos.length} description="histórico" tone="slate" />
        <StatCard label="Último ano" value={ultimoAno ?? "—"} description="referência" tone="amber" />
      </div>

      {err ? (
        <SectionCard
          title="Falha"
          subtitle="Status"
          description="Não foi possível carregar/salvar o período letivo."
          className="border-rose-200 bg-rose-50/70"
        >
          <div className="text-sm text-rose-700">{err}</div>
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard title="Carregando" subtitle="Status" description="Buscando períodos letivos.">
          <div className="text-sm text-slate-600">Carregando…</div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Criar período letivo"
        subtitle="Construtor"
        description="Crie a âncora do ano letivo. Em seguida, abra o construtor para cadastrar faixas e exceções."
        actions={
          createdId ? (
            <Link className={pillAccent} href={`/escola/academico/periodos-letivos/${createdId}`}>
              Abrir construtor do período (ID {createdId})
            </Link>
          ) : null
        }
        className="scroll-mt-24"
      >
        <div id="criar-periodo" className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <div className="text-xs text-slate-500">Código</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-slate-500">Título</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Ano de referência</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Início do ano letivo</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Fim do ano letivo</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Início letivo de janeiro (pró-rata)</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              type="date"
              value={inicioJaneiro}
              onChange={(e) => setInicioJaneiro(e.target.value)}
            />
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-2">
            <button className={pillAccent} disabled={saving} onClick={() => void criar()}>
              {saving ? "Criando…" : "Criar período letivo"}
            </button>

            <div className="text-xs text-slate-500">
              Depois de criar, abra o construtor e cadastre: faixas + exceções (feriados, sem aula, ponto facultativo).
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Lista"
        subtitle="Períodos cadastrados"
        description="Abra o construtor do período para cadastrar faixas e exceções e abastecer o calendário."
      >
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum período letivo encontrado. Crie acima para iniciar.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.titulo}</div>
                    <div className="text-xs text-slate-500">
                      {p.codigo} • {p.ano_referencia} • {p.data_inicio} → {p.data_fim} • {p.ativo ? "ativo" : "inativo"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Início letivo de janeiro: {p.inicio_letivo_janeiro ?? "—"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link className={pillAccent} href={`/escola/academico/periodos-letivos/${p.id}`}>
                      Construir período
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Regra do sistema" subtitle="Importante" description="O Calendário da Escola agrega múltiplas fontes.">
        <ul className="list-disc pl-6 text-sm text-slate-600 space-y-1">
          <li><strong>Período letivo</strong> define faixas e exceções (feriados/ponto facultativo/sem aula).</li>
          <li><strong>Eventos internos</strong> continuam em módulo próprio (com data/hora) e podem referenciar o período letivo.</li>
          <li>O <strong>dashboard do calendário</strong> apenas exibe o que foi cadastrado (não é fonte de verdade).</li>
        </ul>
      </SectionCard>
    </div>
  );
}
