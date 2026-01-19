"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  nome: string;
  status?: string | null;
};

export default function FormulariosInternosCard({
  pessoaId,
  responsavelId,
}: {
  pessoaId: number;
  responsavelId?: number | null;
}) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    setPublicLink(null);
    setSubmissionId(null);
    try {
      const tRes = await fetch("/api/admin/forms/templates", {
        cache: "no-store",
        credentials: "include",
      });
      const tJson = (await tRes.json()) as { data?: Template[]; error?: string };
      if (!tRes.ok) throw new Error(tJson.error ?? "Falha ao carregar templates.");

      const published = (tJson.data ?? []).filter((t) => {
        if (!t.status) return true;
        return t.status === "published";
      });

      setTemplates(published);
      setTemplateId((prev) => {
        if (prev && published.some((t) => t.id === prev)) return prev;
        return published[0]?.id ?? "";
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function gerarLink() {
    setMsg(null);
    setErr(null);
    setPublicLink(null);
    setSubmissionId(null);

    if (!templateId) {
      setErr("Selecione um template publicado.");
      return;
    }

    const res = await fetch(`/api/admin/forms/templates/${templateId}/generate-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        pessoa_id: pessoaId,
        responsavel_id: responsavelId ?? null,
      }),
    });

    const json = (await res.json()) as { data?: { public_url: string; submission_id?: string | number }; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao gerar link.");
      return;
    }

    const publicUrl = json.data?.public_url ?? "";
    if (!publicUrl) {
      setErr("Falha ao gerar link publico.");
      return;
    }

    const newSubmissionId = json.data?.submission_id;
    setSubmissionId(newSubmissionId ? String(newSubmissionId) : null);

    let finalLink = publicUrl;
    try {
      const url = new URL(publicUrl, "http://placeholder");
      const targetPath = `${url.pathname}${url.search ?? ""}`;
      const shortRes = await fetch("/api/admin/short-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_path: targetPath,
          target_label: templates.find((t) => t.id === templateId)?.nome ?? "Formulario publico",
        }),
      });
      const shortJson = (await shortRes.json()) as { short_url?: string; data?: { short_url?: string } };
      if (shortRes.ok) {
        finalLink = shortJson.short_url ?? shortJson.data?.short_url ?? finalLink;
      }
    } catch {
      finalLink = publicUrl;
    }

    setPublicLink(finalLink);
    setMsg("Link gerado com sucesso.");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Formularios Internos</div>
          <div className="mt-1 text-sm text-slate-600">
            Questionarios e formularios internos vinculados a esta pessoa.
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

      <div className="mt-4 grid gap-3">
        <div className="grid items-end gap-2 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Template publicado</span>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loading || templates.length === 0}
            >
              {templates.length === 0 ? (
                <option value="">Nenhum template publicado encontrado</option>
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
            onClick={gerarLink}
            disabled={loading || !templateId}
          >
            Gerar link
          </button>
        </div>

        {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
        {publicLink ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div>
              <span className="font-medium text-emerald-800">Link gerado:</span>{" "}
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline break-all"
              >
                {publicLink}
              </a>
            </div>
            {submissionId ? (
              <div className="mt-2">
                <Link href={`/admin/forms/submissions/${submissionId}`} className="text-emerald-700 underline">
                  Ver respostas
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
      </div>
    </div>
  );
}
