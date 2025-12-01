"use client";

import { useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type TipoVinculo = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  usa_jornada: boolean;
  usa_vigencia: boolean;
  eh_professor_por_natureza: boolean;
  gera_folha: boolean;
  exige_config_pagamento: boolean;
  ativo: boolean;
};

const seedTipos: TipoVinculo[] = [
  {
    id: 1,
    codigo: "CLT",
    nome: "CLT",
    descricao: "Contrato CLT",
    usa_jornada: true,
    usa_vigencia: true,
    eh_professor_por_natureza: false,
    gera_folha: true,
    exige_config_pagamento: true,
    ativo: true,
  },
  {
    id: 2,
    codigo: "PJ",
    nome: "Prestador PJ",
    descricao: "Serviço pontual",
    usa_jornada: false,
    usa_vigencia: true,
    eh_professor_por_natureza: false,
    gera_folha: false,
    exige_config_pagamento: true,
    ativo: true,
  },
];

export default function TiposVinculoPage() {
  const [tipos, setTipos] = useState<TipoVinculo[]>(seedTipos);
  const [editing, setEditing] = useState<TipoVinculo | null>(null);
  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    usa_jornada: false,
    usa_vigencia: false,
    eh_professor_por_natureza: false,
    gera_folha: false,
    exige_config_pagamento: false,
    ativo: true,
  });

  const ativos = useMemo(() => tipos, [tipos]);

  function reset() {
    setEditing(null);
    setForm({
      codigo: "",
      nome: "",
      descricao: "",
      usa_jornada: false,
      usa_vigencia: false,
      eh_professor_por_natureza: false,
      gera_folha: false,
      exige_config_pagamento: false,
      ativo: true,
    });
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nome.trim()) return;
    if (editing) {
      setTipos((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                ...form,
                codigo: form.codigo.trim(),
                nome: form.nome.trim(),
                descricao: form.descricao.trim() || null,
              }
            : t
        )
      );
    } else {
      const novo: TipoVinculo = {
        id: tipos.length ? Math.max(...tipos.map((t) => t.id)) + 1 : 1,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        usa_jornada: form.usa_jornada,
        usa_vigencia: form.usa_vigencia,
        eh_professor_por_natureza: form.eh_professor_por_natureza,
        gera_folha: form.gera_folha,
        exige_config_pagamento: form.exige_config_pagamento,
        ativo: form.ativo,
      };
      setTipos((prev) => [novo, ...prev]);
    }
    reset();
  }

  function editar(item: TipoVinculo) {
    setEditing(item);
    setForm({
      codigo: item.codigo,
      nome: item.nome,
      descricao: item.descricao || "",
      usa_jornada: item.usa_jornada,
      usa_vigencia: item.usa_vigencia,
      eh_professor_por_natureza: item.eh_professor_por_natureza,
      gera_folha: item.gera_folha,
      exige_config_pagamento: item.exige_config_pagamento,
      ativo: item.ativo,
    });
  }

  function toggleAtivo(id: number) {
    setTipos((prev) => prev.map((t) => (t.id === id ? { ...t, ativo: !t.ativo } : t)));
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Tipos de vínculo de colaborador</h1>
          <p className="text-sm text-slate-600">
            Defina como o colaborador se relaciona com a escola, loja ou café (CLT, PJ, estágio, convidado, etc.).
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Tipos de vínculo controlam jornada, vigência e folha.",
            "Use para diferenciar CLT, PJ, estágios, convidados.",
            "Exigem configuração de pagamento quando necessário.",
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">Tipos cadastrados</h3>
            <p className="text-sm text-slate-600">Lista completa de tipos de vínculo (ativos e inativos).</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Código</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Usa jornada</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Usa vigência</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Professor?</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Gera folha</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Ativo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ativos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{t.codigo}</td>
                      <td className="px-3 py-2 text-slate-700">{t.nome}</td>
                      <td className="px-3 py-2 text-slate-700">{t.usa_jornada ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-slate-700">{t.usa_vigencia ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-slate-700">{t.eh_professor_por_natureza ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-slate-700">{t.gera_folha ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-slate-700">{t.ativo ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => editar(t)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleAtivo(t.id)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {t.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">{editing ? "Editar tipo de vínculo" : "Novo tipo de vínculo"}</h3>
            <form onSubmit={salvar} className="mt-3 grid gap-3">
              <label className="text-sm text-slate-700">
                Código
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Nome
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Descrição
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Detalhes sobre uso deste vínculo"
                />
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.usa_jornada}
                    onChange={(e) => setForm({ ...form, usa_jornada: e.target.checked })}
                  />
                  Usa jornada
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.usa_vigencia}
                    onChange={(e) => setForm({ ...form, usa_vigencia: e.target.checked })}
                  />
                  Usa vigência
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.eh_professor_por_natureza}
                    onChange={(e) => setForm({ ...form, eh_professor_por_natureza: e.target.checked })}
                  />
                  Professor por natureza
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.gera_folha}
                    onChange={(e) => setForm({ ...form, gera_folha: e.target.checked })}
                  />
                  Gera folha
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.exige_config_pagamento}
                    onChange={(e) => setForm({ ...form, exige_config_pagamento: e.target.checked })}
                  />
                  Exige config. de pagamento
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow">
                  Salvar tipo de vínculo
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar / Limpar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
