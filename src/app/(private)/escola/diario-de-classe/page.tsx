"use client";

import { useMemo, useState, type ReactNode } from "react";

type AbaDiario = "frequencia" | "plano" | "conteudo" | "observacoes" | "avaliacoes";

export default function DiarioDeClassePage() {
  const [aba, setAba] = useState<AbaDiario>("frequencia");

  const tituloAba = useMemo(() => {
    switch (aba) {
      case "frequencia":
        return "Frequência";
      case "plano":
        return "Plano de aula";
      case "conteudo":
        return "Conteúdo do curso";
      case "observacoes":
        return "Observações pedagógicas";
      case "avaliacoes":
        return "Avaliações";
      default:
        return "Diário de classe";
    }
  }, [aba]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Diário de classe</h1>
        <p className="text-sm text-muted-foreground">
          Selecione a turma e registre a aula do dia: frequência, plano, observações e avaliações.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Professor</span>
            <div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
              (seleção será conectada na fase API)
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Turma</span>
            <div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
              (seleção será conectada na fase API)
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Data</span>
            <div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
              (padrão: hoje; será conectada na fase API)
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <BotaoAba ativo={aba === "frequencia"} onClick={() => setAba("frequencia")}>
            Frequência
          </BotaoAba>
          <BotaoAba ativo={aba === "plano"} onClick={() => setAba("plano")}>
            Plano de aula
          </BotaoAba>
          <BotaoAba ativo={aba === "conteudo"} onClick={() => setAba("conteudo")}>
            Conteúdo do curso
          </BotaoAba>
          <BotaoAba ativo={aba === "observacoes"} onClick={() => setAba("observacoes")}>
            Observações
          </BotaoAba>
          <BotaoAba ativo={aba === "avaliacoes"} onClick={() => setAba("avaliacoes")}>
            Avaliações
          </BotaoAba>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold">{tituloAba}</h2>

          {aba === "frequencia" ? (
            <div className="mt-3 rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Esta aba será a tela de frequências do Diário de classe. Na fase API, ela vai:
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                <li>criar/abrir a aula do dia (turma_aulas)</li>
                <li>listar alunos da turma</li>
                <li>registrar presença (turma_aula_presencas)</li>
                <li>permitir justificativa e auditoria</li>
              </ul>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Em construção. Este item faz parte do Diário de classe do professor.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BotaoAba(props: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  const base = "rounded-full px-4 py-2 text-sm transition border";
  const ativo = "bg-primary text-primary-foreground border-primary";
  const inativo = "bg-background text-foreground hover:bg-muted border-border";

  return (
    <button type="button" className={`${base} ${props.ativo ? ativo : inativo}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
