"use client";

import React, { useMemo, useState } from "react";
import CadastroSimples from "@/components/admin/loja/CadastroSimples";

type TipoCadastro = "marcas" | "cores" | "numeracoes" | "tamanhos" | "modelos";

const TABS: Array<{ key: TipoCadastro; label: string; hint: string; icon: string }> = [
  { key: "marcas", label: "Marcas", hint: "So Danca, Capezio, Bloch...", icon: "\ud83c\udff7\ufe0f" },
  { key: "cores", label: "Cores", hint: "Rosa, Preto, Nude...", icon: "\ud83c\udfa8" },
  { key: "numeracoes", label: "Numeracoes", hint: "36, 37, 38...", icon: "\ud83d\udc5f" },
  { key: "tamanhos", label: "Tamanhos", hint: "P/M/G, 10 anos...", icon: "\ud83d\udccf" },
  { key: "modelos", label: "Modelos", hint: "Meia Ponta, Ponta...", icon: "\ud83e\udde9" },
];

export default function AdminLojaCadastrosPage() {
  // abre por padrao em Cores (primeiro cadastro comum)
  const [tipo, setTipo] = useState<TipoCadastro>("cores");

  const meta = useMemo(() => {
    switch (tipo) {
      case "marcas":
        return { titulo: "Marcas", desc: "Cadastro de marcas para vincular aos produtos base (SPU)." };
      case "cores":
        return { titulo: "Cores", desc: "Padronize nomes e opcionalmente codigo/HEX para evitar duplicidade." };
      case "numeracoes":
        return { titulo: "Numeracoes", desc: 'Para calcados (36, 37...). Campo valor eh INTEGER, pronto para busca "36 + rosa".' };
      case "tamanhos":
        return { titulo: "Tamanhos", desc: "P/M/G, 10 anos etc. Com tipo e ordem (para ordenacao na UI)." };
      case "modelos":
        return { titulo: "Modelos", desc: "Modelos do produto (ex.: Meia ponta, ponta, basico)." };
      default:
        return { titulo: "Atributos", desc: "" };
    }
  }, [tipo]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Administracao do Sistema</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Loja · Atributos do Produto</h1>
              <p className="max-w-3xl text-[15px] text-slate-600">
                Cadastre e padronize as caracteristicas do produto (marca, cor, numeracao, tamanho e modelo). Isso evita texto solto e melhora filtros, estoque e busca.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Estruturado por cadastros
              </span>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2 text-sm">
            {TABS.map((t) => {
              const ativa = tipo === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTipo(t.key)}
                  className={
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition " +
                    (ativa
                      ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                      : "border border-slate-200 bg-white/70 text-slate-600 hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700")
                  }
                >
                  <span className="text-sm">{t.icon}</span>
                  <span>{t.label}</span>
                  <span className="hidden text-xs opacity-70 md:inline">· {t.hint}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 text-[15px] text-slate-700 shadow-sm backdrop-blur-sm md:p-7">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-800 md:text-lg">{meta.titulo}</h2>
            <p className="mt-1 text-slate-600">{meta.desc}</p>
          </div>

          <CadastroSimples tipo={tipo} titulo={meta.titulo} descricao={meta.desc} />
        </section>
      </div>
    </div>
  );
}
