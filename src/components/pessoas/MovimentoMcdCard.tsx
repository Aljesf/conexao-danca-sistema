"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Beneficiario = {
  id: string;
  pessoa_id: number | string;
  responsavel_id: number | null;
  status: string;
  ase_submission_id: string | null;
  ase_submitted_at: string | null;
  updated_at?: string | null;
};

type Template = { id: string; nome: string; status?: string | null };

function fmt(dt: string | null | undefined): string {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return String(dt);
  }
}

export default function MovimentoMcdCard({
  pessoaId,
  responsavelId,
}: {
  pessoaId: number;
  responsavelId?: number | null;
}) {
  const [loading, setLoading] = useState(true);
  const [benef, setBenef] = useState<Beneficiario | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [aseOk, setAseOk] = useState<boolean>(false);
  const [aseLastAt, setAseLastAt] = useState<string | null>(null);

  const aseLabel = useMemo(() => (aseOk ? "ok" : "pendente"), [aseOk]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const bRes = await fetch(`/api/admin/movimento/beneficiarios?pessoa_id=${pessoaId}`, {
        cache: "no-store",
      });
      const bJson = (await bRes.json()) as {
        ok?: boolean;
        data?: Beneficiario | Beneficiario[] | null;
        error?: string;
        message?: string;
      };
      if (!bRes.ok || bJson.ok === false) {
        throw new Error(bJson.error ?? bJson.message ?? "Falha ao carregar status do beneficiario.");
      }

      const benefFromApi = Array.isArray(bJson.data)
        ? bJson.data.find((item) => String(item.pessoa_id) === String(pessoaId)) ?? null
        : bJson.data ?? null;
      setBenef(benefFromApi);

      const tRes = await fetch("/api/admin/forms/templates", { cache: "no-store" });
      const tJson = (await tRes.json()) as { data?: Template[]; error?: string };
      if (!tRes.ok) throw new Error(tJson.error ?? "Falha ao carregar templates.");

      const aseTemplates = (tJson.data ?? []).filter((t) => {
        const nome = (t.nome ?? "").toLowerCase();
        return nome.startsWith("ase") && nome.includes("movimento");
      });
      if (aseTemplates.length === 0) {
        setAseOk(false);
        setAseLastAt(null);
        return;
      }

      const aseFromBenef = Boolean(
        (benefFromApi?.ase_submission_id ?? null) && (benefFromApi?.ase_submitted_at ?? null)
      );
      setAseOk(aseFromBenef);
      setAseLastAt(benefFromApi?.ase_submitted_at ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [pessoaId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ativarBeneficiario() {
    setErr(null);
    setMsg(null);

    const res = await fetch("/api/admin/movimento/beneficiarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa_id: pessoaId, responsavel_id: responsavelId ?? null }),
    });

    const json = (await res.json()) as { data?: Beneficiario; error?: string; code?: string };
    if (!res.ok) {
      if (json.code === "ASE_REQUIRED") {
        setErr(
          "ASE pendente. Use a aba \"Formularios Internos\" para gerar e coletar a ASE antes de ativar."
        );
        return;
      }
      setErr(json.error ?? "Falha ao ativar beneficiario.");
      return;
    }

    setMsg("Beneficiario ativado com sucesso.");
    await load();
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Movimento Conexao Danca</div>
            <div className="mt-1 text-sm text-slate-600">
              A ativacao de beneficiario depende de ASE preenchida.
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
            <p className="text-xs uppercase tracking-wide text-slate-400">Status beneficiario</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {benef?.status ?? "nao cadastrado"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Requisito ASE</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{aseLabel}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Ultima ASE</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{fmt(aseLastAt)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={ativarBeneficiario}
            disabled={loading}
            title={aseOk ? "" : "Necessario preencher a ASE antes de ativar."}
          >
            Ativar beneficiario
          </button>

          {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold">Concessoes recebidas</div>
          <div className="mt-1 text-sm text-slate-600">
            Esta area sera conectada ao historico de concessoes do Movimento.
          </div>
        </div>
      </div>
    </div>
  );
}

