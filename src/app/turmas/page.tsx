"use client";

import { useEffect, useState } from "react";

type Professor = { id: number; nome: string; email?: string | null };

type Horario = { day: number; on: boolean; inicio: string; fim: string }; // day: 0..6

type Turma = {
  id: number;
  nome: string;
  nivel?: string | null;
  modalidade?: string | null;
  capacidade?: number | null;
  ativo: boolean;
  created_at?: string | null;
  user_email?: string | null;
  professor_id?: number | null;
  particular?: boolean;
  passe_livre?: boolean;
  online?: boolean;
  professor?: Professor | null;
  horarios?: { day_of_week: number; inicio: string; fim: string }[];
};

const NIVEL_OPCOES = [
  "Baby", "Infantil", "Iniciante", "Intermediário", "Avançado", "Adulto",
];

const MODALIDADE_OPCOES = [
  "Ballet", "Jazz", "Contemporâneo", "Hip-Hop", "Zumba", "Alongamento", "Outra",
];

const DIAS = [
  { label: "Domingo", value: 0 },
  { label: "Segunda", value: 1 },
  { label: "Terça", value: 2 },
  { label: "Quarta", value: 3 },
  { label: "Quinta", value: 4 },
  { label: "Sexta", value: 5 },
  { label: "Sábado", value: 6 },
];

