import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  carregarVendaDetalhe,
  formatMoney,
  formatPdvErrorMessage,
  formatVendaHora,
  type VendaDetalhe,
} from "../../lib/pdv-api";
import type { RootStackParamList } from "../App";
import PrimaryButton from "../components/PrimaryButton";
import ScreenShell from "../components/ScreenShell";
import StatusBanner from "../components/StatusBanner";
import { TOKENS } from "../theme/tokens";

type VendaDetalheScreenProps = NativeStackScreenProps<RootStackParamList, "VendaDetalhe">;

export default function VendaDetalheScreen({ navigation, route }: VendaDetalheScreenProps) {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [venda, setVenda] = useState<VendaDetalhe | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    let active = true;

    async function carregarDetalhe() {
      setLoading(true);
      try {
        const data = await carregarVendaDetalhe(route.params.vendaId);
        if (!active) return;
        setVenda(data);
        setErro(null);
      } catch (error) {
        if (!active) return;
        setErro(formatPdvErrorMessage(error instanceof Error ? error.message : "Falha ao carregar a venda."));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void carregarDetalhe();

    return () => {
      active = false;
    };
  }, [isFocused, route.params.vendaId]);

  return (
    <ScreenShell
      title="Detalhe da venda"
      subtitle={`Venda #${route.params.vendaId}`}
      rightSlot={<PrimaryButton label="Voltar" variant="secondary" onPress={() => navigation.goBack()} />}
    >
      {erro ? <StatusBanner tone="error" text={erro} /> : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={TOKENS.colors.accent} />
          <Text style={styles.loadingText}>Carregando detalhe da venda...</Text>
        </View>
      ) : venda ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.saleNumber}>{venda.numero_legivel}</Text>
            <Text style={styles.saleTotal}>{formatMoney(venda.total_centavos)}</Text>
            <Text style={styles.saleMeta}>
              {formatVendaHora(venda.created_at)} · {venda.forma_pagamento ?? "Nao informado"}
            </Text>
            <Text style={styles.saleMeta}>Operador: {venda.operador.nome ?? "Nao informado"}</Text>
            <Text style={styles.saleMeta}>Comprador: {venda.comprador.nome ?? "Nao informado"}</Text>
            <Text style={styles.saleMeta}>Perfil: {venda.perfil_resolvido ?? "Nao informado"}</Text>
            {venda.competencia ? (
              <Text style={styles.saleMeta}>Competencia: {venda.competencia}</Text>
            ) : null}
          </View>

          <View style={styles.itemsCard}>
            <Text style={styles.itemsTitle}>Itens da venda</Text>
            {venda.itens.map((item, index) => (
              <View key={`${item.produto_id ?? index}-${index}`} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.produto_nome}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantidade} x {formatMoney(item.valor_unitario_centavos)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatMoney(item.subtotal_centavos)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
  summaryCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: 6,
    padding: TOKENS.spacing.lg,
  },
  saleNumber: {
    color: TOKENS.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  saleTotal: {
    color: TOKENS.colors.accentStrong,
    fontSize: 22,
    fontWeight: "800",
  },
  saleMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  itemsCard: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
  },
  itemsTitle: {
    color: TOKENS.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  itemSubtotal: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
