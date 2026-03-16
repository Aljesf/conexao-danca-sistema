import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./screens/LoginScreen";
import TodayScreen from "./screens/TodayScreen";
import TurmasScreen from "./screens/TurmasScreen";

export type RootStackParamList = {
  Login: undefined;
  Today: undefined;
  Turmas: { dataReferencia?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Professor App" }}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
