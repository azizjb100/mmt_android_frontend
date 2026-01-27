import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type MenuItem = {
    id: number;
    title: string;
    color: string;
    short: string;
    screen: keyof RootStackParamList | null;
};

export default function HomeScreen({ navigation }: Props) {
    const menus: MenuItem[] = [
        { id: 1, title: "Realisasi Produksi", color: "#1A237E", short: "PROD", screen: "RealisasiProduksi" },
        { id: 2, title: "Stok Opname", color: "#1A237E", short: "SO", screen: "KoreksiStokView" }, // <-- samakan dengan App.tsx
        { id: 3, title: "Daftar Stok", color: "#1A237E", short: "STOK", screen: null },
        { id: 4, title: "Barang Masuk", color: "#1A237E", short: "IN", screen: null },
        { id: 5, title: "Barang Keluar", color: "#1A237E", short: "OUT", screen: null },
        { id: 6, title: "Lokasi Gudang", color: "#1A237E", short: "LOC", screen: null },
        { id: 7, title: "Notifikasi", color: "#1A237E", short: "MSG", screen: null },
        { id: 8, title: "Laporan", color: "#1A237E", short: "REP", screen: null },
        { id: 9, title: "S.O.S", color: "#B71C1C", short: "SOS", screen: null },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Dashboard Gudang</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.grid}>
            {menus.map((item) => (
                <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                    if (item.screen) {
                    navigation.navigate(item.screen);
                    } else {
                    Alert.alert("Info", `${item.title} belum tersedia`);
                    }
                }}
                >
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
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
    safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
    header: {
        backgroundColor: "#3F51B5",
        height: 60,
        justifyContent: "center",
        alignItems: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
    },
    headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
    container: { paddingVertical: 20 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
    menuItem: { width: "33.33%", alignItems: "center", marginBottom: 25 },
    iconContainer: {
        width: 75,
        height: 75,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconText: { color: "white", fontWeight: "bold", fontSize: 14 },
    menuText: {
        marginTop: 10,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
        paddingHorizontal: 5,
    },
});
