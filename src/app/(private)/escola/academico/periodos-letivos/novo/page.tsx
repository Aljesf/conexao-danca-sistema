"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function cardClass() {
  return "rounded-2xl border bg-white/60 backdrop-blur shadow-sm";
}

export default function PeriodoLetivoNovoPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("2026");
  const [titulo, setTitulo] = useState("Período Letivo 2026");
  const [ano, setAno] = useState(2026);
  const [dataInicio, setDataInicio] = useState("2026-01-12");
  const [dataFim, setDataFim] = useState("2026-12-19");
  const [inicioJaneiro, setInicioJaneiro] = useState("2026-01-12");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function criar() {
    setSaving(true);
    setErr(null);
    setOk(null);
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

      const id = json?.id;
      if (!id) {
        throw new Error("Resposta inválida: período criado sem id.");
      }
      router.push(`/escola/academico/periodos-letivos/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className={cardClass() + " p-5"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs tracking-widest text-muted-foreground uppercase">Acadêmico</div>
            <h1 className="text-2xl font-semibold">Criar período letivo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie a âncora do ano letivo. Depois você cadastra faixas (semestres/férias) e exceções (feriados e sem
              aula).
            </p>
          </div>

          <Link className="px-4 py-2 rounded-full border text-sm bg-white/70 shadow-sm" href="/escola/academico/periodos-letivos">
            Voltar
          </Link>
        </div>
      </div>

      <div className={cardClass() + " p-5 space-y-4"}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <div className="text-xs text-muted-foreground">Código</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-muted-foreground">Título</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Ano de referência</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Início do ano letivo</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fim do ano letivo</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Início letivo de janeiro (pró-rata)</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              type="date"
              value={inicioJaneiro}
              onChange={(e) => setInicioJaneiro(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-full border text-sm bg-white/70 shadow-sm disabled:opacity-60"
            disabled={saving}
            onClick={() => void criar()}
          >
            {saving ? "Criando…" : "Criar período letivo"}
          </button>

          {ok ? <span className="text-sm">{ok}</span> : null}
          {err ? <span className="text-sm text-red-600">{err}</span> : null}
        </div>
      </div>
    </div>
  );
}
