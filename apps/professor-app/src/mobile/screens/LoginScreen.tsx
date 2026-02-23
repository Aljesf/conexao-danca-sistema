import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function onLogin() {
    if (!email || !senha) {
      Alert.alert("Preencha email e senha.");
      return;
    }
    // MVP: navega sem autenticar. Login real sera implementado via API depois.
    navigation.replace("Today");
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Acesso do Professor</Text>

      <View style={{ gap: 6 }}>
        <Text>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text>Senha</Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        />
      </View>

      <Pressable
        onPress={onLogin}
        style={{ padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "600" }}>Entrar</Text>
      </Pressable>
    </View>
  );
}
