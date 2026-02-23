import React from "react";
import { View, Text } from "react-native";

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Minhas aulas (hoje)</Text>
      <Text>MVP: tela inicial. A agenda real sera ligada na API depois.</Text>
    </View>
  );
}
