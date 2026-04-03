import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  calcularResumoDia,
  carregarHistoricoDia,
  formatMoney,
  formatPdvErrorMessage,
  type HistoricoVendaItem,
} from "../../lib/pdv-api";
import type { RootStackParamList } from "../App";
import { usePdvAuth } from "../auth-context";
import PrimaryButton from "../components/PrimaryButton";
import ScreenShell from "../components/ScreenShell";
import StatusBanner from "../components/StatusBanner";
import { TOKENS } from "../theme/tokens";

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const isFocused = useIsFocused();
  const { usuarioAutenticado, logout } = usePdvAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vendas, setVendas] = useState<HistoricoVendaItem[]>([]);

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    async function carregarResumo() {
      setLoading(true);
      try {
        const data = await carregarHistoricoDia();
        if (!active) return;
        setVendas(data);
        setErro(null);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar o dia."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarResumo();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const resumo = calcularResumoDia(vendas);
  const operadorNome = usuarioAutenticado?.nome ?? usuarioAutenticado?.email ?? "Operador";

  return (
    <ScreenShell
      title="PDV do dia"
      subtitle="Atalhos curtos para operar o balcao e acompanhar o movimento atual."
      rightSlot={<PrimaryButton label="Sair" variant="secondary" onPress={logout} />}
    >
      <View style={styles.operatorCard}>
        <Text style={styles.operatorEyebrow}>OPERADOR LOGADO</Text>
        <Text style={styles.operatorName}>{operadorNome}</Text>
        <Text style={styles.operatorText}>Use a mesma sessao do sistema e foque no fluxo rapido de venda.</Text>
      </View>

      {erro ? <StatusBanner tone="error" text={erro} /> : null}

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionCard} onPress={() => navigation.navigate("Venda")}>
          <Text style={styles.actionTitle}>Nova venda</Text>
          <Text style={styles.actionText}>Abrir catalogo, carrinho e fechamento do PDV.</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => navigation.navigate("HistoricoDia")}>
          <Text style={styles.actionTitle}>Historico do dia</Text>
          <Text style={styles.actionText}>Consultar vendas de hoje e abrir o detalhe basico.</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Resumo simples do dia</Text>
        {loading ? (
          <View style={styles.loadingInline}>
            <ActivityIndicator color={TOKENS.colors.accent} />
            <Text style={styles.loadingInlineText}>Carregando vendas do dia...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsRow}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Vendas</Text>
                <Text style={styles.metricValue}>{resumo.quantidade_vendas}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Total</Text>
                <Text style={styles.metricValue}>{formatMoney(resumo.total_centavos)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Ticket medio</Text>
                <Text style={styles.metricValue}>{formatMoney(resumo.ticket_medio_centavos)}</Text>
              </View>
            </View>

            <View style={styles.breakdown}>
              {resumo.por_forma_pagamento.length === 0 ? (
                <Text style={styles.breakdownEmpty}>Nenhuma venda registrada hoje.</Text>
              ) : (
                resumo.por_forma_pagamento.slice(0, 4).map((item) => (
                  <View key={item.codigo} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={styles.breakdownValue}>
                      {item.quantidade} venda(s) · {formatMoney(item.total_centavos)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  operatorCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: TOKENS.spacing.lg,
  },
  operatorEyebrow: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  operatorName: {
    color: TOKENS.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  operatorText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    gap: TOKENS.spacing.md,
  },
  actionCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: TOKENS.spacing.lg,
  },
  actionTitle: {
    color: TOKENS.colors.accentStrong,
    fontSize: 22,
    fontWeight: "800",
  },
  actionText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
  },
  sectionTitle: {
    color: TOKENS.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  loadingInline: {
    alignItems: "center",
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
  },
  loadingInlineText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  metricsRow: {
    gap: TOKENS.spacing.sm,
  },
  metricTile: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderRadius: TOKENS.radius.md,
    gap: 6,
    padding: TOKENS.spacing.md,
  },
  metricLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    color: TOKENS.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  breakdown: {
    borderTopColor: TOKENS.colors.border,
    borderTopWidth: 1,
    gap: TOKENS.spacing.sm,
    paddingTop: TOKENS.spacing.md,
  },
  breakdownEmpty: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  breakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    color: TOKENS.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownValue: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
});
