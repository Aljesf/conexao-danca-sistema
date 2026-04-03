import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TOKENS } from "../theme/tokens";

type StatusBannerProps = {
  tone: "info" | "error" | "success";
  text: string;
};

export default function StatusBanner({ tone, text }: StatusBannerProps) {
  return (
    <View
      style={[
        styles.container,
        tone === "error" ? styles.error : null,
        tone === "success" ? styles.success : null,
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === "error" ? styles.textError : null,
          tone === "success" ? styles.textSuccess : null,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.surfaceAlt,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    padding: TOKENS.spacing.md,
  },
  error: {
    backgroundColor: "#FFF3F1",
    borderColor: "#F0C1BB",
  },
  success: {
    backgroundColor: "#F0FAF4",
    borderColor: "#BEE1C9",
  },
  text: {
    color: TOKENS.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  textError: {
    color: TOKENS.colors.danger,
  },
  textSuccess: {
    color: TOKENS.colors.success,
  },
});
