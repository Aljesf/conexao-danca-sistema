import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney, type ProdutoCatalogo } from "../../lib/pdv-api";
import { TOKENS } from "../theme/tokens";

type ProductGridProps = {
  products: ProdutoCatalogo[];
  quantitiesByProductId: Record<number, number>;
  onAddProduct: (product: ProdutoCatalogo) => void;
};

export default function ProductGrid({
  products,
  quantitiesByProductId,
  onAddProduct,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nenhum produto encontrado.</Text>
        <Text style={styles.emptyText}>Ajuste a busca ou troque a categoria para seguir vendendo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {products.map((product) => {
        const quantity = quantitiesByProductId[product.id] ?? 0;

        return (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            onPress={() => onAddProduct(product)}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{product.nome}</Text>
              {quantity > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{quantity}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardCategory}>
              {product.subcategoria_nome ?? product.categoria_nome ?? "Catalogo"}
            </Text>
            <Text style={styles.cardPrice}>{formatMoney(product.preco_venda_centavos)}</Text>
            <Text style={styles.cardMeta}>{product.unidade_venda ?? "un"} por toque</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TOKENS.spacing.sm,
  },
  card: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    gap: 8,
    minHeight: 144,
    padding: TOKENS.spacing.md,
    width: "48%",
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: TOKENS.colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    alignItems: "center",
    backgroundColor: TOKENS.colors.accent,
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: TOKENS.colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  cardCategory: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  cardPrice: {
    color: TOKENS.colors.accentStrong,
    fontSize: 20,
    fontWeight: "800",
  },
  cardMeta: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: TOKENS.spacing.lg,
  },
  emptyTitle: {
    color: TOKENS.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
