import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screen/LoginScreen';
import HomeScreen from './src/screen/HomeScreen';
import RealisasiProduksiScreen from './src/screen/RealisasiProduksiScreen';
import FormKoreksiStokScreen from './src/screen/FormKoreksiStokScreen';
import LhkFinishingViewScreen from './src/screen/LhkFinishingViewScreen';
import FormLhkFinishingScreen from './src/screen/FormLhkFinishingScreen';
import DalamPengembanganScreen from './src/screen/DalamPengembanganScreen';
import FlashMessage from 'react-native-flash-message';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  RealisasiProduksi: undefined;
  LhkFinishing: undefined;
  FormLhkFinishing: undefined;
  FormKoreksiStok: undefined;
  DalamPengembangan: {
    featureName?: string;
  };
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
            name="LhkFinishing"
            component={LhkFinishingViewScreen}
            options={{
              headerShown: true,
              title: 'LHK Finishing MMT',
            }}
          />

          <Stack.Screen
            name="FormLhkFinishing"
            component={FormLhkFinishingScreen}
            options={{
              headerShown: true,
              title: 'Input LHK Finishing',
            }}
          />

          <Stack.Screen
            name="FormKoreksiStok"
            component={FormKoreksiStokScreen}
            options={{
              headerShown: true,
              title: 'Input Koreksi Stok',
            }}
          />

          <Stack.Screen
            name="DalamPengembangan"
            component={DalamPengembanganScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <FlashMessage position="top" />
    </SafeAreaProvider>
  );
}
