"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function Section({ id, title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const v = localStorage.getItem(`sec:${id}`);
    if (v !== null) setOpen(v === "1");
  }, [id]);

  useEffect(() => {
    localStorage.setItem(`sec:${id}`, open ? "1" : "0");
  }, [id, open]);

  return (
    <div className="sec">
      <button
        type="button"
        className="sec-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`caret ${open ? "rot" : ""}`}>▾</span>
        <span className="sec-title">{title}</span>
      </button>

      <ul className={`nav-list ${open ? "open" : "closed"}`}>{children}</ul>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="sidebar">

      {/* topo com a logo */}
      <a href="/" className="brand" aria-label="Início">
        <Image
          src="/logo-conexao.png"
          alt="Conexão Dança"
          width={160}
          height={70}
          priority
          className="logo"
        />
      </a>

      {/* ---- PESSOAS ---- */}
      <Section id="pessoas" title="Pessoas">
        <li><a className="nav-link" href="/"><span className="nav-label">🏠 Início</span></a></li>
        <li><a className="nav-link" href="/pessoas"><span className="nav-label">👥 Ver todas as pessoas</span></a></li>
        <li><a className="nav-link" href="/crm"><span className="nav-label">⭐ Interessados (CRM)</span></a></li>
        <li><a className="nav-link" href="/professores"><span className="nav-label">🧑‍🏫 Professores</span></a></li>
      </Section>

      {/* ---- ALUNOS ---- */}
      <Section id="alunos" title="Alunos">
        <li><a className="nav-link" href="/alunos?novo=1"><span className="nav-label">👟 Cadastrar aluno</span></a></li>
        <li><a className="nav-link" href="/alunos"><span className="nav-label">🔎 Consultar alunos</span></a></li>
        <li><a className="nav-link" href="/alunos/historico"><span className="nav-label">🧾 Histórico do aluno</span></a></li>
      </Section>

      {/* ---- TURMAS ---- */}
      <Section id="turmas" title="Turmas">
        <li><a className="nav-link" href="/turmas"><span className="nav-label">📅 Consultar turmas</span></a></li>
        <li><a className="nav-link" href="/turmas?novo=1"><span className="nav-label">➕ Cadastrar turma</span></a></li>
        <li><a className="nav-link" href="/turmas/grade"><span className="nav-label">🗓️ Grade de horários</span></a></li>
      </Section>

      {/* ---- FINANCEIRO ---- */}
      <Section id="fin" title="Financeiro" defaultOpen={false}>
        <li><a className="nav-link" href="/financeiro/pagar"><span className="nav-label">💳 Contas a pagar</span></a></li>
        <li><a className="nav-link" href="/financeiro/receber"><span className="nav-label">💵 Contas a receber</span></a></li>
        <li><a className="nav-link" href="/financeiro/caixa"><span className="nav-label">📈 Movimentação diária</span></a></li>
      </Section>

      {/* ---- RELATÓRIOS ---- */}
      <Section id="relatorios" title="Relatórios" defaultOpen={false}>
        <li>
          <a className="nav-link" href="/relatorios/auditoria">
            <span className="nav-label">📊 Auditoria do Sistema</span>
          </a>
        </li>
      </Section>

      {/* ---- CONFIGURAÇÕES ---- */}
      <Section id="cfg" title="Configurações" defaultOpen={false}>
        <li>
          <a className="nav-link" href="/config/parametros">
            <span className="nav-label">⚙️ Parâmetros da escola</span>
          </a>
        </li>

        <li>
          <a className="nav-link" href="/config/usuarios">
            <span className="nav-label">👤 Usuários & Perfis</span>
          </a>
        </li>

        {/* NOVO ITEM — Papéis & Permissões */}
        <li>
          <a className="nav-link" href="/config/papeis">
            <span className="nav-label">🧩 Papéis & Permissões</span>
          </a>
        </li>

        <li>
          <a className="nav-link" href="/config/integracoes">
            <span className="nav-label">🔌 Integrações</span>
          </a>
        </li>
      </Section>

    </aside>
  );
}
