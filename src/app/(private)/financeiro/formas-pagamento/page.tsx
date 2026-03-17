"use client";

import { useEffect, useMemo, useState } from "react";

type CentroCusto = {
  id: number;
  nome: string;
};

type FormaPagamentoFluxo =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO"
  | "CREDIARIO"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR";

type FormaPagamentoCentral = {
  id: number;
  codigo: string;
  nome: string;
  tipo_fluxo: FormaPagamentoFluxo;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  ativo: boolean;
  contextos: string[];
  centros_custo_ids: number[];
};

type FormState = {
  codigo: string;
  nome: string;
  tipo_fluxo: FormaPagamentoFluxo;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  contextos: string[];
  centros_custo_ids: number[];
  ativo: boolean;
};

const CONTEXTOS = ["CAFE", "LOJA", "ESCOLA", "FINANCEIRO", "ADMINISTRACAO"] as const;

const INITIAL_FORM: FormState = {
  codigo: "",
  nome: "",
  tipo_fluxo: "DINHEIRO",
  exige_troco: false,
  exige_maquininha: false,
  exige_bandeira: false,
  exige_conta_interna: false,
  contextos: [],
  centros_custo_ids: [],
  ativo: true,
};

function flowLabel(value: FormaPagamentoFluxo) {
  switch (value) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "CARTAO":
      return "Cartao";
    case "CREDIARIO":
      return "Crediario";
    case "CONTA_INTERNA_ALUNO":
      return "Conta interna do aluno";
    case "CONTA_INTERNA_COLABORADOR":
      return "Conta interna do colaborador";
    default:
      return value;
  }
}

