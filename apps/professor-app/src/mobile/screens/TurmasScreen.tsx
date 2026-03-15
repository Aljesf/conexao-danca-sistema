import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { apiFetch } from "../../lib/api";

type TurmaItem = {
  turma_id: number;
  turma_nome: string;
  professor_nome?: string | null;
  hora_inicio: string;
  hora_fim: string;
  sala?: string | null;
  curso?: string | null;
  nivel?: string | null;
  turno?: string | null;
};

type TurmasPayload = {
  turmas: TurmaItem[];
  scope?: string;
  podeVerOutrasTurmas?: boolean;
};

export default function TurmasScreen() {
  const [data, setData] = useState<TurmasPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const payload = await apiFetch<TurmasPayload>("/api/professor/turmas?scope=all");
        setData(payload);
        setErro(null);
      } catch (e) {
        setErro((e as Error).message);
      }
    })();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f3efe7" }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#23313a" }}>Outras turmas</Text>
        <Text style={{ color: "#58656e" }}>
          {data?.scope === "all"
            ? "Consulta ampliada habilitada para a operacao do dia."
            : "Sem permissao ampliada. Exibindo apenas as turmas proprias."}
        </Text>
      </View>

      {erro ? (
        <View style={{ borderWidth: 1, borderColor: "#d17757", borderRadius: 16, padding: 14, backgroundColor: "#fff4ef" }}>
          <Text style={{ fontWeight: "700", marginBottom: 6, color: "#7a2f19" }}>Erro operacional</Text>
          <Text style={{ color: "#7a2f19" }}>{erro}</Text>
        </View>
      ) : null}

      {!data?.turmas?.length ? (
        <View style={{ borderWidth: 1, borderColor: "#d7d2c8", borderRadius: 16, padding: 16, backgroundColor: "#fffaf1" }}>
          <Text style={{ color: "#58656e" }}>Nenhuma turma encontrada para o dia.</Text>
        </View>
      ) : (
        data.turmas.map((item) => (
          <View
            key={`${item.turma_id}-${item.hora_inicio}`}
            style={{ borderWidth: 1, borderColor: "#d7d2c8", borderRadius: 16, padding: 14, gap: 5, backgroundColor: "#fffaf1" }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#23313a" }}>{item.turma_nome}</Text>
            <Text style={{ color: "#39464f" }}>
              {item.hora_inicio || "--:--"} - {item.hora_fim || "--:--"}
            </Text>
            {item.professor_nome ? <Text style={{ color: "#39464f" }}>Professor: {item.professor_nome}</Text> : null}
            {item.sala ? <Text style={{ color: "#39464f" }}>Sala: {item.sala}</Text> : null}
            {item.curso || item.nivel || item.turno ? (
              <Text style={{ color: "#39464f" }}>
                {[item.curso, item.nivel, item.turno].filter(Boolean).join(" | ")}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
