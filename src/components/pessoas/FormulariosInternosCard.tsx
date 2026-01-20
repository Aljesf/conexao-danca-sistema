"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  nome: string;
  status?: string | null;
};

type SubmissionRow = {
  id: string;
  public_token: string | null;
  created_at: string;
  submitted_at: string | null;
  template: { id: string; nome: string; status: string };
  answers_count: number;
  has_answers: boolean;
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
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [history, setHistory] = useState<SubmissionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    setPublicLink(null);
    setShortLink(null);
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (pessoaId) params.set("pessoa_id", String(pessoaId));
      if (responsavelId) params.set("responsavel_id", String(responsavelId));

      const res = await fetch(`/api/admin/forms/submissions?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as { data?: SubmissionRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar historico.");
      setHistory(json.data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setHistoryLoading(false);
    }
  }, [pessoaId, responsavelId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const historyItems = useMemo(() => history.slice(0, 10), [history]);
  const primaryLink = shortLink ?? publicLink;

  function formatDate(value: string | null | undefined): string {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString("pt-BR");
  }

  async function gerarLink() {
    setMsg(null);
    setErr(null);
    setPublicLink(null);
    setShortLink(null);
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

    const json = (await res.json()) as {
      data?: { public_url?: string; short_url?: string | null; submission_id?: string | number };
      error?: string;
    };
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

    const shortUrl = typeof json.data?.short_url === "string" ? json.data?.short_url : null;
    setPublicLink(publicUrl);
    setShortLink(shortUrl && shortUrl.trim() ? shortUrl : null);
    setMsg("Link gerado com sucesso.");
    await loadHistory();
  }

  async function excluirSubmission(id: string) {
    const ok = window.confirm(
      "Isso vai APAGAR definitivamente esta submissao e todas as respostas. Confirmar?"
    );
    if (!ok) return;

    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/forms/submissions/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || json.ok === false) {
      setErr(json.error ?? "Falha ao excluir submissao.");
      return;
    }
    setMsg("Submissao excluida com sucesso.");
    await loadHistory();
  }

  async function limparDuplicados() {
    if (!templateId) return;
    const ok = window.confirm(
      "Isso vai apagar definitivamente submissoes duplicadas deste template para esta pessoa."
    );
    if (!ok) return;
    const typed = window.prompt("Digite APAGAR para confirmar:");
    if (typed !== "APAGAR") return;

    setErr(null);
    setMsg(null);

    const res = await fetch("/api/admin/forms/submissions/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoa_id: pessoaId,
        responsavel_id: responsavelId ?? null,
        template_id: templateId,
        keep: "latest",
      }),
    });
    const json = (await res.json()) as { data?: { kept_id: string | null; deleted_count: number }; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao limpar duplicados.");
      return;
    }

    const keptId = json.data?.kept_id ?? "N/A";
    const deletedCount = json.data?.deleted_count ?? 0;
    setMsg(`Duplicados removidos. Mantido: ${keptId}. Apagados: ${deletedCount}.`);
    await loadHistory();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Formulários internos</div>
          <div className="mt-1 text-sm text-slate-600">
            Envio e histórico de formulários vinculados a esta pessoa.
          </div>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            void load();
            void loadHistory();
          }}
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            onClick={limparDuplicados}
            disabled={loading || !templateId}
          >
            Limpar duplicados
          </button>
        </div>

        {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
        {primaryLink ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div>
              <span className="font-medium text-emerald-800">
                {shortLink ? "Link curto:" : "Link gerado:"}
              </span>{" "}
              <a
                href={primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline break-all"
              >
                {primaryLink}
              </a>
              <button
                className="ml-2 rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700"
                onClick={() => void navigator.clipboard?.writeText(primaryLink)}
                type="button"
              >
                Copiar
              </button>
            </div>
            {shortLink && publicLink && shortLink !== publicLink ? (
              <div className="mt-2 text-xs text-emerald-800">
                Link publico:{" "}
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline break-all"
                >
                  {publicLink}
                </a>
                <button
                  className="ml-2 rounded-md border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700"
                  onClick={() => void navigator.clipboard?.writeText(publicLink)}
                  type="button"
                >
                  Copiar
                </button>
              </div>
            ) : null}
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

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="text-sm font-medium text-slate-700">Histórico de formulários</div>
          {historyLoading ? (
            <div className="mt-2 text-xs text-slate-500">Carregando histórico...</div>
          ) : historyItems.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500">Nenhum envio registrado.</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-800">
                      {item.template?.nome ?? "Template"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Status: {item.has_answers ? "Respondido" : "Pendente"}
                  </div>
                  {item.submitted_at ? (
                    <div className="mt-1 text-xs text-slate-600">
                      Respondido em: {formatDate(item.submitted_at)}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {item.public_token ? (
                      <a
                        href={`/public/forms/${item.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 underline"
                      >
                        Abrir formulário
                      </a>
                    ) : null}
                    <Link href={`/admin/forms/submissions/${item.id}`} className="text-slate-700 underline">
                      Ver respostas
                    </Link>
                    <button
                      className="text-rose-700 underline"
                      onClick={() => void excluirSubmission(item.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
