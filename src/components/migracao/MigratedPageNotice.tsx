import React from "react";

type Props = {
  origem?: string;
  destinoFinal?: string;
  observacao?: string;
};

export function MigratedPageNotice({ origem, destinoFinal, observacao }: Props) {
  return (
    <div
      role="note"
      aria-label="Aviso de migração"
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        background: "rgba(255, 193, 7, 0.12)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>🚧 Página em migração</div>
      <div style={{ fontSize: 14, lineHeight: 1.35 }}>
        Esta tela está sendo acessada de forma provisória{origem ? ` (${origem})` : ""}.
        {destinoFinal ? ` Destino final esperado: ${destinoFinal}.` : ""}
        {observacao ? ` ${observacao}` : ""}
      </div>
    </div>
  );
}
