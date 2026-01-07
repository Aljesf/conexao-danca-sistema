"use client";

import { useEffect, useState } from "react";

type Item = { id: number; nome: string; cidade_id: number };

export function BairroPicker({
  cidadeId,
  valueId,
  valueItem,
  onChange,
}: {
  cidadeId: number | null;
  valueId: number | null;
  valueItem?: Item | null;
  onChange: (id: number | null, item?: Item | null) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      if (!cidadeId) {
        if (mounted) setItems([]);
        return;
      }
      const res = await fetch(`/api/enderecos/bairros?cidade_id=${cidadeId}&q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as { items: Item[] };
      if (mounted) setItems(json.items ?? []);
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [cidadeId, q]);

  const selected = valueItem ?? items.find((x) => x.id === valueId) ?? null;

  return (
    <div className="relative">
      <input
        className="w-full border rounded-xl px-3 py-2 disabled:bg-slate-50"
        value={selected ? selected.nome : q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(null, null);
        }}
        onFocus={() => setOpen(true)}
        placeholder={cidadeId ? "Digite o bairro" : "Selecione a cidade primeiro"}
        disabled={!cidadeId}
      />
      {open && cidadeId ? (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-xl shadow-sm max-h-64 overflow-auto">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-600">Nenhum bairro encontrado.</div>
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
                {it.nome}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
