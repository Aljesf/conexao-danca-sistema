"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ApiResp<T> = { ok: boolean; error?: string; data?: T };

type UploadResp = {
  bucket: string;
  path: string;
  public_url: string;
  filename: string;
  size: number;
  mime: string;
};

type FormacaoExternaItem = {
  id: number;
  nome_curso: string | null;
  organizacao: string | null;
  local: string | null;
  carga_horaria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  certificado_url: string | null;
  observacoes: string | null;
};

type ExperienciaArtisticaItem = {
  id: number;
  titulo: string | null;
  papel: string | null;
  organizacao: string | null;
  data_evento: string | null;
  comprovante_url: string | null;
  descricao: string | null;
};

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
      <div className="w-full max-w-3xl rounded-2xl border bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b p-6">
          <div>
            <div className="text-sm text-slate-500">CURRÍCULO</div>
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function UploadBox({
  pessoaId,
  tipo,
  label,
  valueUrl,
  onUploaded,
}: {
  pessoaId: number;
  tipo: "FORMACAO_EXTERNA" | "EXPERIENCIA_ARTISTICA";
  label: string;
  valueUrl: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("pessoa_id", String(pessoaId));
      fd.append("tipo", tipo);
      fd.append("file", file);

      const res = await fetch("/api/pessoas/curriculo/upload", {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as ApiResp<UploadResp>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao fazer upload.");
      onUploaded(json.data?.public_url ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao fazer upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-700">{label}</div>
          <div className="text-xs text-slate-500">PDF, PNG, JPG (máx. 10MB)</div>
        </div>

        <label className="cursor-pointer rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
          {uploading ? "Enviando..." : "Enviar arquivo"}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {valueUrl ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2 text-sm">
          <div className="truncate pr-3">
            <span className="font-medium">Arquivo anexado:</span> {valueUrl}
          </div>
          <a className="rounded-xl border px-3 py-2 text-xs hover:bg-white" href={valueUrl} target="_blank" rel="noreferrer">
            Abrir
          </a>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Nenhum arquivo anexado ainda.
        </div>
      )}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

const secondaryBtn = "rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";

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
      <button
        className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        onClick={() => setOpen(true)}
      >
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
            <UploadBox
              pessoaId={pessoaId}
              tipo="FORMACAO_EXTERNA"
              label="Certificado"
              valueUrl={form.certificado_url}
              onUploaded={(url) => setForm((v) => ({ ...v, certificado_url: url }))}
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
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className={secondaryBtn} onClick={() => void salvar()}>
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
    comprovante_url: "",
    descricao: "",
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
          comprovante_url: form.comprovante_url || null,
          descricao: form.descricao || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao salvar experiência artística.");

      setOpen(false);
      setForm({ titulo: "", papel: "", organizacao: "", data_evento: "", comprovante_url: "", descricao: "" });
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar experiência artística.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        onClick={() => setOpen(true)}
      >
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
            <UploadBox
              pessoaId={pessoaId}
              tipo="EXPERIENCIA_ARTISTICA"
              label="Comprovante (termo/certificado/imagem)"
              valueUrl={form.comprovante_url}
              onUploaded={(url) => setForm((v) => ({ ...v, comprovante_url: url }))}
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
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className={secondaryBtn} onClick={() => void salvar()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function CurriculoFormacaoExternaItemActions({
  pessoaId,
  item,
  onSaved,
}: {
  pessoaId: number;
  item: FormacaoExternaItem;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome_curso: item.nome_curso ?? "",
    organizacao: item.organizacao ?? "",
    local: item.local ?? "",
    carga_horaria: item.carga_horaria ?? "",
    data_inicio: item.data_inicio ?? "",
    data_fim: item.data_fim ?? "",
    certificado_url: item.certificado_url ?? "",
    observacoes: item.observacoes ?? "",
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
      const res = await fetch(`/api/pessoas/curriculo/formacoes-externas/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (!json.ok) throw new Error(json.error ?? "Falha ao atualizar formacao externa.");

      setOpen(false);
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar formacao externa.");
    } finally {
      setSaving(false);
    }
  }

  async function apagar() {
    if (!window.confirm("Deseja remover esta formacao externa?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFormacaoExterna(item.id);
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao remover formacao externa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-xl border px-3 py-1 text-xs hover:bg-slate-50"
        onClick={() => {
          setForm({
            nome_curso: item.nome_curso ?? "",
            organizacao: item.organizacao ?? "",
            local: item.local ?? "",
            carga_horaria: item.carga_horaria ?? "",
            data_inicio: item.data_inicio ?? "",
            data_fim: item.data_fim ?? "",
            certificado_url: item.certificado_url ?? "",
            observacoes: item.observacoes ?? "",
          });
          setOpen(true);
        }}
      >
        Editar
      </button>
      <button
        className="rounded-xl border px-3 py-1 text-xs hover:bg-slate-50"
        onClick={() => void apagar()}
        disabled={saving}
      >
        Apagar
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}

      <Modal title="Editar formacao externa" open={open} onClose={() => setOpen(false)}>
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
            <label className="text-sm font-medium">Organizacao</label>
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
            <label className="text-sm font-medium">Carga horaria</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Ex.: 40h"
              value={form.carga_horaria}
              onChange={(e) => setForm((v) => ({ ...v, carga_horaria: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data inicio</label>
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
            <UploadBox
              pessoaId={pessoaId}
              tipo="FORMACAO_EXTERNA"
              label="Certificado"
              valueUrl={form.certificado_url}
              onUploaded={(url) => setForm((v) => ({ ...v, certificado_url: url }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Observacoes</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.observacoes}
              onChange={(e) => setForm((v) => ({ ...v, observacoes: e.target.value }))}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className={secondaryBtn} onClick={() => void salvar()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function CurriculoExperienciaArtisticaItemActions({
  pessoaId,
  item,
  onSaved,
}: {
  pessoaId: number;
  item: ExperienciaArtisticaItem;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: item.titulo ?? "",
    papel: item.papel ?? "",
    organizacao: item.organizacao ?? "",
    data_evento: item.data_evento ?? "",
    comprovante_url: item.comprovante_url ?? "",
    descricao: item.descricao ?? "",
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
      const res = await fetch(`/api/pessoas/curriculo/experiencias-artisticas/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          papel: form.papel || null,
          organizacao: form.organizacao || null,
          data_evento: form.data_evento || null,
          comprovante_url: form.comprovante_url || null,
          descricao: form.descricao || null,
        }),
      });

      const json = (await res.json()) as ApiResp<unknown>;
      if (!json.ok) throw new Error(json.error ?? "Falha ao atualizar experiencia artistica.");

      setOpen(false);
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar experiencia artistica.");
    } finally {
      setSaving(false);
    }
  }

  async function apagar() {
    if (!window.confirm("Deseja remover esta experiencia artistica?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteExperienciaArtistica(item.id);
      handleSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao remover experiencia artistica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-xl border px-3 py-1 text-xs hover:bg-slate-50"
        onClick={() => {
          setForm({
            titulo: item.titulo ?? "",
            papel: item.papel ?? "",
            organizacao: item.organizacao ?? "",
            data_evento: item.data_evento ?? "",
            comprovante_url: item.comprovante_url ?? "",
            descricao: item.descricao ?? "",
          });
          setOpen(true);
        }}
      >
        Editar
      </button>
      <button
        className="rounded-xl border px-3 py-1 text-xs hover:bg-slate-50"
        onClick={() => void apagar()}
        disabled={saving}
      >
        Apagar
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}

      <Modal title="Editar experiencia artistica" open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Titulo *</label>
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
            <label className="text-sm font-medium">Organizacao</label>
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
            <UploadBox
              pessoaId={pessoaId}
              tipo="EXPERIENCIA_ARTISTICA"
              label="Comprovante (termo/certificado/imagem)"
              valueUrl={form.comprovante_url}
              onUploaded={(url) => setForm((v) => ({ ...v, comprovante_url: url }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.descricao}
              onChange={(e) => setForm((v) => ({ ...v, descricao: e.target.value }))}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className={secondaryBtn} onClick={() => void salvar()}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export async function deleteFormacaoExterna(id: number): Promise<void> {
  const res = await fetch(`/api/pessoas/curriculo/formacoes-externas/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Falha ao remover formacao externa.");
  }
}

export async function deleteExperienciaArtistica(id: number): Promise<void> {
  const res = await fetch(`/api/pessoas/curriculo/experiencias-artisticas/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? "Falha ao remover experiencia artistica.");
  }
}
