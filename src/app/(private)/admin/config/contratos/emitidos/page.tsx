"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Emitido = {
  id: number;
  matricula_id: number;
  contrato_modelo_id: number;
  status_assinatura: string;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
};

export default function AdminContratosEmitidosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<Emitido[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/emitidos");
      const json = (await res.json()) as { data?: Emitido[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar emitidos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Contratos Emitidos</h1>
        <p className="text-sm opacity-80">Lista simples dos contratos emitidos (MVP).</p>
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

      {loading ? (
        <p className="text-sm opacity-80 mt-3">Carregando...</p>
      ) : itens.length === 0 ? (
        <p className="text-sm opacity-80 mt-3">Nenhum contrato emitido ainda.</p>
      ) : (
        <div className="grid gap-3">
          {itens.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>Contrato #{c.id}</CardTitle>
                <CardDescription>
                  Matricula: {c.matricula_id} | Modelo: {c.contrato_modelo_id} | Status: {c.status_assinatura}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm opacity-80">Criado: {new Date(c.created_at).toLocaleString("pt-BR")}</div>
                <div className="text-sm opacity-80 mt-1">PDF: {c.pdf_url ? "Disponivel" : "-"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
