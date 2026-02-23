import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./screens/LoginScreen";
import TodayScreen from "./screens/TodayScreen";

export type RootStackParamList = {
  Login: undefined;
  Today: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Professor" }} />
        <Stack.Screen name="Today" component={TodayScreen} options={{ title: "Aulas de hoje" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
