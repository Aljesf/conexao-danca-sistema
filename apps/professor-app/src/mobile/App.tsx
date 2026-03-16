import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import {
  getAuthBootstrapState,
  getSessaoAtual,
  logoutApp,
  restaurarSessao,
  subscribeAuthState,
  type AuthBootstrapState,
} from "../lib/api";
import {
  AuthContext,
  type RootAuthStatus,
} from "./auth-context";
import LoginScreen from "./screens/LoginScreen";
import TodayScreen from "./screens/TodayScreen";
import TurmasScreen from "./screens/TurmasScreen";

export type RootStackParamList = {
  Login: undefined;
  Today: undefined;
  Turmas: { dataReferencia?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function mapRootAuthStatus(state: AuthBootstrapState): RootAuthStatus {
  if (state.isHydratingSession) return "booting";
  return state.isAuthenticated ? "authenticated" : "unauthenticated";
}

export default function App() {
  const [authState, setAuthState] = useState<AuthBootstrapState>(getAuthBootstrapState());
  const [authStatus, setAuthStatus] = useState<RootAuthStatus>("booting");

  function applyAuthState(nextState: AuthBootstrapState): AuthBootstrapState {
    setAuthState(nextState);
    setAuthStatus(mapRootAuthStatus(nextState));
    return nextState;
  }

  async function refreshAuthState(): Promise<AuthBootstrapState> {
    return applyAuthState(await getSessaoAtual());
  }

  async function logout(): Promise<void> {
    const nextState = await logoutApp();
    applyAuthState(nextState);
  }

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextState) => {
      applyAuthState(nextState);
    });

    void restaurarSessao().then((nextState) => {
      applyAuthState(nextState);
    });

    return unsubscribe;
  }, []);

  const usuarioAutenticado = authState.user
    ? {
        nome: authState.user.nome,
        email: authState.user.email,
        perfil: authState.user.perfil,
      }
    : null;

  if (authStatus === "booting") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Carregando sessão...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        authState,
        usuarioAutenticado,
        refreshAuthState,
        logout,
      }}
    >
      <NavigationContainer>
        <Stack.Navigator
          key={authStatus}
          initialRouteName={authStatus === "authenticated" ? "Today" : "Login"}
        >
          {authStatus === "authenticated" ? (
            <>
              <Stack.Screen
                name="Today"
                component={TodayScreen}
                options={{ title: "Dashboard do professor" }}
              />
              <Stack.Screen
                name="Turmas"
                component={TurmasScreen}
                options={{ title: "Outras turmas" }}
              />
            </>
          ) : (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: "Professor App" }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
