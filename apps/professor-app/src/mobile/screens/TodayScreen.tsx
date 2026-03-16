import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { apiFetch } from "../../lib/api";

type AgendaItem = {
  turma_id: number;
  turma_nome: string;
  hora_inicio: string;
  hora_fim: string;
  professor_nome?: string | null;
  sala?: string | null;
  curso?: string | null;
  nivel?: string | null;
  turno?: string | null;
};

type PessoaItem = {
  id: number | string;
  nome: string;
  tipo?: string | null;
  data_aniversario_referencia?: string | null;
};

type DashboardPayload = {
  ok: true;
  dataReferencia: string;
  usuario?: {
    id?: string | null;
    nome?: string | null;
    email?: string | null;
    perfil?: string | null;
  } | null;
  agendaHoje: AgendaItem[];
  aniversariantesDia: PessoaItem[];
  aniversariantesSemana: PessoaItem[];
  podeVerOutrasTurmas?: boolean;
};

type Props = NativeStackScreenProps<RootStackParamList, "Today">;

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftISODate(value: string, delta: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + delta);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatDiaSemana(dataISO?: string | null): string {
  if (!dataISO) return "";

  const date = new Date(`${dataISO}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function summarizeError(message: string): string {
  if (message.includes("retornou HTML")) {
    return "rota nao retornou JSON valido.";
  }
  if (message.includes("Nao autenticado")) {
    return "sessao invalida ou expirada.";
  }
  return message;
}

function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#d7d2c8", borderRadius: 18, padding: 16, gap: 10, backgroundColor: "#fffaf1" }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#23313a" }}>{props.title}</Text>
        {props.subtitle ? <Text style={{ color: "#58656e" }}>{props.subtitle}</Text> : null}
      </View>
      {props.children}
    </View>
  );
}

function ActionButton(props: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        borderWidth: 1,
        borderColor: props.active ? "#23313a" : "#c8c1b6",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: props.active ? "#23313a" : "#fffaf1",
      }}
    >
      <Text style={{ fontWeight: "700", color: props.active ? "#fffaf1" : "#23313a" }}>{props.label}</Text>
    </Pressable>
  );
}

export default function TodayScreen({ navigation }: Props) {
  const [dataReferencia, setDataReferencia] = useState(todayISO());
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function loadDashboard(date: string) {
    try {
      const payload = await apiFetch<DashboardPayload>(`/api/professor/dashboard?data=${date}`);
      setData(payload);
      setErro(null);
    } catch (e) {
      setData(null);
      setErro(summarizeError((e as Error).message));
    }
  }

  useEffect(() => {
    void loadDashboard(dataReferencia);
  }, [dataReferencia]);

  const displayedDate = data?.dataReferencia ?? dataReferencia;
  const isToday = displayedDate === todayISO();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3efe7" }} contentContainerStyle={{ padding: 16, gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#23313a" }}>
          {data?.usuario?.nome ? `Ola, ${data.usuario.nome}` : "Professor App"}
        </Text>
        <Text style={{ color: "#58656e", fontSize: 16 }}>
          {data?.usuario?.perfil ? `Perfil operacional: ${data.usuario.perfil}` : "Dashboard operacional do dia"}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <ActionButton label="Ontem" onPress={() => setDataReferencia((value) => shiftISODate(value, -1))} />
          <ActionButton label="Hoje" onPress={() => setDataReferencia(todayISO())} active={isToday} />
          <ActionButton label="Amanha" onPress={() => setDataReferencia((value) => shiftISODate(value, 1))} />
        </View>
        <Text style={{ color: "#39464f", fontSize: 15 }}>
          Data exibida: {formatDiaSemana(displayedDate)}
        </Text>
      </View>

      {erro ? (
        <View style={{ borderWidth: 1, borderColor: "#d17757", borderRadius: 16, padding: 14, gap: 10, backgroundColor: "#fff4ef" }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontWeight: "700", color: "#7a2f19" }}>Nao foi possivel carregar o dashboard do professor.</Text>
            <Text style={{ color: "#7a2f19" }}>Detalhe: {erro}</Text>
          </View>
          <Pressable
            onPress={() => void loadDashboard(dataReferencia)}
            style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#7a2f19", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}
          >
            <Text style={{ fontWeight: "700", color: "#7a2f19" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      <SectionCard title="Turmas do dia" subtitle="Agenda operacional do professor para a data selecionada.">
        {!data?.agendaHoje?.length ? (
          <Text style={{ color: "#58656e" }}>Nenhuma turma encontrada para esta data.</Text>
        ) : (
          data.agendaHoje.map((item) => (
            <View
              key={`${item.turma_id}-${item.hora_inicio}`}
              style={{ borderWidth: 1, borderColor: "#e0d8cb", borderRadius: 14, padding: 12, gap: 4, backgroundColor: "#fff" }}
            >
              <Text style={{ fontWeight: "700", fontSize: 18, color: "#23313a" }}>{item.turma_nome}</Text>
              <Text style={{ color: "#39464f" }}>
                {item.hora_inicio || "--:--"} - {item.hora_fim || "--:--"}
              </Text>
              {item.sala ? <Text style={{ color: "#39464f" }}>Sala: {item.sala}</Text> : null}
              {item.curso || item.nivel || item.turno ? (
                <Text style={{ color: "#39464f" }}>
                  {[item.curso, item.nivel, item.turno].filter(Boolean).join(" | ")}
                </Text>
              ) : null}
              {item.professor_nome ? <Text style={{ color: "#39464f" }}>Professor: {item.professor_nome}</Text> : null}
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Aniversariantes do dia" subtitle="Quem faz aniversario na data selecionada.">
        {!data?.aniversariantesDia?.length ? (
          <Text style={{ color: "#58656e" }}>Nenhum aniversariante nesta data.</Text>
        ) : (
          data.aniversariantesDia.map((item) => (
            <Text key={`dia-${item.id}`} style={{ color: "#23313a" }}>
              {item.nome}
              {item.tipo ? ` - ${item.tipo}` : ""}
            </Text>
          ))
        )}
      </SectionCard>

      <SectionCard title="Aniversariantes da semana" subtitle="Semana operacional correspondente a data selecionada.">
        {!data?.aniversariantesSemana?.length ? (
          <Text style={{ color: "#58656e" }}>Nenhum aniversariante nesta semana.</Text>
        ) : (
          data.aniversariantesSemana.map((item) => (
            <Text key={`semana-${item.id}`} style={{ color: "#23313a" }}>
              {item.nome}
              {item.tipo ? ` - ${item.tipo}` : ""}
              {item.data_aniversario_referencia ? ` - ${formatDiaSemana(item.data_aniversario_referencia)}` : ""}
            </Text>
          ))
        )}
      </SectionCard>

      {data?.podeVerOutrasTurmas ? (
        <Pressable
          onPress={() => navigation.navigate("Turmas", { dataReferencia: displayedDate })}
          style={{
            borderWidth: 1,
            borderColor: "#23313a",
            borderRadius: 16,
            padding: 14,
            alignItems: "center",
            backgroundColor: "#23313a",
          }}
        >
          <Text style={{ fontWeight: "700", color: "#f8f2e8" }}>Ver outras turmas do dia</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
