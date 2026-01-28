import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/LoginScreen";
import HomeScreen from "./src/HomeScreen";
import RealisasiProduksiScreen from "./src/RealisasiProduksiScreen";
import KoreksiStokViewScreen from "./src/KoreksiStokViewScreen";
import FormKoreksiStokScreen from "./src/FormKoreksiStokScreen";
import FlashMessage from "react-native-flash-message";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RealisasiProduksi: undefined;
  KoreksiStokView: undefined;
  FormKoreksiStok: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="#3F51B5" barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />

          <Stack.Screen
            name="RealisasiProduksi"
            component={RealisasiProduksiScreen}
          />

          <Stack.Screen
            name="KoreksiStokView"
            component={KoreksiStokViewScreen}
            options={{
              headerShown: true,
              title: "Koreksi Stok",
            }}
          />

          <Stack.Screen
            name="FormKoreksiStok"
            component={FormKoreksiStokScreen}
            options={{
              headerShown: true,
              title: "Input Koreksi Stok",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <FlashMessage position="top" />
    </SafeAreaProvider>
  );
}
