"use client";

import { useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import PrimaryButton from "@/components/PrimaryButton";

export default function HabilidadesPage() {
  const [form, setForm] = useState({
    nome: "",
    tipo: "",
    descricao: "",
    criterio: "",
    ordem: 1,
  });
  const [editing] = useState(false);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    // mock submit
    alert("Salvar habilidade (mock)");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <FormCard
          title={editing ? "Editar habilidade" : "Cadastrar habilidade"}
          description="Formulário direto para edicao/registro de habilidade."
        >
          <form onSubmit={salvar} className="mt-2 grid gap-3 md:grid-cols-2">
            <FormInput
              className="md:col-span-2"
              label="Nome da habilidade"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <FormInput
              label="Tipo"
              as="select"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="Tecnica">Tecnica</option>
              <option value="Artistica">Artistica</option>
              <option value="Teorica">Teorica</option>
              <option value="Fisica">Fisica</option>
            </FormInput>
            <FormInput
              label="Ordem"
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
            />
            <FormInput
              className="md:col-span-2"
              label="Descricao"
              as="textarea"
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <FormInput
              className="md:col-span-2"
              label="Criterio de avaliacao"
              as="textarea"
              rows={2}
              value={form.criterio}
              onChange={(e) => setForm({ ...form, criterio: e.target.value })}
            />
            <div className="md:col-span-2 flex gap-2">
              <PrimaryButton type="submit">
                {editing ? "Salvar alteracoes" : "Salvar habilidade"}
              </PrimaryButton>
              <PrimaryButton type="button" variant="outline">
                Cancelar
              </PrimaryButton>
            </div>
          </form>
        </FormCard>
      </div>
    </div>
  );
}