export default function TurmasPage() {
  const [lista, setLista] = useState<Turma[]>([]);
  const [profs, setProfs] = useState<Professor[]>([]);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("");

  const [form, setForm] = useState({
    nome: "",
    nivel: "",
    modalidade: "",
    capacidade: "",
    professor_id: "",
    particular: false,
    passe_livre: false,
    online: false,
  });

  const [week, setWeek] = useState<Horario[]>(
    DIAS.map(d => ({ day: d.value, on: false, inicio: "", fim: "" }))
  );

  const listaFiltrada = lista.filter(t => {
    const q = filtro.toLowerCase().trim();
    const alvo = [
      t.nome,
      t.nivel || "",
      t.modalidade || "",
      t.professor?.nome || "",
    ].join(" ");
    return !q || alvo.toLowerCase().includes(q);
  });

  async function carregarProfs() {
    const r = await fetch("/api/professores", { cache: "no-store" });
    const b = await r.json().catch(() => ({}));
    if (r.ok) setProfs(b.data ?? []);
  }

  async function carregarTurmas() {
    setErro("");
    const res = await fetch("/api/turmas", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(body?.error || `${res.status} ${res.statusText}`);
    setLista(body.data ?? []);
  }

  useEffect(() => {
    carregarProfs();
    carregarTurmas();
  }, []);

  function updateWeek(idx: number, patch: Partial<Horario>) {
    setWeek(w => {
      const copy = [...w];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const horarios = week
      .filter(h => h.on && h.inicio && h.fim)
      .map(h => ({ day: h.day, inicio: h.inicio, fim: h.fim }));

    // regras simples: se marcou o dia, exige horário
    const diaSemHorario = week.find(h => h.on && (!h.inicio || !h.fim));
    if (diaSemHorario) {
      setErro("Preencha horário de início e fim para os dias marcados.");
      return;
    }

    const turmaPayload = {
      nome: form.nome,
      nivel: form.nivel || null,
      modalidade: form.modalidade || null,
      capacidade: form.capacidade ? Number(form.capacidade) : null,
      professor_id: form.professor_id ? Number(form.professor_id) : null,
      ativo: true,
      particular: form.particular,
      passe_livre: form.passe_livre,
      online: form.online,
    };

    const res = await fetch("/api/turmas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turma: turmaPayload, horarios }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(body?.error || `${res.status} ${res.statusText}`);

    // reset
    setForm({
      nome: "",
      nivel: "",
      modalidade: "",
      capacidade: "",
      professor_id: "",
      particular: false,
      passe_livre: false,
      online: false,
    });
    setWeek(DIAS.map(d => ({ day: d.value, on: false, inicio: "", fim: "" })));
    carregarTurmas();
  }

  async function toggleAtivo(t: Turma) {
    setErro("");
    const res = await fetch(`/api/turmas/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turma: { ativo: !t.ativo } }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(body?.error || `${res.status} ${res.statusText}`);
    carregarTurmas();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir esta turma?")) return;
    setErro("");
    const res = await fetch(`/api/turmas/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(body?.error || `${res.status} ${res.statusText}`);
    carregarTurmas();
  }

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>Turmas</h1>

      <input
        placeholder="Buscar por nome/nível/modalidade/professor"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ padding: 8, width: 360, margin: "8px 0" }}
      />

      <form onSubmit={criar} style={{ display: "grid", gap: 10, margin: "12px 0" }}>
        <input required placeholder="Nome"
          value={form.nome}
          onChange={(e)=>setForm({...form, nome:e.target.value})} />

        {/* Nível */}
        <select value={form.nivel} onChange={(e)=>setForm({...form, nivel:e.target.value})} style={{ padding: 8 }}>
          <option value="">— selecione o nível —</option>
          {NIVEL_OPCOES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Modalidade */}
        <select value={form.modalidade} onChange={(e)=>setForm({...form, modalidade:e.target.value})} style={{ padding: 8 }}>
          <option value="">— selecione a modalidade —</option>
          {MODALIDADE_OPCOES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Capacidade"
            value={form.capacidade}
            onChange={(e)=>setForm({...form, capacidade:e.target.value})}
            style={{ maxWidth: 160 }} />
          <select value={form.professor_id} onChange={(e)=>setForm({...form, professor_id: e.target.value})} style={{ padding: 8 }}>
            <option value="">— selecione o professor —</option>
            {profs.map(p => <option key={p.id} value={p.id}>{p.nome} {p.email ? `• ${p.email}` : ""}</option>)}
          </select>
        </div>

        {/* Flags */}
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <label><input type="checkbox" checked={form.particular} onChange={e=>setForm({...form, particular:e.target.checked})}/> Turma Particular</label>
          <label><input type="checkbox" checked={form.passe_livre} onChange={e=>setForm({...form, passe_livre:e.target.checked})}/> Passe Livre</label>
          <label><input type="checkbox" checked={form.online} onChange={e=>setForm({...form, online:e.target.checked})}/> Turma Online</label>
        </div>

        {/* Grade semanal */}
        <div style={{ border: "1px solid #333", borderRadius: 6, padding: 12 }}>
          <b>Dias das aulas</b>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 8, marginTop: 8 }}>
            {DIAS.map((d, idx) => {
              const h = week[idx];
              return (
                <div key={d.value} style={{ display: "contents" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={h.on}
                      onChange={(e)=>updateWeek(idx, { on: e.target.checked })}
                    />
                    {d.label}
                  </label>
                  <input type="time" disabled={!h.on} value={h.inicio}
                         onChange={(e)=>updateWeek(idx, { inicio: e.target.value })}/>
                  <input type="time" disabled={!h.on} value={h.fim}
                         onChange={(e)=>updateWeek(idx, { fim: e.target.value })}/>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">Salvar</button>
          {/* botão “Salvar e adicionar outra” (opcional) */}
        </div>
      </form>

      {erro && <p style={{ color: "tomato" }}>Erro: {erro}</p>}

      <ul style={{ marginTop: 16 }}>
        {listaFiltrada.map(t => (
          <li key={t.id} style={{ marginBottom: 12, borderBottom: "1px solid #333", paddingBottom: 8 }}>
            <b>#{t.id}</b> — {t.nome}
            {t.nivel ? ` • ${t.nivel}` : ""} {t.modalidade ? ` • ${t.modalidade}` : ""}
            {t.capacidade ? ` • cap ${t.capacidade}` : ""}
            {t.professor ? ` • prof. ${t.professor.nome}` : ""}
            {t.particular ? " • particular" : ""}{t.passe_livre ? " • passe livre" : ""}{t.online ? " • online" : ""}
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              criado em {t.created_at && new Date(t.created_at).toLocaleString()}
              {t.user_email ? ` • por ${t.user_email}` : ""} {` • ${t.ativo ? "ativa" : "inativa"}`}
              {t.horarios?.length ? (
                <div style={{ marginTop: 4 }}>
                  {t.horarios.map(h => {
                    const nomeDia = DIAS.find(d => d.value === h.day_of_week)?.label ?? h.day_of_week;
                    return <span key={`${t.id}-${h.day_of_week}-${h.inicio}`} style={{ marginRight: 10 }}>{nomeDia}: {h.inicio}–{h.fim}</span>;
                  })}
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => toggleAtivo(t)} style={{ marginRight: 8 }}>
                {t.ativo ? "Inativar" : "Ativar"}
              </button>
              <button onClick={() => excluir(t.id)}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

