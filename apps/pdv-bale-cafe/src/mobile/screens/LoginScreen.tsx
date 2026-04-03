import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import { usePdvAuth } from "../auth-context";
import PrimaryButton from "../components/PrimaryButton";
import ScreenShell from "../components/ScreenShell";
import StatusBanner from "../components/StatusBanner";
import { TOKENS } from "../theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { authStatus, completeLogin } = usePdvAuth();

  async function onLogin() {
    setErro(null);

    if (!hasSupabaseConfig) {
      setErro("Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no app.");
      return;
    }

    if (!email.trim() || !senha.trim()) {
      setErro("Informe email e senha para entrar.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        throw error;
      }

      await completeLogin(data.session ?? null);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Falha no login";
      setErro(
        rawMessage.toLowerCase().includes("invalid login credentials")
          ? "Email ou senha invalidos."
          : rawMessage,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenShell
        title="PDV Bale Cafe"
        subtitle="Operacao mobile do balcao. Entre com a mesma autenticacao valida do sistema."
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login do operador</Text>
          <Text style={styles.cardText}>Sessao estavel, poucos passos e foco em vender rapido.</Text>

          {!hasSupabaseConfig ? (
            <StatusBanner
              tone="error"
              text="Variaveis do Supabase ausentes no app. Ajuste o .env antes de testar."
            />
          ) : null}

          {erro ? <StatusBanner tone="error" text={erro} /> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="operador@dominio.com"
              placeholderTextColor={TOKENS.colors.textMuted}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              secureTextEntry
              placeholder="Sua senha"
              placeholderTextColor={TOKENS.colors.textMuted}
              style={styles.input}
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <PrimaryButton
            label={loading ? "Entrando..." : "Entrar no PDV"}
            onPress={onLogin}
            loading={loading}
            disabled={authStatus === "booting"}
          />
        </View>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
  },
  cardTitle: {
    color: TOKENS.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  cardText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: TOKENS.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    color: TOKENS.colors.text,
    minHeight: 52,
    paddingHorizontal: TOKENS.spacing.md,
  },
});
