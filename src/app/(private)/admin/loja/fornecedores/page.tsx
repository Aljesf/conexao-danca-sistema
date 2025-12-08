"use client";

import { useEffect, useState } from "react";

type Fornecedor = {
  id: number;
  pessoa_id: number;
  codigo_interno: string | null;
  ativo: boolean;
  observacoes: string | null;
  pessoa_nome?: string | null;
  pessoa_documento?: string | null;
};

type PessoaBusca = {
  id: number;
  nome_completo?: string | null;
  nome?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

type FormState = {
  id: number | null;
  pessoa_id: number | "";
  pessoa_nome: string;
  codigo_interno: string;
  ativo: boolean;
  observacoes: string;
};

export default function AdminFornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(
    null
  );

  const [form, setForm] = useState<FormState>({
    id: null,
    pessoa_id: "",
    pessoa_nome: "",
    codigo_interno: "",
    ativo: true,
    observacoes: "",
  });

  // busca pessoas
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [pessoasResultados, setPessoasResultados] = useState<PessoaBusca[]>([]);
  const [buscandoPessoa, setBuscandoPessoa] = useState(false);

  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }

  async function carregarFornecedores(q?: string) {
    resetMensagem();
    setLoading(true);
    try {
      const params = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/loja/fornecedores${params}`, {
        cache: "no-store",
      });
      const json: ApiResponse<Fornecedor[]> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao listar fornecedores.");
        setFornecedores([]);
        return;
      }
      setFornecedores(json.data);
    } catch (e) {
      console.error("Erro ao carregar fornecedores:", e);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  useEffect(() => {
    const term = buscaPessoa.trim();
    if (term.length < 2) {
      setPessoasResultados([]);
      return;
    }
    const controller = new AbortController();
    async function run() {
      setBuscandoPessoa(true);
      try {
        const resp = await fetch(
          `/api/pessoas/busca?query=${encodeURIComponent(term)}`,
          { signal: controller.signal, credentials: "include" }
        );
        if (!resp.ok) {
          setPessoasResultados([]);
          return;
        }
        const data = (await resp.json()) as { ok: boolean; pessoas: PessoaBusca[] };
        setPessoasResultados(data.pessoas ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Erro na busca de pessoas:", err);
          setPessoasResultados([]);
        }
      } finally {
        setBuscandoPessoa(false);
      }
    }
    run();
    return () => controller.abort();
  }, [buscaPessoa]);

  function limparForm() {
    resetMensagem();
    setForm({
      id: null,
      pessoa_id: "",
      pessoa_nome: "",
      codigo_interno: "",
      ativo: true,
      observacoes: "",
    });
  }

  function selecionarFornecedor(f: Fornecedor) {
    resetMensagem();
    setForm({
      id: f.id,
      pessoa_id: f.pessoa_id,
      pessoa_nome: f.pessoa_nome || "",
      codigo_interno: f.codigo_interno || "",
      ativo: f.ativo,
      observacoes: f.observacoes || "",
    });
  }

  async function salvarFornecedor(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!form.pessoa_id || typeof form.pessoa_id !== "number") {
      setMensagemTipo("error");
      setMensagem("Selecione uma pessoa para ser fornecedor.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        pessoa_id: form.pessoa_id,
        codigo_interno: form.codigo_interno.trim() || null,
        ativo: form.ativo,
        observacoes: form.observacoes.trim() || null,
      };

      const url = "/api/loja/fornecedores";
      const method = form.id ? "PUT" : "POST";
      if (form.id) payload.id = form.id;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<Fornecedor> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao salvar fornecedor.");
        return;
      }

      const salvo = json.data;
      setFornecedores((prev) => {
        const idx = prev.findIndex((x) => x.id === salvo.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = salvo;
          return clone;
        }
        return [salvo, ...prev];
      });

      setMensagemTipo("success");
      setMensagem("Fornecedor salvo com sucesso.");
      selecionarFornecedor(salvo);
    } catch (err) {
      console.error("Erro inesperado ao salvar fornecedor:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao salvar fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Fornecedores da Loja</h1>
        <p className="text-sm text-gray-600">
          Cadastro administrativo de fornecedores da AJ Dance Store, baseado no
          cadastro de Pessoas.
        </p>
      </header>

      {mensagem && (
        <div
          className={`text-sm border rounded-md px-3 py-2 ${
            mensagemTipo === "success"
              ? "bg-green-50 border-green-300 text-green-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {mensagem}
        </div>
      )}

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium mb-1">Buscar</label>
            <input
              type="text"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  carregarFornecedores((e.target as HTMLInputElement).value);
                }
              }}
              className="w-full border rounded-md px-3 py-1.5 text-sm"
              placeholder="Nome ou código interno..."
            />
          </div>
          <button
            type="button"
            onClick={() => carregarFornecedores()}
            className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Atualizar lista"}
          </button>
          <button
            type="button"
            onClick={limparForm}
            className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
            disabled={saving}
          >
            Novo fornecedor
          </button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-left">Codigo interno</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-xs text-gray-500"
                  >
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              )}
              {fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-800">
                    {f.pessoa_nome || "(sem nome)"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {f.pessoa_documento || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {f.codigo_interno || "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        f.ativo
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {f.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => selecionarFornecedor(f)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {form.id ? "Editar fornecedor" : "Novo fornecedor"}
            </h2>
            {form.pessoa_id && (
              <p className="text-xs text-gray-500">
                Pessoa selecionada: {form.pessoa_nome || form.pessoa_id}
              </p>
            )}
          </div>
          {form.id && (
            <button
              type="button"
              onClick={limparForm}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Limpar selecao
            </button>
          )}
        </div>

        <form className="space-y-4" onSubmit={salvarFornecedor}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Buscar pessoa (digite 2+ caracteres)
              </label>
              <input
                type="text"
                value={buscaPessoa}
                onChange={(e) => setBuscaPessoa(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar por nome"
                disabled={!!form.id}
              />
              {buscandoPessoa && (
                <p className="text-[11px] text-gray-500 mt-1">Buscando pessoas...</p>
              )}
              {!form.id && pessoasResultados.length > 0 && (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {pessoasResultados.map((p) => {
                    const nome = p.nome_completo || p.nome || "Sem nome";
                    const doc = p.cnpj || p.cpf || "";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            pessoa_id: p.id,
                            pessoa_nome: nome,
                          }));
                          setPessoasResultados([]);
                          setBuscaPessoa(nome);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-800">{nome}</span>{" "}
                        <span className="text-gray-500">({p.id}) {doc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {form.id && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Pessoa vinculada nao pode ser alterada em modo edicao.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Codigo interno
              </label>
              <input
                type="text"
                value={form.codigo_interno}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, codigo_interno: e.target.value }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="fornecedor-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="fornecedor-ativo" className="text-xs font-medium">
                Fornecedor ativo
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Observacoes
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={limparForm}
              className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar fornecedor"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
