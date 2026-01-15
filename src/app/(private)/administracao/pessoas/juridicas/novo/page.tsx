"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/layout/SectionCard";
import { BairroPicker } from "@/components/enderecos/BairroPicker";
import { CidadePicker } from "@/components/enderecos/CidadePicker";
import { formatCnpj, normalizeCnpj, validateCnpj } from "@/lib/validators/cnpj";

type CidadeItem = { id: number; nome: string; uf: string };
type BairroItem = { id: number; nome: string; cidade_id: number };

type EnderecoDraft = {
  logradouro: string;
  numero: string;
  complemento: string;
  cidade_id: number | null;
  bairro_id: number | null;
  uf: string;
  cep: string;
  referencia: string;
  cidade: string | null;
  bairro: string | null;
};

export default function NovaPessoaJuridicaPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpjUi, setCnpjUi] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneSecundario, setTelefoneSecundario] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [cidadeSelecionada, setCidadeSelecionada] = useState<CidadeItem | null>(null);
  const [bairroSelecionado, setBairroSelecionado] = useState<BairroItem | null>(null);

  const [endereco, setEndereco] = useState<EnderecoDraft>({
    logradouro: "",
    numero: "",
    complemento: "",
    cidade_id: null,
    bairro_id: null,
    uf: "",
    cep: "",
    referencia: "",
    cidade: null,
    bairro: null,
  });

  const cnpjStatus = useMemo(() => {
    const cleaned = normalizeCnpj(cnpjUi);
    if (!cleaned) return { kind: "empty" as const };
    const v = validateCnpj(cleaned);
    return v.ok ? { kind: "ok" as const } : { kind: "bad" as const, reason: v.reason };
  }, [cnpjUi]);

  const enderecoAtivo = useMemo(() => {
    return Boolean(
      endereco.logradouro ||
        endereco.numero ||
        endereco.complemento ||
        endereco.cep ||
        endereco.referencia ||
        endereco.cidade_id ||
        endereco.bairro_id,
    );
  }, [endereco]);

  async function handleSalvar() {
    try {
      setSaving(true);
      setErro(null);

      const razao = razaoSocial.trim();
      if (!razao) {
        setErro("Razao social e obrigatoria.");
        return;
      }

      const cnpj = normalizeCnpj(cnpjUi);
      const v = validateCnpj(cnpj);
      if (!v.ok) {
        setErro(`CNPJ invalido (${v.reason}).`);
        return;
      }

      if (enderecoAtivo) {
        const logradouroValue = endereco.logradouro.trim();
        if (!logradouroValue || !endereco.cidade_id || !endereco.bairro_id) {
          setErro("Endereco fiscal incompleto. Informe logradouro, cidade e bairro.");
          return;
        }
      }

      const res = await fetch("/api/pessoas/juridica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razao_social: razao,
          nome_fantasia: nomeFantasia.trim() || null,
          cnpj,
          inscricao_estadual: inscricaoEstadual.trim() || null,
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          telefone_secundario: telefoneSecundario.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const msg = json?.error || "Falha ao criar pessoa juridica.";
        throw new Error(msg);
      }

      const pessoaId = Number(json?.data?.id);
      if (!pessoaId) {
        throw new Error("Pessoa criada, mas o ID nao retornou corretamente.");
      }

      if (enderecoAtivo) {
        const ufValue = String(endereco.uf || cidadeSelecionada?.uf || "").trim();
        const enderecoRes = await fetch(`/api/pessoas/${pessoaId}/endereco`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logradouro: endereco.logradouro.trim(),
            numero: endereco.numero.trim() || null,
            complemento: endereco.complemento.trim() || null,
            cidade_id: endereco.cidade_id,
            bairro_id: endereco.bairro_id,
            uf: ufValue,
            cep: endereco.cep.trim() || null,
            referencia: endereco.referencia.trim() || null,
          }),
        });

        const endJson = await enderecoRes.json().catch(() => null);
        if (!enderecoRes.ok) {
          throw new Error(endJson?.details ?? endJson?.error ?? "Erro ao salvar endereco fiscal.");
        }
      }

      router.push(`/pessoas/${pessoaId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao salvar.";
      setErro(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Nova pessoa juridica
            </h1>
            <p className="max-w-3xl text-[15px] text-slate-600">
              Cadastro de fornecedores, prestadores, parceiros e pessoas juridicas internas.
              O endereco informado aqui e tratado como endereco fiscal.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/pessoas")}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleSalvar}
                disabled={saving}
                className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
              >
                {saving ? "Salvando..." : "Criar pessoa juridica"}
              </button>
            </div>
          </div>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm md:text-base">
            {erro}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Dados da empresa">
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-slate-400">Razao social *</p>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex.: Conexao Danca LTDA"
                />
              </div>

              <div>
                <p className="text-sm text-slate-400">Nome fantasia</p>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex.: Conexao Danca"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">CNPJ *</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={cnpjUi}
                    onChange={(e) => setCnpjUi(formatCnpj(e.target.value))}
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                  />
                  {cnpjStatus.kind === "bad" ? (
                    <p className="mt-1 text-xs text-red-600">
                      CNPJ invalido ({cnpjStatus.reason}). Corrija.
                    </p>
                  ) : cnpjStatus.kind === "ok" ? (
                    <p className="mt-1 text-xs text-emerald-700">CNPJ valido.</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Obrigatorio.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-400">Inscricao estadual</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contato e observacoes">
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-slate-400">E-mail</p>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="financeiro@empresa.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Telefone principal</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(91) 9xxxx-xxxx"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Telefone secundario</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={telefoneSecundario}
                    onChange={(e) => setTelefoneSecundario(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400">Observacoes</p>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  rows={4}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: fornecedor de uniforme, prestador de som/luz, etc."
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Endereco fiscal (opcional)">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Logradouro</p>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  value={endereco.logradouro}
                  onChange={(e) =>
                    setEndereco((old) => ({ ...old, logradouro: e.target.value }))
                  }
                />
              </div>

              <div>
                <p className="text-sm text-slate-400">Cidade</p>
                <CidadePicker
                  valueId={endereco.cidade_id}
                  valueItem={cidadeSelecionada}
                  onChange={(id, item) => {
                    setCidadeSelecionada(item ?? null);
                    setBairroSelecionado(null);
                    setEndereco((old) => ({
                      ...old,
                      cidade_id: id,
                      cidade: item?.nome ?? null,
                      uf: item?.uf ?? old.uf,
                      bairro_id: null,
                      bairro: null,
                    }));
                  }}
                />
              </div>

              <div>
                <p className="text-sm text-slate-400">Bairro</p>
                <BairroPicker
                  cidadeId={endereco.cidade_id}
                  valueId={endereco.bairro_id}
                  valueItem={bairroSelecionado}
                  onChange={(id, item) => {
                    setBairroSelecionado(item ?? null);
                    setEndereco((old) => ({
                      ...old,
                      bairro_id: id,
                      bairro: item?.nome ?? null,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Numero</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={endereco.numero}
                    onChange={(e) => setEndereco((old) => ({ ...old, numero: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Complemento</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={endereco.complemento}
                    onChange={(e) =>
                      setEndereco((old) => ({ ...old, complemento: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">UF</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={endereco.uf}
                    readOnly={Boolean(endereco.cidade_id)}
                    onChange={(e) => setEndereco((old) => ({ ...old, uf: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-400">CEP</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={endereco.cep}
                    onChange={(e) => setEndereco((old) => ({ ...old, cep: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-400">Referencia</p>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  value={endereco.referencia}
                  onChange={(e) =>
                    setEndereco((old) => ({ ...old, referencia: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
