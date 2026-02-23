import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { apiFetch } from "../../lib/api";

type AulaHoje = {
  turma_id: number;
  turma_nome: string;
  hora_inicio: string;
  hora_fim: string;
};

export default function TodayScreen() {
  const [aulas, setAulas] = useState<AulaHoje[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ aulas: AulaHoje[] }>("/api/professor/agenda/hoje");
        setAulas(data.aulas ?? []);
      } catch (e) {
        setErro((e as Error).message);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Minhas aulas (hoje)</Text>

      {erro ? (
        <Text style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}>
          Erro ao carregar: {erro}
        </Text>
      ) : null}

      <FlatList
        data={aulas}
        keyExtractor={(item) => String(item.turma_id)}
        ListEmptyComponent={<Text>Nenhuma aula encontrada.</Text>}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 10 }}>
            <Text style={{ fontWeight: "600" }}>{item.turma_nome}</Text>
            <Text>
              {item.hora_inicio} - {item.hora_fim}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
