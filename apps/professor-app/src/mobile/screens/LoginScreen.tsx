import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { ENV } from "../../config/env";
import {
  persistSessionToStorage,
  restoreSessionFromStorage,
  supabase,
} from "../../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const supabaseOk = Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        navigation.replace("Today");
        return;
      }

      const session = await restoreSessionFromStorage();
      if (session?.access_token) {
        navigation.replace("Today");
      }
    })();
  }, [navigation]);

  async function onLogin() {
    if (!supabaseOk) {
      Alert.alert("Configuracao incompleta", "Faltou SUPABASE_URL e SUPABASE_ANON_KEY no .env do app.");
      return;
    }
    if (!email || !senha) {
      Alert.alert("Preencha email e senha.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      await persistSessionToStorage(data.session ?? null);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("Sessao nao ficou disponivel no app.");
      }

      navigation.replace("Today");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Falha no login";
      const msg = raw.toLowerCase().includes("invalid login credentials")
        ? "Email ou senha invalidos."
        : raw;
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Acesso do Professor</Text>

      {!supabaseOk ? (
        <Text style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}>
          Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env do app.
        </Text>
      ) : null}

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
        disabled={loading}
        style={{ padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", opacity: loading ? 0.6 : 1 }}
      >
        <Text style={{ fontWeight: "600" }}>{loading ? "Entrando..." : "Entrar"}</Text>
      </Pressable>
    </View>
  );
}
