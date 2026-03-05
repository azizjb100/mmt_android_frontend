import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { toast } from '../../components/toastComponent';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type HomeDirectScreen =
  | 'RealisasiProduksi'
  | 'KoreksiStokView'
  | 'LhkFinishing';

type MenuItem = {
  id: number;
  title: string;
  color: string;
  short: string;
  screen: HomeDirectScreen | null;
};

export default function HomeScreen({ navigation }: Props) {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Konfirmasi Keluar', 'Yakin ingin keluar dari aplikasi?', [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Keluar',
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ]);

        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  const confirmLogout = () => {
    Alert.alert('Konfirmasi Logout', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: handleLogout },
    ]);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      toast.success('Logout Berhasil');
    } finally {
      navigation.replace('Login');
    }
  };

  const menus: MenuItem[] = [
    {
      id: 1,
      title: 'Realisasi Produksi',
      color: '#1A237E',
      short: 'RP',
      screen: 'RealisasiProduksi',
    },
    {
      id: 2,
      title: 'Koreksi Stok',
      color: '#1A237E',
      short: 'KS',
      screen: 'KoreksiStokView',
    },
    {
      id: 3,
      title: 'LHK Finishing',
      color: '#1A237E',
      short: 'LHK',
      screen: 'LhkFinishing',
    },
    {
      id: 4,
      title: 'Barang Masuk',
      color: '#1A237E',
      short: 'IN',
      screen: null,
    },
    {
      id: 5,
      title: 'Barang Keluar',
      color: '#1A237E',
      short: 'OUT',
      screen: null,
    },
    {
      id: 6,
      title: 'Lokasi Gudang',
      color: '#1A237E',
      short: 'LOC',
      screen: null,
    },
    {
      id: 7,
      title: 'Notifikasi',
      color: '#1A237E',
      short: 'MSG',
      screen: null,
    },
    { id: 8, title: 'Laporan', color: '#1A237E', short: 'REP', screen: null },
    { id: 9, title: 'S.O.S', color: '#B71C1C', short: 'SOS', screen: null },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <MaterialIcons name="logout" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DASHBOARD MMT</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          {menus.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen);
                } else {
                  navigation.navigate('DalamPengembangan', {
                    featureName: item.title,
                  });
                }
              }}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: item.color }]}
              >
                <Text style={styles.iconText}>{item.short}</Text>
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#3F51B5',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  logoutBtn: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  container: { paddingVertical: 20 },
  grid: {
    flexDirection: 'column',
    paddingHorizontal: 16,
  },
  menuItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  iconText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  menuText: {
    marginLeft: 14,
    textAlign: 'left',
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
});
