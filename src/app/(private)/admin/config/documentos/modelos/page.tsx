"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DocumentoModelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
  texto_modelo_md: string;
  placeholders_schema_json: unknown;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminDocumentosModelosPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<DocumentoModelo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [novoTipo, setNovoTipo] = useState("REGULAR");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoTexto, setNovoTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const tipos = useMemo(() => ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"], []);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/modelos", { method: "GET" });
      const json = (await res.json()) as { data?: DocumentoModelo[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function criarModelo() {
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_contrato: novoTipo,
          titulo: novoTitulo.trim(),
          texto_modelo_md: novoTexto,
          ativo: true,
          placeholders_schema_json: [],
          observacoes: null,
        }),
      });
      const json = (await res.json()) as { data?: DocumentoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar modelo.");
      setNovoTitulo("");
      setNovoTexto("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar modelo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Modelos"
        subtitle="Templates e placeholders para emissao futura (MVP sem PDF e sem assinatura digital)."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Crie um modelo inicial e use a tela de detalhe para ajustar texto e schema.",
          "Use placeholders em CAIXA ALTA para variaveis de documento.",
          "Modelos ativos ficam disponiveis para emissao.",
        ]}
      />

      <SystemSectionCard
        title="Novo modelo"
        description="Crie o template inicial e depois edite schema e texto no detalhe."
        footer={
          <Button onClick={() => void criarModelo()} disabled={saving || !novoTitulo.trim() || !novoTexto.trim()}>
            {saving ? "Salvando..." : "Criar modelo"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
            >
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Titulo</label>
            <div className="mt-1">
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex.: Documento Regular 2026 (v1.0)"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium">Texto do modelo (Markdown)</label>
            <div className="mt-1">
              <Textarea
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                rows={10}
                placeholder="Cole aqui o texto do modelo com placeholders, ex.: {{ALUNO_NOME}}"
              />
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard
        title="Modelos cadastrados"
        description="Use Editar para ajustar texto e schema no padrao do sistema."
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum modelo cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {itens.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold">
                    [{m.tipo_contrato}] {m.titulo} <span className="opacity-70">({m.versao})</span>
                  </div>
                  <div className="text-xs text-slate-600">ID: {m.id} | Ativo: {m.ativo ? "Sim" : "Nao"}</div>
                  <div>
                    <Link className="text-sm underline" href={`/admin/config/documentos/modelos/${m.id}`}>
                      Editar
                    </Link>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-slate-600">Ver texto</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm">{m.texto_modelo_md}</pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
