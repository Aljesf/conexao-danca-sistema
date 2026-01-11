"use client";

import * as React from "react";

export type TurmaHorarioFormValue = {
  dia_semana: number; // 0-6
  hora_inicio: string; // HH:MM
  hora_fim: string; // HH:MM
};

const DIAS: Array<{ id: number; label: string }> = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sab" },
];

type Props = {
  value: TurmaHorarioFormValue[];
  onChange: (next: TurmaHorarioFormValue[]) => void;
};

function upsertHorario(
  list: TurmaHorarioFormValue[],
  dia_semana: number,
  patch: Partial<TurmaHorarioFormValue>,
) {
  const idx = list.findIndex((x) => x.dia_semana === dia_semana);
  if (idx === -1) {
    return [
      ...list,
      {
        dia_semana,
        hora_inicio: patch.hora_inicio ?? "00:00",
        hora_fim: patch.hora_fim ?? "00:00",
      },
    ];
  }
  const next = [...list];
  next[idx] = { ...next[idx], ...patch };
  return next;
}

function removeHorario(list: TurmaHorarioFormValue[], dia_semana: number) {
  return list.filter((x) => x.dia_semana !== dia_semana);
}

export function TurmaGradeHorariosForm({ value, onChange }: Props) {
  const byDia = React.useMemo(() => {
    const m = new Map<number, TurmaHorarioFormValue>();
    for (const v of value) m.set(v.dia_semana, v);
    return m;
  }, [value]);

  return (
    <div className="grid gap-3">
      <div className="text-sm text-muted-foreground">
        Marque os dias em que a turma acontece e defina o horario de inicio e fim para cada dia.
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {DIAS.map((d) => {
          const v = byDia.get(d.id);
          const checked = Boolean(v);

          return (
            <div key={d.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{d.label}</div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const isOn = e.target.checked;
                    if (!isOn) onChange(removeHorario(value, d.id));
                    else onChange(upsertHorario(value, d.id, { hora_inicio: "00:00", hora_fim: "00:00" }));
                  }}
                />
              </div>

              <div className="mt-3 grid gap-2">
                <label className="text-xs text-muted-foreground">Inicio</label>
                <input
                  className="h-9 w-full rounded-md border px-2 text-sm disabled:bg-slate-50"
                  type="time"
                  value={v?.hora_inicio ?? ""}
                  disabled={!checked}
                  onChange={(e) => onChange(upsertHorario(value, d.id, { hora_inicio: e.target.value }))}
                />

                <label className="text-xs text-muted-foreground">Fim</label>
                <input
                  className="h-9 w-full rounded-md border px-2 text-sm disabled:bg-slate-50"
                  type="time"
                  value={v?.hora_fim ?? ""}
                  disabled={!checked}
                  onChange={(e) => onChange(upsertHorario(value, d.id, { hora_fim: e.target.value }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
