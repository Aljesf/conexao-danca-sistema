"use client";

import { useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";

type Curso = { id: number; nome: string; metodologia?: string };
type Nivel = { id: number; cursoId: number; nome: string; faixaEtaria?: string };
type Conteudo = { id: number; nivelId: number; nome: string; ordem: number; obrigatorio: boolean; descricao?: string };
type Habilidade = { id: number; conteudoId: number; nome: string; tipo: string };

const cursosSeed: Curso[] = [
  { id: 1, nome: "Ballet", metodologia: "Vaganova" },
  { id: 2, nome: "Jazz", metodologia: "Jazz for Fun" },
];

const niveisSeed: Nivel[] = [
  { id: 1, cursoId: 1, nome: "Nivel 1", faixaEtaria: "6-8 anos" },
  { id: 2, cursoId: 1, nome: "Nivel 2", faixaEtaria: "8-10 anos" },
  { id: 3, cursoId: 2, nome: "Iniciante", faixaEtaria: "Livre" },
];

const conteudosSeed: Conteudo[] = [
  { id: 1, nivelId: 1, nome: "Plies basicos", ordem: 1, obrigatorio: true, descricao: "Fundamentos" },
  { id: 2, nivelId: 1, nome: "Port de bras", ordem: 2, obrigatorio: false, descricao: "Alongamento" },
  { id: 3, nivelId: 3, nome: "Isolamentos", ordem: 1, obrigatorio: true, descricao: "Coordenação" },
];

const habilidadesSeed: Habilidade[] = [
  { id: 1, conteudoId: 1, nome: "Plie em 1a", tipo: "Tecnica" },
  { id: 2, conteudoId: 3, nome: "Isolamento de cabeça", tipo: "Tecnica" },
];

export default function FiltroAcademicoPage() {
  const [cursoId, setCursoId] = useState<number>(cursosSeed[0].id);
  const [nivelId, setNivelId] = useState<number | "">("");
  const [conteudoId, setConteudoId] = useState<number | "">("");

  const cursos = cursosSeed;
  const niveis = niveisSeed.filter((n) => n.cursoId === cursoId);
  const conteudos = conteudosSeed.filter((c) => (nivelId ? c.nivelId === nivelId : true));

  const cursoAtual = cursos.find((c) => c.id === cursoId);
  const nivelAtual = niveis.find((n) => n.id === nivelId);
  const conteudoAtual = conteudosSeed.find((c) => c.id === conteudoId);
  const habilidades = useMemo(
    () => habilidadesSeed.filter((h) => (conteudoId ? h.conteudoId === conteudoId : true)),
    [conteudoId]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <FormCard title="Filtro direto" description="Selecione Curso, Nível e Conteúdo para ver detalhes e habilidades.">
          <div className="grid gap-3 md:grid-cols-3">
            <FormInput
              label="Curso"
              as="select"
              value={cursoId}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCursoId(v);
                const firstNivel = niveisSeed.find((n) => n.cursoId === v)?.id || "";
                setNivelId(firstNivel);
                const firstConteudo = conteudosSeed.find((c) => c.nivelId === firstNivel)?.id || "";
                setConteudoId(firstConteudo);
              }}
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </FormInput>
            <FormInput
              label="Nivel"
              as="select"
              value={nivelId}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : "";
                setNivelId(v);
                const firstConteudo = conteudosSeed.find((c) => c.nivelId === v)?.id || "";
                setConteudoId(firstConteudo);
              }}
            >
              <option value="">Selecione</option>
              {niveis.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </FormInput>
            <FormInput
              label="Conteudo"
              as="select"
              value={conteudoId}
              onChange={(e) => setConteudoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione</option>
              {conteudos
                .filter((c) => (nivelId ? c.nivelId === nivelId : true))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </FormInput>
          </div>
        </FormCard>

        {cursoAtual && nivelAtual && conteudoAtual && (
          <div className="space-y-4">
            <FormCard title={cursoAtual.nome} description={cursoAtual.metodologia || "Sem metodologia"}>
              <p className="text-sm text-slate-600">Curso selecionado.</p>
            </FormCard>

            <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
              <div className="text-sm font-semibold text-slate-800">
                Curso ({cursoAtual.nome}) → Nivel ({nivelAtual.nome}) → Conteudo ({conteudoAtual.nome}) → Habilidades
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
              <div className="text-lg font-semibold text-slate-900">{nivelAtual.nome}</div>
              <div className="text-sm text-slate-600">{nivelAtual.faixaEtaria || "Sem faixa"}</div>
              <div className="mt-3 rounded-md bg-slate-50 p-3 border border-slate-100">
                <div className="font-semibold text-slate-900">{conteudoAtual.nome}</div>
                <div className="text-xs text-slate-600">
                  Ordem {conteudoAtual.ordem} • {conteudoAtual.obrigatorio ? "Obrigatorio" : "Opcional"}
                </div>
                <div className="text-xs text-slate-500">{conteudoAtual.descricao || "Sem descricao"}</div>
                <div className="mt-2 space-y-1">
                  {habilidades.length === 0 && (
                    <div className="text-sm text-slate-500">Nenhuma habilidade cadastrada.</div>
                  )}
                  {habilidades.map((h) => (
                    <div
                      key={h.id}
                      className="text-sm text-slate-800 flex items-center justify-between rounded bg-white px-2 py-1"
                    >
                      <span>{h.nome}</span>
                      <span className="text-xs text-slate-500">{h.tipo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
