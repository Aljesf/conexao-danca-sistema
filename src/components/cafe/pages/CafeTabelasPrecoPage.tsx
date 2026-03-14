"use client";

import { useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import CafeToolbar from "@/components/cafe/CafeToolbar";

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
};

const fieldClassName =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60";

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
      <CafeCard
        title="Política comercial do módulo"
        description="Defina a tabela principal e mantenha tabelas auxiliares prontas para o PDV e para o catálogo do Ballet Café."
      >
        <CafeToolbar
          title="Governança de preços"
          description="Use códigos claros e mantenha uma tabela principal ativa para evitar divergência no caixa."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <CafeCard
            title="Nova tabela de preço"
            description="Cadastre estruturas comerciais por perfil sem alterar a operação do dia."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Código</label>
                <input
                  className={fieldClassName}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex.: ALUNO"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input
                  className={fieldClassName}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Tabela Aluno"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Descrição</label>
                <input
                  className={fieldClassName}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Uso comercial, perfil atendido ou contexto da tabela"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Marcar como tabela principal
            </label>

            <div>
              <button className={primaryButtonClassName} onClick={() => void criar()}>
                Criar tabela
              </button>
            </div>
          </CafeCard>

          <CafeCard
            title="Tabelas cadastradas"
            description="Acompanhe a tabela principal e mantenha os cadastros ativos para uso no PDV e nos produtos."
          >
            <CafeSectionIntro
              title="Leitura rápida"
              description="A tabela principal governa o comportamento comercial padrão. As demais apoiam cenários específicos."
            />
            <div className="overflow-hidden rounded-[20px] border border-slate-200/80">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Principal</th>
                      <th className="px-4 py-3 text-left">Ativa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{item.codigo}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{item.nome}</div>
                          {item.descricao ? (
                            <div className="text-xs text-slate-500">{item.descricao}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{item.is_default ? "Sim" : "Não"}</td>
                        <td className="px-4 py-3">{item.ativo ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                    {data.length === 0 ? (
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-4 text-slate-500" colSpan={4}>
                          Nenhuma tabela cadastrada.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              A edição avançada de status e ordenação pode evoluir depois; nesta etapa o foco é
              manter a política comercial organizada e fácil de operar.
            </p>
          </CafeCard>
        </div>
      </CafeCard>
    </CafePageShell>
  );
}
