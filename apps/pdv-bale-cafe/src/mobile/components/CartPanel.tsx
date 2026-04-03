import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatMoney } from "../../lib/pdv-api";
import { TOKENS } from "../theme/tokens";

export type CartItemViewModel = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
  observacao: string;
};

type CartPanelProps = {
  items: CartItemViewModel[];
  totalCentavos: number;
  observacaoVenda: string;
  onIncrease: (productId: number) => void;
  onDecrease: (productId: number) => void;
  onRemove: (productId: number) => void;
  onChangeItemNote: (productId: number, observacao: string) => void;
  onChangeSaleNote: (observacao: string) => void;
};

export default function CartPanel({
  items,
  totalCentavos,
  observacaoVenda,
  onIncrease,
  onDecrease,
  onRemove,
  onChangeItemNote,
  onChangeSaleNote,
}: CartPanelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carrinho</Text>
      <Text style={styles.subtitle}>Ajuste quantidade, remova itens e registre observacoes quando precisar.</Text>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Carrinho vazio.</Text>
          <Text style={styles.emptyText}>Toque nos produtos do catalogo para montar a venda.</Text>
        </View>
      ) : (
        items.map((item) => {
          const subtotalCentavos = item.quantidade * item.valor_unitario_centavos;

          return (
            <View key={item.produto_id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemHeaderCopy}>
                  <Text style={styles.itemName}>{item.nome}</Text>
                  <Text style={styles.itemPrice}>
                    {formatMoney(item.valor_unitario_centavos)} cada
                  </Text>
                </View>
                <Pressable onPress={() => onRemove(item.produto_id)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Remover</Text>
                </Pressable>
              </View>

              <View style={styles.quantityRow}>
                <Pressable onPress={() => onDecrease(item.produto_id)} style={styles.counterButton}>
                  <Text style={styles.counterButtonText}>-</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{item.quantidade}</Text>
                <Pressable onPress={() => onIncrease(item.produto_id)} style={styles.counterButton}>
                  <Text style={styles.counterButtonText}>+</Text>
                </Pressable>
                <Text style={styles.subtotalValue}>{formatMoney(subtotalCentavos)}</Text>
              </View>

              <TextInput
                placeholder="Observacao do item"
                placeholderTextColor={TOKENS.colors.textMuted}
                style={styles.noteInput}
                value={item.observacao}
                onChangeText={(value) => onChangeItemNote(item.produto_id, value)}
              />
            </View>
          );
        })
      )}

      <TextInput
        placeholder="Observacao geral da venda"
        placeholderTextColor={TOKENS.colors.textMuted}
        style={[styles.noteInput, styles.saleNoteInput]}
        value={observacaoVenda}
        onChangeText={onChangeSaleNote}
        multiline
      />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatMoney(totalCentavos)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderRadius: TOKENS.radius.md,
    gap: 6,
    padding: TOKENS.spacing.md,
  },
  emptyTitle: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderRadius: TOKENS.radius.md,
    gap: TOKENS.spacing.sm,
    padding: TOKENS.spacing.md,
  },
  itemHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
    justifyContent: "space-between",
  },
  itemHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemPrice: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  removeButton: {
    paddingVertical: 4,
  },
  removeButtonText: {
    color: TOKENS.colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
  },
  counterButton: {
    alignItems: "center",
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  counterButtonText: {
    color: TOKENS.colors.accent,
    fontSize: 18,
    fontWeight: "700",
  },
  quantityValue: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  subtotalValue: {
    color: TOKENS.colors.accentStrong,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: "auto",
  },
  noteInput: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    color: TOKENS.colors.text,
    minHeight: 48,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 12,
  },
  saleNoteInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  totalRow: {
    alignItems: "center",
    borderTopColor: TOKENS.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: TOKENS.spacing.md,
  },
  totalLabel: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    color: TOKENS.colors.accentStrong,
    fontSize: 22,
    fontWeight: "800",
  },
});
