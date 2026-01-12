"use client";

import * as React from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

type ApiResp =
  | { ok: true; data: { id: number; created_at: string } }
  | { ok: false; error: string };

const NOTE_EMOJI = String.fromCodePoint(0x1f4dd);

function getContextSnapshot() {
  const w = typeof window !== "undefined" ? window : null;
  return {
    full_url: w?.location?.href ?? null,
    pathname: w?.location?.pathname ?? null,
    page_title: w?.document?.title ?? null,
    user_agent: w?.navigator?.userAgent ?? null,
    viewport_json: w ? { w: w.innerWidth, h: w.innerHeight } : {},
  };
}

export function NascDrawer({ open, onClose }: DrawerProps) {
  const [texto, setTexto] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setErro(null);
      setOkMsg(null);
      setTexto("");
    }
  }, [open]);

  const salvar = async () => {
    setErro(null);
    setOkMsg(null);

    const observacao = texto.trim();
    if (!observacao) {
      setErro("Escreva uma observacao antes de salvar.");
      return;
    }

    setLoading(true);
    try {
      const snap = getContextSnapshot();

      const resp = await fetch("/api/nasc/observacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_context: null,
          pathname: snap.pathname,
          full_url: snap.full_url,
          page_title: snap.page_title,
          entity_ref: null,
          observacao,
          user_agent: snap.user_agent,
          viewport_json: snap.viewport_json,
          context_json: {},
        }),
      });

      const contentType = resp.headers.get("content-type") ?? "";
      let json: ApiResp | null = null;

      if (contentType.includes("application/json")) {
        json = (await resp.json()) as ApiResp;
      } else {
        const text = await resp.text();
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("NASC: resposta nao-JSON do backend", { status: resp.status, text });
        }
        setErro("Falha ao salvar (resposta inesperada do servidor). Verifique o console do servidor.");
        return;
      }

      if (!resp.ok || !json.ok) {
        setErro(!json.ok ? json.error : "Falha ao salvar observacao.");
        return;
      }

      setOkMsg("Observacao registrada com sucesso.");
      setTexto("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar observacao.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l flex flex-col">
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">
              {NOTE_EMOJI} Registro de Observacoes Operacionais
            </div>
            <div className="text-base font-semibold">Anotacao contextual (NASC)</div>
            <div className="text-xs text-slate-500 mt-1">
              O sistema captura automaticamente a tela/URL atual. Escreva a observacao e salve.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-md border hover:bg-slate-50"
            aria-label="Fechar"
            title="Fechar"
          >
            x
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <label className="text-sm font-medium">Observacao</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            className="mt-2 w-full rounded-md border p-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
            placeholder="Ex.: Ao cadastrar curso, o botao salvar nao faz nada. Ocorre apos selecionar metodologia..."
          />

          {erro ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          ) : null}

          {okMsg ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {okMsg}
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={loading}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar observacao"}
            </button>
            <a
              href="/api/nasc/observacoes/export?days=30"
              className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
              target="_blank"
              rel="noreferrer"
              title="Baixar CSV (ultimos 30 dias)"
            >
              Exportar CSV
            </a>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Dica: use linguagem direta: &quot;o que&quot;, &quot;onde&quot;, &quot;como reproduzir&quot;.
          </div>
        </div>
      </div>
    </div>
  );
}
