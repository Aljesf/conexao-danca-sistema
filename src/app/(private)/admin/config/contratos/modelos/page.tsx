"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContratoModelo = {
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

export default function AdminContratosModelosPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ContratoModelo[]>([]);
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
      const res = await fetch("/api/contratos/modelos", { method: "GET" });
      const json = (await res.json()) as { data?: ContratoModelo[]; error?: string };
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
      const res = await fetch("/api/contratos/modelos", {
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
      const json = (await res.json()) as { data?: ContratoModelo; error?: string };
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
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Contratos - Modelos</h1>
        <p className="text-sm opacity-80">
          Templates e placeholders para emissao futura (MVP sem PDF e sem assinatura digital).
        </p>
        <div className="mt-2">
          <Link className="text-sm underline opacity-80" href="/admin/config/contratos">
            Voltar ao hub de Contratos
          </Link>
        </div>
      </div>

      {erro ? (
        <Card className="border-red-300">
          <CardContent className="text-sm text-red-700">{erro}</CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo modelo</CardTitle>
          <CardDescription>Crie o template inicial e depois edite schema e texto no detalhe.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
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
                  placeholder="Ex.: Contrato Regular 2026 (v1.0)"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
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
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => void criarModelo()} disabled={saving || !novoTitulo.trim() || !novoTexto.trim()}>
            {saving ? "Salvando..." : "Criar modelo"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Modelos cadastrados</CardTitle>
          <CardDescription>Use Editar para ajustar texto e schema no padrao do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm opacity-80">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="text-sm opacity-80">Nenhum modelo cadastrado.</p>
          ) : (
            <div className="grid gap-3">
              {itens.map((m) => (
                <Card key={m.id} className="bg-white/40">
                  <CardHeader>
                    <CardTitle>
                      [{m.tipo_contrato}] {m.titulo} <span className="opacity-70">({m.versao})</span>
                    </CardTitle>
                    <CardDescription>ID: {m.id} | Ativo: {m.ativo ? "Sim" : "Nao"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link className="text-sm underline" href={`/admin/config/contratos/modelos/${m.id}`}>
                      Editar
                    </Link>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm opacity-80">Ver texto</summary>
                      <pre className="whitespace-pre-wrap mt-2 text-sm">{m.texto_modelo_md}</pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
