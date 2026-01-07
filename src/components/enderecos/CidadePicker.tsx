"use client";

import { useEffect, useState } from "react";
import { EnderecoModal } from "./EnderecoModal";

type Item = { id: number; nome: string; uf: string };

export function CidadePicker({
  valueId,
  valueItem,
  onChange,
}: {
  valueId: number | null;
  valueItem?: Item | null;
  onChange: (id: number | null, item?: Item | null) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createNome, setCreateNome] = useState("");
  const [createUf, setCreateUf] = useState("PA");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/enderecos/cidades?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const json = (await res.json()) as { items: Item[] };
      if (mounted) setItems(json.items ?? []);
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [q]);

  const selected = valueItem ?? items.find((x) => x.id === valueId) ?? null;
  const canCreate = q.trim() !== "" && items.length === 0;

  async function handleCreate() {
    const nome = createNome.trim();
    const uf = (createUf.trim() || "PA").toUpperCase();
    if (!nome) {
      setCreateMsg("Informe o nome da cidade.");
      return;
    }

    try {
      setCreating(true);
      setCreateMsg(null);
      const res = await fetch("/api/enderecos/cidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome, uf }),
      });
      const json = (await res.json().catch(() => null)) as { item?: Item; error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Erro ao cadastrar cidade.");
      }
      if (!json?.item?.id) {
        throw new Error("Resposta invalida ao cadastrar cidade.");
      }
      onChange(json.item.id, json.item);
      setCreateOpen(false);
      setOpen(false);
      setQ("");
      setCreateNome("");
      setCreateUf("PA");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar cidade.";
      setCreateMsg(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <input
        className="w-full border rounded-xl px-3 py-2"
        value={selected ? `${selected.nome} - ${selected.uf}` : q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(null, null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Digite a cidade"
      />
      {open ? (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-xl shadow-sm max-h-64 overflow-auto">
          {items.length === 0 ? (
            canCreate ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-violet-600 hover:bg-slate-50"
                onClick={() => {
                  setCreateNome(q.trim());
                  setCreateUf("PA");
                  setCreateMsg(null);
                  setCreateOpen(true);
                  setOpen(false);
                }}
              >
                Criar nova cidade: {q.trim()}
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-slate-600">Nenhuma cidade encontrada.</div>
            )
          ) : (
            items.map((it) => (
              <button
                type="button"
                key={it.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange(it.id, it);
                  setQ("");
                  setOpen(false);
                }}
              >
                {it.nome} - {it.uf}
              </button>
            ))
          )}
        </div>
      ) : null}
      <EnderecoModal open={createOpen} title="Cadastrar cidade" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          {createMsg ? <div className="text-sm text-rose-600">{createMsg}</div> : null}
          <label className="text-sm">
            <div className="mb-1 font-medium">Nome</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={createNome}
              onChange={(e) => setCreateNome(e.target.value)}
              placeholder="Ex: Belem"
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-medium">UF</div>
            <input
              className="w-full border rounded-xl px-3 py-2 uppercase"
              value={createUf}
              maxLength={2}
              onChange={(e) => setCreateUf(e.target.value.toUpperCase())}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Salvando..." : "Salvar cidade"}
            </button>
          </div>
        </div>
      </EnderecoModal>
    </div>
  );
}
