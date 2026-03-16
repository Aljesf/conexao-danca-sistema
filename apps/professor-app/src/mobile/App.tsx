import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { AuthProvider, useProfessorAuth } from "./auth-context";
import LoginScreen from "./screens/LoginScreen";
import TodayScreen from "./screens/TodayScreen";
import TurmasScreen from "./screens/TurmasScreen";

export type RootStackParamList = {
  Login: undefined;
  Today: undefined;
  Turmas: { dataReferencia?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Carregando sessão...</Text>
    </View>
  );
}

function RootNavigator() {
  const { authStatus } = useProfessorAuth();

  if (authStatus === "booting") {
    return <LoadingScreen />;
  }

  return (
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