function toggleInArray<T extends string | number>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export default function FinanceiroFormasPagamentoPage() {
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [itens, setItens] = useState<FormaPagamentoCentral[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState(false);

  const centroMap = useMemo(
    () => new Map(centros.map((item) => [item.id, item.nome])),
    [centros],
  );
  const formaEmEdicao = useMemo(
    () => itens.find((item) => item.codigo === form.codigo.trim().toUpperCase()) ?? null,
    [form.codigo, itens],
  );

  async function carregar() {
    setLoading(true);
    setMensagem(null);
    try {
      const [formasRes, centrosRes] = await Promise.all([
        fetch("/api/financeiro/formas-pagamento-saas", { cache: "no-store" }),
        fetch("/api/financeiro/contas-financeiras/centros", { cache: "no-store" }),
      ]);

      const formasJson = (await formasRes.json().catch(() => null)) as {
        itens?: FormaPagamentoCentral[];
        detalhe?: string;
        erro_controlado?: string | null;
      } | null;
      const centrosJson = (await centrosRes.json().catch(() => null)) as { centros?: CentroCusto[]; error?: string } | null;

      if (!formasRes.ok) {
        throw new Error(formasJson?.detalhe ?? "falha_carregar_formas_pagamento");
      }
      if (!centrosRes.ok) {
        throw new Error(centrosJson?.error ?? "falha_carregar_centros_custo");
      }

      setItens(Array.isArray(formasJson?.itens) ? formasJson.itens : []);
      setCentros(Array.isArray(centrosJson?.centros) ? centrosJson.centros : []);
      if (formasJson?.erro_controlado) {
        setMensagem("Algumas informacoes do cadastro central foram carregadas via fallback legado.");
        setMensagemErro(false);
      }
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_carregar_formas_pagamento");
      setMensagemErro(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    const exigeContaInterna =
      form.tipo_fluxo === "CONTA_INTERNA_ALUNO" || form.tipo_fluxo === "CONTA_INTERNA_COLABORADOR";
    const exigeMaquininha = form.tipo_fluxo === "CARTAO";
    const exigeTroco = form.tipo_fluxo === "DINHEIRO";

    setForm((current) => ({
      ...current,
      exige_conta_interna: exigeContaInterna || current.exige_conta_interna,
      exige_maquininha: exigeMaquininha || current.exige_maquininha,
      exige_bandeira: exigeMaquininha || current.exige_bandeira,
      exige_troco: exigeTroco || current.exige_troco,
    }));
  }, [form.tipo_fluxo]);

  function preencherForm(item: FormaPagamentoCentral) {
    setForm({
      codigo: item.codigo,
      nome: item.nome,
      tipo_fluxo: item.tipo_fluxo,
      exige_troco: item.exige_troco,
      exige_maquininha: item.exige_maquininha,
      exige_bandeira: item.exige_bandeira,
      exige_conta_interna: item.exige_conta_interna,
      contextos: item.contextos,
      centros_custo_ids: item.centros_custo_ids,
      ativo: item.ativo,
    });
    setMensagem(null);
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMensagem(null);
    setMensagemErro(false);

    try {
      const response = await fetch("/api/financeiro/formas-pagamento-saas", {
        method: formaEmEdicao ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as { detalhe?: string; itens?: FormaPagamentoCentral[] } | null;
      if (!response.ok) {
        throw new Error(payload?.detalhe ?? "falha_salvar_forma_pagamento");
      }

      setItens(Array.isArray(payload?.itens) ? payload.itens : []);
      setMensagem("Forma de pagamento central salva com sucesso.");
      setForm(INITIAL_FORM);
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_salvar_forma_pagamento");
      setMensagemErro(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Financeiro</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Formas de pagamento</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Cadastro central reutilizado por Cafe, Loja e demais contextos. Defina o fluxo da forma,
            se exige troco, maquininha, bandeira ou conta interna, e habilite os centros de custo que podem usala.
          </p>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            O PDV do Ballet Cafe e os demais modulos operacionais consomem este cadastro. Se uma forma nao aparecer no Cafe,
            revise os vinculos de contexto e centro de custo abaixo.
          </p>
        </div>
      </section>

      {mensagem ? (
        <section
          className={`rounded-[24px] border px-5 py-4 text-sm ${
            mensagemErro ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {mensagem}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Formas centrais cadastradas</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use a lista para revisar o cadastro existente e carregar uma forma para edicao rapida.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setForm(INITIAL_FORM);
                setMensagem(null);
              }}
            >
              Nova forma
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-[22px] bg-slate-100" />
              ))
            ) : itens.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                Nenhuma forma cadastrada no modelo central. Rode o seed padrao ou crie a primeira forma nesta tela.
              </div>
            ) : (
              itens.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() => preencherForm(item)}
                  className="w-full rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{item.codigo}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {flowLabel(item.tipo_fluxo)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-slate-950">{item.nome}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.contextos.map((contexto) => (
                      <span key={`${item.codigo}-${contexto}`} className="rounded-full border border-slate-200 px-3 py-1">
                        {contexto}
                      </span>
                    ))}
                    {item.centros_custo_ids.map((centroId) => (
                      <span key={`${item.codigo}-centro-${centroId}`} className="rounded-full border border-slate-200 px-3 py-1">
                        {centroMap.get(centroId) ?? `Centro #${centroId}`}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Cadastro central</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cafe, Loja e Escola reutilizam esta configuracao. Evite listas locais e mantenha a mesma forma central em todos os contextos habilitados.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              {formaEmEdicao ? `Editando ${formaEmEdicao.nome}` : "Criando nova forma"}
            </p>
          </div>

          <form className="mt-5 space-y-5" onSubmit={salvar}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Codigo</span>
                <input
                  value={form.codigo}
                  onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
                  className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                  placeholder="EX.: DINHEIRO"
                  required
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Nome</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                  placeholder="Exibicao padrao"
                  required
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Tipo de fluxo</span>
              <select
                value={form.tipo_fluxo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tipo_fluxo: event.target.value as FormaPagamentoFluxo,
                  }))
                }
                className="w-full rounded-[18px] border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
              >
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="CARTAO">Cartao</option>
                <option value="CREDIARIO">Crediario</option>
                <option value="CONTA_INTERNA_ALUNO">Conta interna do aluno</option>
                <option value="CONTA_INTERNA_COLABORADOR">Conta interna do colaborador</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["exige_troco", "Exige troco"],
                ["exige_maquininha", "Exige maquininha"],
                ["exige_bandeira", "Exige bandeira"],
                ["exige_conta_interna", "Exige conta interna"],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-3 rounded-[18px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field as keyof FormState])}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">Contextos habilitados</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTEXTOS.map((contexto) => (
                  <label key={contexto} className="flex items-center gap-3 rounded-[18px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.contextos.includes(contexto)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          contextos: toggleInArray(current.contextos, contexto),
                        }))
                      }
                      className="h-4 w-4"
                    />
                    {contexto}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">Centros de custo habilitados</div>
              <div className="grid gap-2">
                {centros.map((centro) => (
                  <label key={centro.id} className="flex items-center gap-3 rounded-[18px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.centros_custo_ids.includes(centro.id)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          centros_custo_ids: toggleInArray(current.centros_custo_ids, centro.id),
                        }))
                      }
                      className="h-4 w-4"
                    />
                    {centro.nome}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                className="h-4 w-4"
              />
              Forma ativa
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Salvando..." : formaEmEdicao ? "Salvar alteracoes" : "Salvar forma central"}
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setForm(INITIAL_FORM)}
              >
                Limpar
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
