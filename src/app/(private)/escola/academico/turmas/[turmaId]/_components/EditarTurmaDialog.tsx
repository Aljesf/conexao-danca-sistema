"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { Turma } from "@/types/turmas";

type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ContextoMatricula = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  status: string;
};

function mapContextoTipo(tipoTurma: string | null | undefined): ContextoTipo {
  const tipo = (tipoTurma ?? "REGULAR").toUpperCase();
  if (tipo === "CURSO_LIVRE") return "CURSO_LIVRE";
  if (tipo === "ENSAIO" || tipo === "PROJETO_ARTISTICO") return "PROJETO_ARTISTICO";
  return "PERIODO_LETIVO";
}

type Props = {
  turma: Turma;
  onUpdated?: () => void;
};

export function EditarTurmaDialog({ turma, onUpdated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoTurma, setTipoTurma] = useState<string>(turma.tipo_turma ?? "REGULAR");
  const [contextos, setContextos] = useState<ContextoMatricula[]>([]);
  const [contextoId, setContextoId] = useState<string>(
    turma.contexto_matricula_id ? String(turma.contexto_matricula_id) : "",
  );
  const [contextosErro, setContextosErro] = useState<string | null>(null);
  const [contextosLoading, setContextosLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function carregarContextos() {
      setContextosErro(null);
      setContextosLoading(true);
      try {
        const tipoContexto = mapContextoTipo(tipoTurma);
        const params = new URLSearchParams({ tipo: tipoContexto, status: "ATIVO" });
        const resp = await fetch(`/api/matriculas/contextos?${params.toString()}`);
        const json = (await resp.json()) as { ok?: boolean; data?: ContextoMatricula[]; error?: string };
        if (!resp.ok || json.ok === false) {
          throw new Error(json.error || "Falha ao carregar contextos.");
        }
        if (!active) return;
        const lista = json.data ?? [];
        setContextos(lista);

        const contextoAtual = Number(contextoId);
        const contextoExiste = lista.some((c) => c.id === contextoAtual);
        const anoRef = turma.ano_referencia ?? null;
        const matchAno =
          tipoContexto === "PERIODO_LETIVO" && typeof anoRef === "number"
            ? lista.find((c) => c.ano_referencia === anoRef) ?? null
            : null;
        if (!contextoExiste) {
          setContextoId(matchAno ? String(matchAno.id) : lista[0] ? String(lista[0].id) : "");
        }
      } catch (e) {
        if (!active) return;
        setContextosErro(e instanceof Error ? e.message : "Falha ao carregar contextos.");
        setContextos([]);
      } finally {
        if (active) setContextosLoading(false);
      }
    }

    void carregarContextos();
    return () => {
      active = false;
    };
  }, [tipoTurma, contextoId, turma.ano_referencia]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowser();
    const formData = new FormData(event.currentTarget);
    const turmaId = turma.turma_id;

    const nome = (formData.get("nome") as string).trim();
    if (!nome) {
      setErro("Informe o nome da turma.");
      return;
    }

    const contextoIdNum = contextoId ? Number(contextoId) : null;
    if (!contextoIdNum || !Number.isFinite(contextoIdNum)) {
      setErro("Selecione o contexto da matricula.");
      return;
    }

    setSaving(true);
    setErro(null);

    const payload = {
      nome,
      curso: (formData.get("curso") as string) || null,
      nivel: (formData.get("nivel") as string) || null,
      tipo_turma: tipoTurma || null,
      turno: (formData.get("turno") as string) || null,
      ano_referencia: formData.get("ano_referencia") ? Number(formData.get("ano_referencia")) : null,
      status: (formData.get("status") as string) || turma.status || null,
      data_inicio: (formData.get("data_inicio") as string) || null,
      data_fim: (formData.get("data_fim") as string) || null,
      carga_horaria_prevista: formData.get("carga_horaria_prevista") ? Number(formData.get("carga_horaria_prevista")) : null,
      frequencia_minima_percentual: formData.get("frequencia_minima_percentual")
        ? Number(formData.get("frequencia_minima_percentual"))
        : null,
      observacoes: (formData.get("observacoes") as string) || null,
      contexto_matricula_id: contextoIdNum,
    };

    const { error } = await supabase.from("turmas").update(payload).eq("turma_id", turmaId);

    if (error) {
      console.error("Erro ao atualizar turma:", error);
      setErro(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    onUpdated?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md">Editar turma</Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl p-6">
        <DialogHeader>
          <DialogTitle>Editar turma</DialogTitle>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
        </DialogHeader>

        <form id="editar-turma-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</label>
              <input
                name="nome"
                defaultValue={turma.nome ?? turma.nome_turma ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</label>
              <input
                name="curso"
                defaultValue={turma.curso ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nivel</label>
              <input
                name="nivel"
                defaultValue={turma.nivel ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
              <select
                name="tipo_turma"
                value={tipoTurma}
                onChange={(e) => setTipoTurma(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="CURSO_LIVRE">CURSO_LIVRE</option>
                <option value="ENSAIO">ENSAIO</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</label>
              <select
                name="turno"
                defaultValue={turma.turno ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">-</option>
                <option value="MANHA">MANHA</option>
                <option value="TARDE">TARDE</option>
                <option value="NOITE">NOITE</option>
                <option value="INTEGRAL">INTEGRAL</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano de referencia</label>
              <input
                type="number"
                name="ano_referencia"
                defaultValue={turma.ano_referencia ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                defaultValue={turma.status ?? "EM_PREPARACAO"}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="EM_PREPARACAO">EM_PREPARACAO</option>
                <option value="ATIVA">ATIVA</option>
                <option value="ENCERRADA">ENCERRADA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia minima (%)</label>
              <input
                type="number"
                name="frequencia_minima_percentual"
                defaultValue={turma.frequencia_minima_percentual ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contexto da matricula</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={contextoId}
                onChange={(e) => setContextoId(e.target.value)}
                disabled={contextosLoading}
              >
                <option value="">{contextosLoading ? "Carregando..." : "Selecione..."}</option>
                {contextos.map((c) => (
                  <option key={`contexto-${c.id}`} value={c.id}>
                    {c.titulo}
                    {c.ano_referencia ? ` (${c.ano_referencia})` : ""}
                  </option>
                ))}
              </select>
              {contextosErro ? <p className="mt-1 text-[11px] text-rose-600">{contextosErro}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data inicio</label>
              <input
                type="date"
                name="data_inicio"
                defaultValue={turma.data_inicio ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data fim</label>
              <input
                type="date"
                name="data_fim"
                defaultValue={turma.data_fim ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carga horaria prevista</label>
              <input
                type="number"
                name="carga_horaria_prevista"
                defaultValue={turma.carga_horaria_prevista ?? ""}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
            <textarea
              name="observacoes"
              defaultValue={turma.observacoes ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" form="editar-turma-form" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
