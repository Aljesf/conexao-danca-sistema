"use client";

import FormCard from "@/components/FormCard";

export default function ConteudosPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
          <div className="text-sm font-semibold text-slate-800">Curso → Nivel → Conteudos</div>
          <div className="text-xs text-slate-500">Rota auxiliar para edicao direta.</div>
        </div>

        <FormCard
          title="Rota de conteudos"
          description="Use esta rota apenas para fins de edicao direta."
        >
          <p className="text-sm text-slate-700">
            A jornada visual completa agora acontece dentro da tela de Niveis (Cursos → Niveis → Conteudos → Habilidades).
            Esta pagina permanece disponivel para casos pontuais de edicao direta dos conteudos.
          </p>
        </FormCard>
      </div>
    </div>
  );
}
