"use client";

import { useEffect, useMemo, useState } from "react";

type Beneficiario = {
  id: string;
  pessoa_id: number | string;
  status: string;
  ase_submission_id: string | null;
  ase_submitted_at: string | null;
};

type Template = { id: string; nome: string; status: string };

function fmt(dt: string | null): string {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return dt;
  }
}

export default function FormulariosInternosCard({
  pessoaId,
  responsavelId,
}: {
  pessoaId: number;
  responsavelId?: number | null;
}) {
  const [loading, setLoading] = useState(true);
  const [benef, setBenef] = useState<Beneficiario | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const aseOk = useMemo(
    () => Boolean(benef?.ase_submission_id && benef?.ase_submitted_at),
    [benef]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const bRes = await fetch(
        `/api/admin/movimento/beneficiarios?pessoa_id=${pessoaId}`,
        { cache: "no-store" }
      );
      const bJson = (await bRes.json()) as {
        ok?: boolean;
        data?: Beneficiario | Beneficiario[] | null;
        error?: string;
        message?: string;
      };
      if (!bRes.ok || bJson.ok === false) {
        throw new Error(bJson.error ?? bJson.message ?? "Falha ao carregar beneficiario.");
      }

      const benefFromApi = Array.isArray(bJson.data)
        ? bJson.data.find(
            (item) => String(item.pessoa_id) === String(pessoaId)
          ) ?? null
        : bJson.data ?? null;
      setBenef(benefFromApi);

      const tRes = await fetch("/api/admin/forms/templates", { cache: "no-store" });
      const tJson = (await tRes.json()) as { data?: Template[]; error?: string };
      if (!tRes.ok) throw new Error(tJson.error ?? "Falha ao carregar templates.");

      const aseTemplates = (tJson.data ?? []).filter((t) =>
        (t.nome ?? "").startsWith("ASE — Movimento")
      );
      setTemplates(aseTemplates);
      setTemplateId((prev) => {
        if (prev && aseTemplates.some((t) => t.id === prev)) return prev;
        return aseTemplates[0]?.id ?? "";
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoaId]);

  async function gerarLinkASE() {
    setMsg(null);
    setErr(null);

    if (!templateId) {
      setErr("Selecione um template ASE.");
      return;
    }

    const res = await fetch(`/api/admin/forms/templates/${templateId}/generate-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoa_id: pessoaId,
        responsavel_id: responsavelId ?? null,
      }),
    });

    const json = (await res.json()) as { data?: { public_url: string }; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao gerar link.");
      return;
    }

    setMsg(`Link gerado: ${json.data?.public_url}`);
  }

  async function ativarBeneficiario() {
    setMsg(null);
    setErr(null);

    const res = await fetch("/api/admin/movimento/beneficiarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa_id: pessoaId, responsavel_id: responsavelId ?? null }),
    });

    const json = (await res.json()) as { data?: Beneficiario; error?: string; code?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao ativar beneficiario.");
      return;
    }

    setMsg("Beneficiario ativado com sucesso.");
    await load();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Formulários Internos</div>
          <div className="mt-1 text-sm text-slate-600">
            ASE é requisito para ativar beneficiário do Movimento.
          </div>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={load}
          disabled={loading}
        >
          Atualizar
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Status beneficiário
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {benef?.status ?? "não cadastrado"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Última ASE</p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {fmt(benef?.ase_submitted_at ?? null)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">ASE vinculada</p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {aseOk ? "sim" : "não"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid items-end gap-2 md:grid-cols-[1fr_auto_auto]">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Template ASE</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loading || templates.length === 0}
            >
              {templates.length === 0 ? (
                <option value="">Nenhum template ASE encontrado</option>
              ) : null}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>

          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={gerarLinkASE}
            disabled={loading || !templateId}
          >
            Gerar ASE
          </button>

          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={ativarBeneficiario}
            disabled={loading}
            title={aseOk ? "" : "Necessário preencher a ASE antes de ativar."}
          >
            Ativar beneficiário
          </button>
        </div>

        {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
      </div>
    </div>
  );
}
