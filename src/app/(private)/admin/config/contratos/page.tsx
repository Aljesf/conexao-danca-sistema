"use client";

import Link from "next/link";

export default function AdminConfigContratosHome() {
  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Configuracao - Contratos</h1>
      <p style={{ opacity: 0.8 }}>
        Central do modulo de contratos: modelos, emissao e acompanhamento.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <Link
          href="/admin/config/contratos/modelos"
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, textDecoration: "none" }}
        >
          <div style={{ fontWeight: 700 }}>Modelos de Contrato</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Crie e edite templates com placeholders (DB/CALC/MANUAL).
          </div>
        </Link>

        <Link
          href="/admin/config/contratos/emitir"
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, textDecoration: "none" }}
        >
          <div style={{ fontWeight: 700 }}>Emitir Contrato</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Busque aluno/responsavel, selecione a matricula e emita o contrato.
          </div>
        </Link>

        <Link
          href="/admin/config/contratos/emitidos"
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, textDecoration: "none" }}
        >
          <div style={{ fontWeight: 700 }}>Contratos Emitidos</div>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Visualize os contratos ja emitidos (MVP: lista simples).
          </div>
        </Link>
      </div>
    </div>
  );
}
