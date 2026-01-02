"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";

type Grupo = {
  id: number;
  conjunto_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
};

type Modelo = {
  id: number;
  tipo_documento?: string | null;
  titulo: string;
  versao: string;
  ativo: boolean;
};

export default function DocumentosGrupoModelosPage(props: { params: { grupoId: string } }) {
  const grupoId = Number(props.params.grupoId);

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const helpItems = useMemo(
    () => [
      "Selecione os modelos que podem ser usados dentro deste grupo.",
      "Ao salvar, o vínculo é definido por 'set' (substitui a lista inteira).",
      "Modelos inativos ainda podem aparecer em histórico; prefira manter ativos apenas os válidos.",
    ],
    []
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const [resGrupo, resModelos, resVinc] = await Promise.all([
        fetch(`/api/documentos/grupos/${grupoId}`),
        fetch(`/api/documentos/modelos`),
        fetch(`/api/documentos/grupos/${grupoId}/modelos`),
      ]);

      const jGrupo = (await resGrupo.json()) as { ok?: boolean; data?: Grupo; message?: string };
      const jModelos = (await resModelos.json()) as { ok?: boolean; data?: Modelo[]; message?: string };
      const jVinc = (await resVinc.json()) as { ok?: boolean; data?: number[]; message?: string };

      if (!resGrupo.ok || !jGrupo.ok) throw new Error(jGrupo.message ?? "Falha ao carregar grupo.");
      if (!resModelos.ok || !jModelos.ok) throw new Error(jModelos.message ?? "Falha ao carregar modelos.");
      if (!resVinc.ok || !jVinc.ok) throw new Error(jVinc.message ?? "Falha ao carregar vínculos.");

      setGrupo(jGrupo.data ?? null);
      setModelos(jModelos.data ?? []);

      const sel = new Set<number>();
      for (const id of jVinc.data ?? []) sel.add(Number(id));
      setSelecionados(sel);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [grupoId]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const ids = Array.from(selecionados.values());
      const res = await fetch(`/api/documentos/grupos/${grupoId}/modelos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_modelo_ids: ids }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao salvar vínculos.");
      setOkMsg("Vínculos salvos com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function toggle(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!Number.isFinite(grupoId)) return;
    void carregar();
  }, [carregar, grupoId]);

  if (!Number.isFinite(grupoId)) {
    return (
      <SystemPage>
        <SystemSectionCard title="Erro" description="Parâmetro inválido.">
          <div className="text-sm text-red-700">ID inválido.</div>
        </SystemSectionCard>
      </SystemPage>
    );
  }

  return (
    <SystemPage>
      <SystemContextCard
        title={grupo ? `Grupo — ${grupo.nome}` : "Grupo — Carregando..."}
        subtitle={
          grupo
            ? `Código: ${grupo.codigo} • Obrigatório: ${grupo.obrigatorio ? "Sim" : "Não"}`
            : "Carregando dados do grupo..."
        }
      >
        <div className="mt-2 flex gap-4">
          {grupo?.conjunto_id ? (
            <Link className="text-sm underline text-slate-600" href={`/admin/config/documentos/conjuntos/${grupo.conjunto_id}`}>
              Voltar ao Conjunto
            </Link>
          ) : null}
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos/conjuntos">
            Conjuntos
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard items={helpItems} />

      {erro ? (
        <SystemSectionCard title="Erro" description="Corrija antes de continuar.">
          <div className="text-sm text-red-700">{erro}</div>
        </SystemSectionCard>
      ) : null}

      {okMsg ? (
        <SystemSectionCard title="Sucesso" description="Operação concluída.">
          <div className="text-sm text-green-700">{okMsg}</div>
        </SystemSectionCard>
      ) : null}

      <SystemSectionCard title="Modelos disponíveis" description="Marque os modelos permitidos para este grupo e salve.">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : modelos.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum modelo encontrado.</div>
        ) : (
          <div className="grid gap-2">
            {modelos.map((m) => {
              const labelTipo = m.tipo_documento ?? "-";
              const checked = selecionados.has(m.id);
              return (
                <label key={m.id} className="flex items-start gap-3 border border-slate-200 rounded-xl p-3 bg-white">
                  <input type="checkbox" checked={checked} onChange={() => toggle(m.id)} className="mt-1" />
                  <div>
                    <div className="font-semibold">{m.titulo}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      ID: {m.id} • Tipo: {labelTipo} • Versão: {m.versao} • Ativo: {m.ativo ? "Sim" : "Não"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar vínculos"}
          </Button>
        </div>
      </SystemSectionCard>
    </SystemPage>
  );
}
