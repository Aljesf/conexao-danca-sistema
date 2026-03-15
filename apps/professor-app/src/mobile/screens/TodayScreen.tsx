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

function formatDiaSemana(dataISO?: string | null): string {
  if (!dataISO) return "";

  const date = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
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

export default function TodayScreen({ navigation }: Props) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const payload = await apiFetch<DashboardPayload>("/api/professor/dashboard");
        setData(payload);
        setErro(null);
      } catch (e) {
        setErro((e as Error).message);
      }
    })();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3efe7" }} contentContainerStyle={{ padding: 16, gap: 18 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: "#23313a" }}>
          {data?.usuario?.nome ? `Ola, ${data.usuario.nome}` : "Professor App"}
        </Text>
        <Text style={{ color: "#58656e", fontSize: 16 }}>
          {data?.usuario?.perfil ? `Perfil operacional: ${data.usuario.perfil}` : "Dashboard operacional do dia"}
        </Text>
      </View>

      {erro ? (
        <View style={{ borderWidth: 1, borderColor: "#d17757", borderRadius: 16, padding: 14, backgroundColor: "#fff4ef" }}>
          <Text style={{ fontWeight: "700", marginBottom: 6, color: "#7a2f19" }}>Erro operacional</Text>
          <Text style={{ color: "#7a2f19" }}>{erro}</Text>
        </View>
      ) : null}

      <SectionCard title="Turmas de hoje" subtitle="Agenda operacional do professor logado.">
        {!data?.agendaHoje?.length ? (
          <Text style={{ color: "#58656e" }}>Nenhuma turma encontrada para hoje.</Text>
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

      <SectionCard title="Aniversariantes do dia" subtitle="Quem faz aniversario hoje no operacional da escola.">
        {!data?.aniversariantesDia?.length ? (
          <Text style={{ color: "#58656e" }}>Nenhum aniversariante hoje.</Text>
        ) : (
          data.aniversariantesDia.map((item) => (
            <Text key={`dia-${item.id}`} style={{ color: "#23313a" }}>
              {item.nome}
              {item.tipo ? ` - ${item.tipo}` : ""}
            </Text>
          ))
        )}
      </SectionCard>

      <SectionCard title="Aniversariantes da semana" subtitle="Proximos 7 dias, incluindo hoje.">
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
          onPress={() => navigation.navigate("Turmas")}
          style={{
            borderWidth: 1,
            borderColor: "#23313a",
            borderRadius: 16,
            padding: 14,
            alignItems: "center",
            backgroundColor: "#23313a",
          }}
        >
          <Text style={{ fontWeight: "700", color: "#f8f2e8" }}>Ver outras turmas de hoje</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
