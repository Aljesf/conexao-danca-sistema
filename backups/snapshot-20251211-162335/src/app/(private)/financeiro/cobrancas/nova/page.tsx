"use client";

import Link from "next/link";

export default function NovaCobrancaPage() {
  return (
    <div className="p-6 space-y-4">
      <Link
        href="/financeiro/cobrancas"
        className="text-sm text-purple-700 hover:underline"
      >
        ← Voltar para cobranças
      </Link>

      <h1 className="text-2xl font-semibold text-slate-800">
        Nova cobrança
      </h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 text-sm text-slate-700">
        <p>
          A tela de criação de cobrança ainda está em desenvolvimento.
        </p>
        <p>
          Em breve, aqui você poderá:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Selecionar o responsável financeiro (pessoa/aluno).</li>
          <li>Definir valor, vencimento e forma de pagamento.</li>
          <li>
            Utilizar pré-definições de planos, períodos e mensalidades
            vinculadas à matrícula.
          </li>
          <li>
            Gerar a cobrança já integrada à Neofin, quando apropriado.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Por enquanto, novas cobranças podem continuar sendo criadas
          diretamente via integração/API ou por rotinas internas.
        </p>
      </div>
    </div>
  );
}
