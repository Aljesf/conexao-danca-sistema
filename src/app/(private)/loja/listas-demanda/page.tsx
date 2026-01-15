"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SectionCard from "@/components/layout/SectionCard";

type Lista = {
  id: number;
  titulo: string;
  contexto: string | null;
  status: "ATIVA" | "ENCERRADA";
  bloqueada: boolean;
  criado_em: string;
  encerrada_em: string | null;
};

export default function LojaListasDemandaPage() {
  const [ativas, setAtivas] = useState<Lista[]>([]);
  const [encerradas, setEncerradas] = useState<Lista[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contexto, setContexto] = useState("");

  async function carregar() {
    setErro(null);
    const r = await fetch("/api/loja/listas-demanda");
    const j = (await r.json()) as {
      ativas?: Lista[];
      encerradas?: Lista[];
      error?: string;
    };
    if (!r.ok) return setErro(j.error ?? "erro_ao_carregar");
    setAtivas(j.ativas ?? []);
    setEncerradas(j.encerradas ?? []);
  }

  async function criar() {
    setErro(null);
    const r = await fetch("/api/loja/listas-demanda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contexto: contexto || null }),
    });
    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok || j.ok === false) return setErro(j.error ?? "erro_ao_criar");
    setTitulo("");
    setContexto("");
    await carregar();
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionCard
          title="Listas de demanda"
          subtitle="Levantamentos internos. Não é compra, não é fornecedor, não mexe em estoque e não gera financeiro."
        />

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Criar nova lista</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Título</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Uniformes 2026 — Lote 1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Contexto (opcional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Ex.: Uniformes, sapatilhas, materiais"
              />
            </div>
          </div>

          {erro ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-black px-4 py-2 text-white"
              onClick={() => void criar()}
              disabled={titulo.trim().length < 3}
            >
              Criar lista
            </button>
            <button className="rounded-lg border px-4 py-2" onClick={() => void carregar()}>
              Atualizar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Ativas</div>
          <div className="space-y-2">
            {ativas.length === 0 ? <div className="text-sm text-slate-600">Nenhuma lista ativa.</div> : null}
            {ativas.map((l) => (
              <Link
                key={l.id}
                href={`/loja/listas-demanda/${l.id}`}
                className="block rounded-xl border p-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{l.titulo}</div>
                    <div className="text-sm text-slate-600">{l.contexto ?? "—"}</div>
                  </div>
                  <div className="text-sm whitespace-nowrap">
                    {l.bloqueada ? (
                      <span className="rounded-full border px-2 py-1">🔒 Travada</span>
                    ) : (
                      <span className="rounded-full border px-2 py-1">Editável</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Encerradas</div>
          <div className="space-y-2">
            {encerradas.length === 0 ? <div className="text-sm text-slate-600">Nenhuma lista encerrada.</div> : null}
            {encerradas.map((l) => (
              <Link
                key={l.id}
                href={`/loja/listas-demanda/${l.id}`}
                className="block rounded-xl border p-3 hover:bg-slate-50"
              >
                <div className="font-semibold">{l.titulo}</div>
                <div className="text-sm text-slate-600">{l.contexto ?? "—"}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
