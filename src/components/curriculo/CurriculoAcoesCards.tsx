"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ApiResp<T> = { ok: boolean; error?: string; data?: T };

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">CURRICULO</div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function CurriculoAcoesCards({
  pessoaId,
  onSaved,
}: {
  pessoaId: number;
  onSaved?: () => void;
}) {
  const [openFormacao, setOpenFormacao] = useState(false);
  const [openExperiencia, setOpenExperiencia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formacao, setFormacao] = useState({
    nome_curso: "",
    organizacao: "",
    local: "",
    carga_horaria: "",
    data_inicio: "",
    data_fim: "",
    observacoes: "",
  });

  const [experiencia, setExperiencia] = useState({
    titulo: "",
    papel: "",
    organizacao: "",
    data_evento: "",
    descricao: "",
  });

  const handleSaved = () => {
    if (onSaved) {
      onSaved();
      return;
    }
    window.location.reload();
  };

  async function salvarFormacao() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pessoas/curriculo/formacoes-externas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          ...formacao,
          organizacao: formacao.organizacao || null,
          local: formacao.local || null,
          carga_horaria: formacao.carga_horaria || null,
          data_inicio: formacao.data_inicio || null,
          data_fim: formacao.data_fim || null,
          observacoes: formacao.observacoes || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao salvar formacao externa.");

      setOpenFormacao(false);
      setFormacao({
        nome_curso: "",
        organizacao: "",
        local: "",
        carga_horaria: "",
        data_inicio: "",
        data_fim: "",
        observacoes: "",
      });
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar formacao externa.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarExperiencia() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pessoas/curriculo/experiencias-artisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          ...experiencia,
          papel: experiencia.papel || null,
          organizacao: experiencia.organizacao || null,
          data_evento: experiencia.data_evento || null,
          descricao: experiencia.descricao || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao salvar experiencia artistica.");

      setOpenExperiencia(false);
      setExperiencia({
        titulo: "",
        papel: "",
        organizacao: "",
        data_evento: "",
        descricao: "",
      });
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar experiencia artistica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setOpenFormacao(true)}>
          Cadastrar formacao externa
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() => setOpenExperiencia(true)}
        >
          Cadastrar experiencia artistica
        </button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>

      <Modal title="Cadastrar formacao externa" open={openFormacao} onClose={() => setOpenFormacao(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Nome do curso *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.nome_curso}
              onChange={(e) => setFormacao((v) => ({ ...v, nome_curso: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Organizacao</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.organizacao}
              onChange={(e) => setFormacao((v) => ({ ...v, organizacao: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Local</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.local}
              onChange={(e) => setFormacao((v) => ({ ...v, local: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Carga horaria</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Ex.: 40h"
              value={formacao.carga_horaria}
              onChange={(e) => setFormacao((v) => ({ ...v, carga_horaria: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data inicio</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.data_inicio}
              onChange={(e) => setFormacao((v) => ({ ...v, data_inicio: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data fim</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.data_fim}
              onChange={(e) => setFormacao((v) => ({ ...v, data_fim: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Observacoes</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={formacao.observacoes}
              onChange={(e) => setFormacao((v) => ({ ...v, observacoes: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void salvarFormacao()}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>

      <Modal title="Cadastrar experiencia artistica" open={openExperiencia} onClose={() => setOpenExperiencia(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Titulo *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={experiencia.titulo}
              onChange={(e) => setExperiencia((v) => ({ ...v, titulo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Papel</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={experiencia.papel}
              onChange={(e) => setExperiencia((v) => ({ ...v, papel: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Organizacao</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={experiencia.organizacao}
              onChange={(e) => setExperiencia((v) => ({ ...v, organizacao: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={experiencia.data_evento}
              onChange={(e) => setExperiencia((v) => ({ ...v, data_evento: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={experiencia.descricao}
              onChange={(e) => setExperiencia((v) => ({ ...v, descricao: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void salvarExperiencia()}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
