"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Origem = "PESSOA" | "RESPONSAVEL" | "MATRICULA" | "FINANCEIRO" | "MANUAL";
type Tipo = "TEXTO" | "MONETARIO" | "DATA";

type Variavel = {
  id: number;
  codigo: string;
  descricao: string;
  origem: Origem;
  tipo: Tipo;
  path_origem: string | null;
  formato: string | null;
  ativo: boolean;
};

const ORIGENS: Origem[] = ["PESSOA", "RESPONSAVEL", "MATRICULA", "FINANCEIRO", "MANUAL"];
const TIPOS: Tipo[] = ["TEXTO", "MONETARIO", "DATA"];

export default function AdminContratosVariaveisPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [itens, setItens] = useState<Variavel[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState<Origem>("PESSOA");
  const [tipo, setTipo] = useState<Tipo>("TEXTO");
  const [pathOrigem, setPathOrigem] = useState("");
  const [formato, setFormato] = useState("");
  const [ativo, setAtivo] = useState(true);

  const precisaPath = origem !== "MANUAL";

  const opcoesFormato = useMemo(() => {
    if (tipo === "MONETARIO") return ["BRL"];
    if (tipo === "DATA") return ["DATA_CURTA"];
    return [];
  }, [tipo]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/variaveis");
      const json = (await res.json()) as { data?: Variavel[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar variaveis.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  const limparFormulario = () => {
    setEditingId(null);
    setCodigo("");
    setDescricao("");
    setOrigem("PESSOA");
    setTipo("TEXTO");
    setPathOrigem("");
    setFormato("");
    setAtivo(true);
  };

  const editar = (item: Variavel) => {
    setEditingId(item.id);
    setCodigo(item.codigo);
    setDescricao(item.descricao);
    setOrigem(item.origem);
    setTipo(item.tipo);
    setPathOrigem(item.path_origem ?? "");
    setFormato(item.formato ?? "");
    setAtivo(item.ativo);
    setOkMsg(null);
    setErro(null);
  };

  const salvar = async () => {
    setSaving(true);
    setErro(null);
    setOkMsg(null);

    if (!codigo.trim() || !descricao.trim()) {
      setErro("Codigo e descricao sao obrigatorios.");
      setSaving(false);
      return;
    }

    if (precisaPath && !pathOrigem.trim()) {
      setErro("Path tecnico obrigatorio para origem nao MANUAL.");
      setSaving(false);
      return;
    }

    const payload = {
      id: editingId ?? undefined,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      origem,
      tipo,
      path_origem: precisaPath ? pathOrigem.trim() : null,
      formato: formato.trim() || null,
      ativo,
    };

    try {
      const res = await fetch("/api/contratos/variaveis", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar variavel.");
      setOkMsg(editingId ? "Variavel atualizada com sucesso." : "Variavel criada com sucesso.");
      limparFormulario();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const desativar = async (id: number) => {
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/contratos/variaveis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao desativar.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <SystemPage>
      <SystemContextCard
        title="Contratos - Variaveis"
        subtitle="Cadastre variaveis reutilizaveis para gerar placeholders automaticamente."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/contratos">
          Voltar ao hub de Contratos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Use codigo em CAIXA ALTA, ex: ALUNO_NOME.",
          "Origem MANUAL dispensa path tecnico.",
          "Variaveis inativas nao aparecem para selecao nos modelos.",
        ]}
      />

      <SystemSectionCard
        title={editingId ? "Editar variavel" : "Cadastrar variavel"}
        description="Defina origem, tipo e path tecnico para gerar o placeholder automaticamente."
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={limparFormulario} disabled={saving}>
              Limpar
            </Button>
            <Button onClick={() => void salvar()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar variavel"}
            </Button>
          </div>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {okMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Codigo</label>
            <div className="mt-1">
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ALUNO_NOME" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <div className="mt-1">
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Nome do aluno" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Origem</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={origem}
              onChange={(e) => setOrigem(e.target.value as Origem)}
            >
              {ORIGENS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Formato</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              disabled={opcoesFormato.length === 0}
            >
              <option value="">Sem formato</option>
              {opcoesFormato.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {precisaPath ? (
            <div className="md:col-span-3">
              <label className="text-sm font-medium">Path tecnico</label>
              <div className="mt-1">
                <Input
                  value={pathOrigem}
                  onChange={(e) => setPathOrigem(e.target.value)}
                  placeholder="ex: nome | ano_referencia | valor_total_contratado_centavos"
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="text-sm">Ativo</span>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Variaveis cadastradas" description="Edite ou desative variaveis existentes.">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma variavel cadastrada.</p>
        ) : (
          <div className="grid gap-3">
            {itens.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {item.codigo} <span className="text-xs text-slate-600">({item.tipo})</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {item.descricao} | Origem: {item.origem} | Ativo: {item.ativo ? "Sim" : "Nao"}
                    </div>
                    {item.path_origem ? (
                      <div className="mt-1 text-xs text-slate-500">Path: {item.path_origem}</div>
                    ) : null}
                    {item.formato ? (
                      <div className="mt-1 text-xs text-slate-500">Formato: {item.formato}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => editar(item)}>
                      Editar
                    </Button>
                    {item.ativo ? (
                      <Button variant="secondary" onClick={() => void desativar(item.id)}>
                        Desativar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
