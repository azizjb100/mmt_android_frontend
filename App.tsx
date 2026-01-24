import React from 'react';
import { useColorScheme, StatusBar } from 'react-native'; // Tambahkan StatusBar
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/LoginScreen';
import HomeScreen from './src/HomeScreen';
import RealisasiProduksiScreen from './src/RealisasiProduksiScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      {/* Menyesuaikan warna bar status baterai/jam di atas HP */}
      <StatusBar 
        backgroundColor="#3F51B5" 
        barStyle="light-content" 
      />
      
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false // Sembunyikan header global karena kita pakai header kustom
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />
          <Stack.Screen 
            name="RealisasiProduksi" 
            component={RealisasiProduksiScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;