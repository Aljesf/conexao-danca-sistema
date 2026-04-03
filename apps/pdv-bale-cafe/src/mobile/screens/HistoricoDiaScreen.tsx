import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  calcularResumoDia,
  carregarHistoricoDia,
  formatFormaPagamento,
  formatMoney,
  formatPdvErrorMessage,
  formatVendaHora,
  type HistoricoVendaItem,
} from "../../lib/pdv-api";
import type { RootStackParamList } from "../App";
import PrimaryButton from "../components/PrimaryButton";
import ScreenShell from "../components/ScreenShell";
import StatusBanner from "../components/StatusBanner";
import { TOKENS } from "../theme/tokens";

type HistoricoDiaScreenProps = NativeStackScreenProps<RootStackParamList, "HistoricoDia">;

export default function HistoricoDiaScreen({ navigation }: HistoricoDiaScreenProps) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vendas, setVendas] = useState<HistoricoVendaItem[]>([]);

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    async function carregarHistorico() {
      setLoading(true);
      try {
        const data = await carregarHistoricoDia();
        if (!active) return;
        setVendas(data);
        setErro(null);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar historico."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarHistorico();

    return () => {
      active = false;
    };
  }, [isFocused]);

  const resumo = calcularResumoDia(vendas);

  return (
    <ScreenShell
      title="Historico do dia"
      subtitle="Lista enxuta das vendas registradas hoje no PDV do cafe."
      rightSlot={<PrimaryButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />}
    >
      {erro ? <StatusBanner tone="error" text={erro} /> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{resumo.quantidade_vendas} venda(s)</Text>
        <Text style={styles.summaryText}>Total vendido hoje: {formatMoney(resumo.total_centavos)}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={TOKENS.colors.accent} />
          <Text style={styles.loadingText}>Carregando historico do dia...</Text>
        </View>
      ) : vendas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhuma venda encontrada hoje.</Text>
          <Text style={styles.emptyText}>Assim que o operador registrar uma venda, ela aparece aqui.</Text>
        </View>
      ) : (
        vendas.map((venda) => (
          <Pressable
            key={venda.id}
            style={styles.saleCard}
            onPress={() => navigation.navigate("VendaDetalhe", { vendaId: venda.id })}
          >
            <View style={styles.saleCardHeader}>
              <Text style={styles.saleCardTitle}>Venda #{venda.id}</Text>
              <Text style={styles.saleCardAmount}>{formatMoney(venda.valor_total_centavos)}</Text>
            </View>
            <Text style={styles.saleCardMeta}>
              {formatVendaHora(venda.data_hora_venda)} · {formatFormaPagamento(venda.forma_pagamento)}
            </Text>
            <Text style={styles.saleCardMeta}>
              Operador: {venda.operador_nome ?? "Nao informado"}
            </Text>
            <Text style={styles.saleCardBuyer}>
              Comprador: {venda.colaborador_nome ?? venda.pagador_nome ?? "Nao informado"}
            </Text>
          </Pressable>
        ))
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 6,
    padding: TOKENS.spacing.lg,
  },
  summaryValue: {
    color: TOKENS.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.sm,
    padding: TOKENS.spacing.xl,
  },
  loadingText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: TOKENS.spacing.xl,
  },
  emptyTitle: {
    color: TOKENS.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  saleCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 6,
    padding: TOKENS.spacing.lg,
  },
  saleCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saleCardTitle: {
    color: TOKENS.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  saleCardAmount: {
    color: TOKENS.colors.accentStrong,
    fontSize: 18,
    fontWeight: "800",
  },
  saleCardMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  saleCardBuyer: {
    color: TOKENS.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
