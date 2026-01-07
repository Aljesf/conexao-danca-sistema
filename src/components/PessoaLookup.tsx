"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

export type PessoaLookupItem = {
  id: number;
  nome: string;
  email: string | null;
  cpf: string | null;
  telefone: string | null;
  ativo: boolean | null;
};

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatPessoaInfo(pessoa: PessoaLookupItem): string {
  const parts: string[] = [`ID: ${pessoa.id}`];
  const email = asText(pessoa.email);
  const cpf = asText(pessoa.cpf);
  const telefone = asText(pessoa.telefone);

  if (email) parts.push(`Email: ${email}`);
  if (cpf) parts.push(`CPF: ${cpf}`);
  if (telefone) parts.push(`Tel: ${telefone}`);

  return parts.join(" | ");
}

type Props = {
  label?: string;
  placeholder?: string;
  value?: PessoaLookupItem | null;
  onChange: (pessoa: PessoaLookupItem | null) => void;
  minChars?: number;
  apiPath?: string;
  ctaNovaPessoaHref?: string;
  hint?: string;
  allowCreate?: boolean;
};

export default function PessoaLookup({
  label = "Pessoa",
  placeholder = "Buscar pessoa (2+ caracteres)",
  value = null,
  onChange,
  minChars = 2,
  apiPath = "/api/pessoas/busca",
  ctaNovaPessoaHref = "/pessoas/nova",
  hint,
  allowCreate = true,
}: Props) {
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [itens, setItens] = useState<PessoaLookupItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const canSearch = useMemo(() => q.trim().length >= minChars, [q, minChars]);

  async function buscar() {
    setErro(null);
    const term = q.trim();
    if (term.length < minChars) {
      setItens([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?q=${encodeURIComponent(term)}`);
      const json = (await res.json()) as {
        ok: boolean;
        pessoas?: PessoaLookupItem[];
        error?: string;
        details?: string;
      };
      if (!json.ok) {
        const msg = json.details
          ? `${json.error ?? "erro"}: ${json.details}`
          : json.error ?? "Falha na busca.";
        throw new Error(msg);
      }
      setItens(json.pessoas ?? []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha na busca.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>{label}</div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
          />
          <button
            onClick={buscar}
            disabled={loading || !canSearch}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              opacity: loading || !canSearch ? 0.6 : 1,
            }}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {hint ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{hint}</div> : null}

        {erro ? (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
            }}
          >
            {erro}
          </div>
        ) : null}
      </div>

      {value ? (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.7)",
          }}
        >
          <div style={{ fontWeight: 700 }}>{value.nome}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{formatPessoaInfo(value)}</div>
          <button
            onClick={() => onChange(null)}
            style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
          >
            Trocar pessoa
          </button>
        </div>
      ) : null}

      {itens.length > 0 && !value ? (
        <div style={{ display: "grid", gap: 8 }}>
          {itens.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange(p)}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.10)",
                background: "rgba(255,255,255,0.7)",
              }}
            >
              <div style={{ fontWeight: 650 }}>{p.nome}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{formatPessoaInfo(p)}</div>
            </button>
          ))}
        </div>
      ) : null}

      {!value && allowCreate ? (
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          NÃ£o encontrou?{" "}
          <Link href={ctaNovaPessoaHref} style={{ textDecoration: "underline" }}>
            Cadastrar nova pessoa
          </Link>
        </div>
      ) : null}
    </div>
  );
}
