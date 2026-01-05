"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TipoConta = "ALUNO" | "COLABORADOR";

type ConfigRow = {
  id: number;
  tipo_conta: TipoConta;
  dia_fechamento: number;
  dia_vencimento: number;
  tolerancia_dias: number;
  multa_percentual: number;
  juros_dia_percentual: number;
  ativo: boolean;
};

type ApiListResponse = { ok: boolean; data: ConfigRow[] };
type ApiPutResponse = { ok: boolean; data?: ConfigRow; error?: string; detail?: string };

function safeNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function CicloPoliticaCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TipoConta>("ALUNO");
  const [configs, setConfigs] = useState<Record<TipoConta, ConfigRow | null>>({
    ALUNO: null,
    COLABORADOR: null,
  });

  const current = useMemo(() => configs[tab], [configs, tab]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credito-conexao/configuracoes", { method: "GET" });
      const json = (await res.json()) as ApiListResponse;
      const list = json.data ?? [];
      const aluno = list.find((x) => x.tipo_conta === "ALUNO") ?? null;
      const colab = list.find((x) => x.tipo_conta === "COLABORADOR") ?? null;
      setConfigs({ ALUNO: aluno, COLABORADOR: colab });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch<K extends keyof ConfigRow>(key: K, value: ConfigRow[K]) {
    setConfigs((prev) => {
      const cur = prev[tab];
      if (!cur) return prev;
      return { ...prev, [tab]: { ...cur, [key]: value } };
    });
  }

  async function save() {
    if (!current) return;

    if (current.dia_fechamento < 1 || current.dia_fechamento > 31) {
      alert("Dia de fechamento invalido. Use 1 a 31.");
      return;
    }
    if (current.dia_vencimento < 1 || current.dia_vencimento > 31) {
      alert("Dia de vencimento invalido. Use 1 a 31.");
      return;
    }
    if (current.tolerancia_dias < 0 || current.tolerancia_dias > 30) {
      alert("Tolerancia invalida. Use 0 a 30.");
      return;
    }
    if (current.multa_percentual < 0 || current.juros_dia_percentual < 0) {
      alert("Multa e juros nao podem ser negativos.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/credito-conexao/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_conta: current.tipo_conta,
          dia_fechamento: current.dia_fechamento,
          dia_vencimento: current.dia_vencimento,
          tolerancia_dias: current.tolerancia_dias,
          multa_percentual: current.multa_percentual,
          juros_dia_percentual: current.juros_dia_percentual,
          ativo: current.ativo,
        }),
      });

      const json = (await res.json()) as ApiPutResponse;
      if (!res.ok || !json.ok || !json.data) {
        alert(`Falha ao salvar: ${json.error ?? "erro_desconhecido"}`);
        return;
      }

      setConfigs((prev) => ({ ...prev, [tab]: json.data! }));
      alert("Configuracoes salvas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ciclo e politica do Cartao Conexao</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground">
          Configure o dia de fechamento e o dia de vencimento do cartao por tipo de conta. Multa e juros sao parametros
          institucionais declarativos nesta fase (nao sao aplicados automaticamente no calculo).
        </div>

        <div className="mt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TipoConta)}>
            <TabsList>
              <TabsTrigger value="ALUNO">Aluno</TabsTrigger>
              <TabsTrigger value="COLABORADOR">Colaborador</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading || !current ? (
                <div className="mt-4 text-sm text-muted-foreground">Carregando configuracoes...</div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Dia de fechamento</div>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={current.dia_fechamento}
                      onChange={(e) => patch("dia_fechamento", safeNumber(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Dia de vencimento</div>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={current.dia_vencimento}
                      onChange={(e) => patch("dia_vencimento", safeNumber(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Tolerancia (dias)</div>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={current.tolerancia_dias}
                      onChange={(e) => patch("tolerancia_dias", safeNumber(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Multa (%)</div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={current.multa_percentual}
                      onChange={(e) => patch("multa_percentual", safeNumber(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Juros ao dia (%)</div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={current.juros_dia_percentual}
                      onChange={(e) => patch("juros_dia_percentual", safeNumber(e.target.value))}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Button onClick={() => void save()} disabled={saving}>
                      {saving ? "Salvando..." : "Salvar configuracoes"}
                    </Button>

                    <Button variant="secondary" onClick={() => void load()} disabled={saving}>
                      Recarregar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
