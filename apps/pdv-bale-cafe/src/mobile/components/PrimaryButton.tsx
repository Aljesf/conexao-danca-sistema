import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { TOKENS } from "../theme/tokens";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : null,
        variant === "ghost" ? styles.ghost : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? TOKENS.colors.white : TOKENS.colors.accent} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.labelPrimary : styles.labelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    backgroundColor: TOKENS.colors.accent,
    borderRadius: TOKENS.radius.md,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  secondary: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderColor: TOKENS.colors.border,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: TOKENS.colors.border,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  labelPrimary: {
    color: TOKENS.colors.white,
  },
  labelSecondary: {
    color: TOKENS.colors.accent,
  },
});
