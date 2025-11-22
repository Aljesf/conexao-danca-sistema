"use client";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="h1">Visão Geral</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="text-xs text-[var(--muted)]">Alunos ativos</div>
          <div className="mt-1 text-3xl font-semibold">343</div>
        </div>

        <div className="card">
          <div className="text-xs text-[var(--muted)]">Matrículas vigentes</div>
          <div className="mt-1 text-3xl font-semibold">261</div>
        </div>

        <div className="card">
          <div className="text-xs text-[var(--muted)]">Pendências</div>
          <div className="mt-1 text-3xl font-semibold text-[var(--violet)]">14</div>
        </div>

        <div className="card">
          <div className="text-xs text-[var(--muted)]">Novos interessados</div>
          <div className="mt-1 text-3xl font-semibold">11</div>
        </div>
      </div>

      <div className="card">
        <div className="h2 mb-3">Atalhos</div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/alunos">Alunos</a>
          <a className="btn" href="/turmas">Turmas</a>
          <a className="btn" href="/professores">Professores</a>
          <a className="btn primary" href="/financeiro">Financeiro</a>
        </div>
      </div>
    </div>
  );
}
