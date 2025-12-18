"use client";

export default function TesteCobranca() {
  async function testar() {
    const r = await fetch("/api/cobrancas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoa_id: 1,
        descricao: "Mensalidade de teste",
        valor_centavos: 10000,
        vencimento: "2025-11-30"
      })
    });
    console.log(await r.json());
  }

  return (
    <button
      onClick={testar}
      className="p-3 rounded bg-purple-600 text-white"
    >
      Testar CobranВa
    </button>
  );
}
