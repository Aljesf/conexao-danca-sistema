import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TOKENS } from "../theme/tokens";

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export default function ScreenShell({
  title,
  subtitle,
  rightSlot,
  footer,
  children,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: TOKENS.spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  rightSlot: {
    minWidth: 96,
  },
  content: {
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  footer: {
    backgroundColor: TOKENS.colors.background,
    borderTopColor: TOKENS.colors.border,
    borderTopWidth: 1,
    padding: TOKENS.spacing.md,
  },
});
