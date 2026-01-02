"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conjunto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type Grupo = {
  id: number;
  conjunto_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
};

export default function DocumentoConjuntoDetalhePage(props: { params: { id: string } }) {
  const conjuntoId = Number(props.params.id);

  const [conjunto, setConjunto] = useState<Conjunto | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [gCodigo, setGCodigo] = useState("");
  const [gNome, setGNome] = useState("");
  const [gDescricao, setGDescricao] = useState("");
  const [gObrigatorio, setGObrigatorio] = useState(false);
  const [gOrdem, setGOrdem] = useState("1");
  const [salvando, setSalvando] = useState(false);

  const helpItems = useMemo(
    () => [
      "Grupos são seções internas do conjunto (ex.: Documento principal, Termos obrigatórios, Termos opcionais).",
      "Use 'ordem' para organizar a sequência visual e operacional.",
      "Depois você vincula modelos a cada grupo.",
    ],
    []
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [resC, resG] = await Promise.all([
        fetch(`/api/documentos/conjuntos/${conjuntoId}`),
        fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`),
      ]);

      const jsonC = (await resC.json()) as { ok?: boolean; data?: Conjunto; message?: string };
      const jsonG = (await resG.json()) as { ok?: boolean; data?: Grupo[]; message?: string };

      if (!resC.ok || !jsonC.ok) throw new Error(jsonC.message ?? "Falha ao carregar conjunto.");
      if (!resG.ok || !jsonG.ok) throw new Error(jsonG.message ?? "Falha ao carregar grupos.");

      setConjunto(jsonC.data ?? null);
      setGrupos(jsonG.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [conjuntoId]);

  async function criarGrupo() {
    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const ordemNum = Number(gOrdem);
      const res = await fetch(`/api/documentos/conjuntos/${conjuntoId}/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: gCodigo,
          nome: gNome,
          descricao: gDescricao.trim() ? gDescricao.trim() : null,
          obrigatorio: gObrigatorio,
          ordem: Number.isFinite(ordemNum) ? ordemNum : 1,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; data?: Grupo; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Falha ao criar grupo.");

      setGCodigo("");
      setGNome("");
      setGDescricao("");
      setGObrigatorio(false);
      setGOrdem("1");
      setOkMsg("Grupo criado com sucesso.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar grupo.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(conjuntoId)) return;
    void carregar();
  }, [carregar, conjuntoId]);

  if (!Number.isFinite(conjuntoId)) {
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
        title={conjunto ? `Conjunto — ${conjunto.nome}` : "Conjunto — Carregando..."}
        subtitle={conjunto ? `Código: ${conjunto.codigo}` : "Carregando dados do conjunto..."}
      >
        <div className="mt-2 flex gap-4">
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos/conjuntos">
            Voltar aos Conjuntos
          </Link>
          <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
            Hub de Documentos
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

      <SystemSectionCard title="Cadastrar grupo" description="Crie um grupo dentro deste conjunto.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <Input value={gCodigo} onChange={(e) => setGCodigo(e.target.value)} placeholder="Ex.: DOCUMENTO_PRINCIPAL" />
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={gNome} onChange={(e) => setGNome(e.target.value)} placeholder="Ex.: Documento principal" />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input value={gDescricao} onChange={(e) => setGDescricao(e.target.value)} placeholder="Opcional (uso interno)." />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={gObrigatorio} onChange={(e) => setGObrigatorio(e.target.checked)} />
            <span className="text-sm">Obrigatório</span>
          </div>

          <div>
            <label className="text-sm font-medium">Ordem</label>
            <Input value={gOrdem} onChange={(e) => setGOrdem(e.target.value)} placeholder="Ex.: 1" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button onClick={() => void criarGrupo()} disabled={salvando || !gCodigo.trim() || !gNome.trim()}>
            {salvando ? "Salvando..." : "Criar grupo"}
          </Button>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Grupos cadastrados" description="Clique em um grupo para vincular modelos.">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : grupos.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum grupo cadastrado.</div>
        ) : (
          <div className="grid gap-3">
            {grupos.map((g) => (
              <Link key={g.id} href={`/admin/config/documentos/grupos/${g.id}`} className="no-underline">
                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition">
                  <div className="font-semibold">
                    {g.ordem}. {g.nome}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Código: {g.codigo} • Obrigatório: {g.obrigatorio ? "Sim" : "Não"}
                  </div>
                  {g.descricao ? <div className="text-sm text-slate-600 mt-2">{g.descricao}</div> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
