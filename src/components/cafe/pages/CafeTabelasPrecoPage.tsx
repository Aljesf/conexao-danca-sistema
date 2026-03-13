"use client";

import { useEffect, useMemo, useState } from "react";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import CafeToolbar from "@/components/cafe/CafeToolbar";
import SectionCard from "@/components/layout/SectionCard";

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
};

export default function CafeTabelasPrecoPage() {
  const [data, setData] = useState<TabelaPreco[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const tabelaPrincipal = useMemo(
    () => data.find((item) => item.is_default && item.ativo) ?? null,
    [data],
  );
  const tabelasAuxiliares = useMemo(
    () => data.filter((item) => item.ativo && !item.is_default).length,
    [data],
  );

  async function load() {
    const res = await fetch("/api/cafe/tabelas-preco");
    const json = (await res.json()) as { ok: boolean; data: TabelaPreco[] };
    setData(Array.isArray(json?.data) ? json.data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function criar() {
    if (!codigo.trim() || !nome.trim()) return;
    const res = await fetch("/api/cafe/tabelas-preco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        nome,
        descricao: descricao ? descricao : null,
        is_default: isDefault,
      }),
    });
    if (!res.ok) return;
    setCodigo("");
    setNome("");
    setDescricao("");
    setIsDefault(false);
    await load();
  }

  return (
    <CafePageShell
      eyebrow="Gestão do Café"
      title="Gestão do Ballet Café - Tabelas de preço"
      description="Organize a política comercial do módulo com tabelas principais e auxiliares para o PDV e o catálogo."
      summary={
        <>
          <CafeStatCard
            label="Total de tabelas"
            value={data.length}
            description="Estruturas de preço disponíveis para o contexto do café."
          />
          <CafeStatCard
            label="Tabela principal"
            value={tabelaPrincipal?.nome ?? "Não definida"}
            description="Base comercial usada como referência principal no módulo."
          />
          <CafeStatCard
            label="Tabelas auxiliares"
            value={tabelasAuxiliares}
            description="Perfis complementares para aluno, colaborador, evento ou ação específica."
          />
        </>
      }
    >
      <SectionCard
        title="Política comercial do módulo"
        description="Defina a tabela principal e mantenha tabelas auxiliares prontas para o PDV e para o catálogo do Ballet Café."
      >
        <CafeToolbar
          title="Governança de preços"
          description="Use códigos claros e mantenha uma tabela principal ativa para evitar divergência no caixa."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <SectionCard
            title="Nova tabela de preço"
            description="Cadastre estruturas comerciais por perfil sem alterar a operação do dia."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Código</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex.: ALUNO"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Tabela Aluno"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Descrição</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Uso comercial, perfil atendido ou contexto da tabela"
                />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Marcar como tabela principal
            </label>

            <div className="mt-4">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                onClick={() => void criar()}
              >
                Criar tabela
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Tabelas cadastradas"
            description="Acompanhe a tabela principal e mantenha os cadastros ativos para uso no PDV e nos produtos."
          >
            <CafeSectionIntro
              title="Leitura rápida"
              description="A tabela principal governa o comportamento comercial padrão. As demais apoiam cenários específicos."
            />
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Código</th>
                    <th className="px-2 py-2 text-left">Nome</th>
                    <th className="px-2 py-2 text-left">Principal</th>
                    <th className="px-2 py-2 text-left">Ativa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-2">{item.codigo}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-900">{item.nome}</div>
                        {item.descricao ? (
                          <div className="text-xs text-slate-500">{item.descricao}</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">{item.is_default ? "Sim" : "Não"}</td>
                      <td className="px-2 py-2">{item.ativo ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                  {data.length === 0 ? (
                    <tr className="border-t">
                      <td className="px-2 py-3 text-slate-500" colSpan={4}>
                        Nenhuma tabela cadastrada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              A edição avançada de status e ordenação pode evoluir depois; nesta etapa o foco é
              manter a política comercial organizada e fácil de operar.
            </p>
          </SectionCard>
        </div>
      </SectionCard>
    </CafePageShell>
  );
}
