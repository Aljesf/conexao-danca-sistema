"use client";

import { useEffect, useState } from "react";

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
            <div className="px-3 py-2 text-sm text-slate-600">Nenhuma cidade encontrada.</div>
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
    </div>
  );
}
