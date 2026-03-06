import React from "react";
import { SafeAreaView, View, Text } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
          Professor App
        </Text>
        <Text style={{ fontSize: 16, textAlign: "center" }}>
          Renderização básica funcionando.
        </Text>
      </View>
    </SafeAreaView>
  );
}
