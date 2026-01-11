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
            <div className="text-sm text-slate-500">CURRÍCULO</div>
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

const primaryBtn = "rounded-xl border px-3 py-2 text-sm hover:bg-slate-50";
const ghostPurple = "rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50";

export function CurriculoQuickAddFormacaoExternaButton({
  pessoaId,
  onSaved,
}: {
  pessoaId: number;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome_curso: "",
    organizacao: "",
    local: "",
    carga_horaria: "",
    data_inicio: "",
    data_fim: "",
    certificado_url: "",
    observacoes: "",
  });

  const handleSaved = () => {
    if (onSaved) {
      onSaved();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  async function salvar() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pessoas/curriculo/formacoes-externas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          nome_curso: form.nome_curso,
          organizacao: form.organizacao || null,
          local: form.local || null,
          carga_horaria: form.carga_horaria || null,
          data_inicio: form.data_inicio || null,
          data_fim: form.data_fim || null,
          certificado_url: form.certificado_url || null,
          observacoes: form.observacoes || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao salvar formação externa.");

      setOpen(false);
      setForm({
        nome_curso: "",
        organizacao: "",
        local: "",
        carga_horaria: "",
        data_inicio: "",
        data_fim: "",
        certificado_url: "",
        observacoes: "",
      });
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar formação externa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className={ghostPurple} onClick={() => setOpen(true)}>
        Cadastrar formação externa
      </button>

      <Modal title="Cadastrar formação externa" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Nome do curso *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.nome_curso}
              onChange={(e) => setForm((v) => ({ ...v, nome_curso: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Organização</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.organizacao}
              onChange={(e) => setForm((v) => ({ ...v, organizacao: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Local</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.local}
              onChange={(e) => setForm((v) => ({ ...v, local: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Carga horária</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Ex.: 40h"
              value={form.carga_horaria}
              onChange={(e) => setForm((v) => ({ ...v, carga_horaria: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data início</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.data_inicio}
              onChange={(e) => setForm((v) => ({ ...v, data_inicio: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data fim</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.data_fim}
              onChange={(e) => setForm((v) => ({ ...v, data_fim: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">URL do certificado (PDF/PNG)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="https://..."
              value={form.certificado_url}
              onChange={(e) => setForm((v) => ({ ...v, certificado_url: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Observações</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.observacoes}
              onChange={(e) => setForm((v) => ({ ...v, observacoes: e.target.value }))}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button disabled={saving} className={primaryBtn} onClick={() => void salvar()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function CurriculoQuickAddExperienciaArtisticaButton({
  pessoaId,
  onSaved,
}: {
  pessoaId: number;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    papel: "",
    organizacao: "",
    data_evento: "",
    descricao: "",
    comprovante_url: "",
  });

  const handleSaved = () => {
    if (onSaved) {
      onSaved();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  async function salvar() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pessoas/curriculo/experiencias-artisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          titulo: form.titulo,
          papel: form.papel || null,
          organizacao: form.organizacao || null,
          data_evento: form.data_evento || null,
          descricao: form.descricao || null,
          comprovante_url: form.comprovante_url || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao salvar experiência artística.");

      setOpen(false);
      setForm({ titulo: "", papel: "", organizacao: "", data_evento: "", descricao: "", comprovante_url: "" });
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar experiência artística.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className={ghostPurple} onClick={() => setOpen(true)}>
        Cadastrar experiência artística
      </button>

      <Modal title="Cadastrar experiência artística" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Título *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.titulo}
              onChange={(e) => setForm((v) => ({ ...v, titulo: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Papel</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.papel}
              onChange={(e) => setForm((v) => ({ ...v, papel: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Organização</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.organizacao}
              onChange={(e) => setForm((v) => ({ ...v, organizacao: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.data_evento}
              onChange={(e) => setForm((v) => ({ ...v, data_evento: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">URL do comprovante (PDF/PNG)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="https://..."
              value={form.comprovante_url}
              onChange={(e) => setForm((v) => ({ ...v, comprovante_url: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.descricao}
              onChange={(e) => setForm((v) => ({ ...v, descricao: e.target.value }))}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button disabled={saving} className={primaryBtn} onClick={() => void salvar()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
