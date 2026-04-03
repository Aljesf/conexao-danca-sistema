import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, usePdvAuth } from "./auth-context";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import VendaScreen from "./screens/VendaScreen";
import HistoricoDiaScreen from "./screens/HistoricoDiaScreen";
import VendaDetalheScreen from "./screens/VendaDetalheScreen";
import { TOKENS } from "./theme/tokens";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Venda: undefined;
  HistoricoDia: undefined;
  VendaDetalhe: { vendaId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: TOKENS.colors.background,
    card: TOKENS.colors.background,
    text: TOKENS.colors.text,
    border: TOKENS.colors.border,
    primary: TOKENS.colors.accent,
  },
};

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color={TOKENS.colors.accent} size="large" />
      <Text style={styles.loadingTitle}>Carregando sessao do PDV...</Text>
      <Text style={styles.loadingText}>Aguarde a restauracao do acesso do operador.</Text>
    </View>
  );
}

function RootNavigator() {
  const { authStatus } = usePdvAuth();

  if (authStatus === "booting") {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        key={authStatus}
        initialRouteName={authStatus === "authenticated" ? "Home" : "Login"}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: TOKENS.colors.background },
        }}
      >
        {authStatus === "authenticated" ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Venda" component={VendaScreen} />
            <Stack.Screen name="HistoricoDia" component={HistoricoDiaScreen} />
            <Stack.Screen name="VendaDetalhe" component={VendaDetalheScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    backgroundColor: TOKENS.colors.background,
    flex: 1,
    gap: TOKENS.spacing.md,
    justifyContent: "center",
    padding: TOKENS.spacing.xl,
  },
  loadingTitle: {
    color: TOKENS.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  loadingText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
