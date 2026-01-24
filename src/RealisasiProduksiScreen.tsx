import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TextInput, 
    TouchableOpacity, Alert, ActivityIndicator, Modal 
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// Gunakan useCameraDevice (tanpa 's') untuk versi terbaru
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import apiClient from './api/api.services';

const RealisasiProduksiScreen = ({ navigation }) => {
    // --- State Kendali UI ---
    const [isSaving, setIsSaving] = useState(false);
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [activeScanIndex, setActiveScanIndex] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    
    // --- Setup Kamera ---
    const device = useCameraDevice('back'); // Mengambil kamera belakang secara spesifik

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        })();
    }, []);

    // Logic Scanner (Sesuai Logic Vue: Tutup scanner lalu proses API)
    const codeScanner = useCodeScanner({
        codeTypes: ['code-128', 'ean-13', 'qr'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && isScannerVisible) {
                const scannedValue = codes[0].value;
                setScannerVisible(false);
                handleBarcodeScan(activeScanIndex, scannedValue);
            }
        }
    });

    // --- State Form (Sesuai Reactive State di Vue) ---
    const createEmptyDetail = () => ({
        barcode: "",
        sku: "",
        Nama_Bahan: "",
        qty: 0,
        satuan: "",
        Panjang: 0,
        Lebar: 0,
        keterangan: "",
        operator: "",
        spk: "",
        stok: 0,
    });

    const [formData, setFormData] = useState({
        nomor: "AUTO",
        tanggal: new Date().toISOString().split('T')[0],
        gudangKode: "WH-16",
        gudangNama: "Gudang Bahan MMT",
        lokasiProduksiKode: "GPM",
        lokasiProduksiNama: "Gudang Produksi",
        keteranganHeader: "",
        detail: [createEmptyDetail()],
    });

    // --- Computed Logic (Sesuai Logic Vue) ---
    const calculatedTotal = useMemo(() => {
        return formData.detail
            .reduce((sum, d) => sum + (Number(d.qty) || 0), 0)
            .toFixed(2);
    }, [formData.detail]);

    const isFormValid = useMemo(() => {
        const isHeaderValid = !!formData.gudangKode && !!formData.lokasiProduksiKode;
        const isDetailValid = formData.detail.some((d) => d.sku && d.qty > 0);
        return isHeaderValid && isDetailValid;
    }, [formData]);

    // --- Methods (Sesuai Logic Vue) ---
    const handleBarcodeScan = async (index, barcodeValue) => {
        if (!barcodeValue) return;

        const isDuplicate = formData.detail.some((d, i) => d.barcode === barcodeValue && i !== index);
        if (isDuplicate) {
            Alert.alert("Peringatan", `Barcode ${barcodeValue} sudah digunakan.`);
            return;
        }

        try {
            const response = await apiClient.get(`/mmt/permintaan-produksi/stok-barcode/${encodeURIComponent(barcodeValue)}`);
            const bahan = response.data.data;

            if (!bahan) {
                Alert.alert("Error", "Data barcode tidak ditemukan.");
                return;
            }

            const newDetail = [...formData.detail];
            newDetail[index] = {
                ...newDetail[index],
                barcode: bahan.Barcode,
                sku: bahan.Kode,
                Nama_Bahan: bahan.Nama_Bahan,
                satuan: bahan.Satuan,
                Panjang: bahan.Panjang || 0,
                Lebar: bahan.Lebar || 0,
                stok: bahan.Stok || 0,
                qty: 1,
                spk: bahan.Nomor_SPK && bahan.Nomor_SPK !== "0" ? bahan.Nomor_SPK : "",
            };

            // Tambah baris otomatis jika baris terakhir sesuai logic Vue
            if (index === formData.detail.length - 1) {
                newDetail.push(createEmptyDetail());
            }

            setFormData({ ...formData, detail: newDetail });
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Gagal mengambil data barcode.");
        }
    };

    const saveForm = async () => {
        setIsSaving(true);
        const validDetails = formData.detail.filter(d => d.barcode.trim() !== "" && d.qty > 0);

        if (validDetails.length === 0) {
            Alert.alert("Error", "Minimal satu item barcode harus diisi dengan benar.");
            setIsSaving(false);
            return;
        }

        try {
            // Payload SESUAI DENGAN CONTROLLER di Vue
            const payload = {
                header: {
                    nomor: formData.nomor,
                    tanggal: formData.tanggal,
                    mnt_gdg_kode: formData.gudangKode,
                    mnt_lokasiproduksi: formData.lokasiProduksiKode,
                    mnt_keterangan: formData.keteranganHeader,
                    user_create: "Admin",
                },
                details: validDetails.map((d) => ({
                    sku: d.sku,
                    barcode: d.barcode,
                    qty: Number(d.qty),
                    satuan: d.satuan,
                    spk: d.spk || "0",
                    keterangan: d.keterangan,
                })),
                isEditMode: false,
            };

            const response = await apiClient.post('/mmt/permintaan-produksi', payload);
            Alert.alert("Sukses", response.data.message || "Data berhasil disimpan");
            navigation.goBack();
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message;
            Alert.alert("Error", errorMsg || "Terjadi kesalahan saat menyimpan.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Modal Kamera - Diperbaiki agar tidak black screen */}
            <Modal visible={isScannerVisible} animationType="slide">
                <View style={styles.scannerContainer}>
                    {device && hasPermission ? (
                        <Camera 
                            style={StyleSheet.absoluteFill} 
                            device={device} 
                            isActive={isScannerVisible} 
                            codeScanner={codeScanner} 
                        />
                    ) : (
                        <View style={styles.centerText}>
                            <Text style={{color: 'white'}}>Mencari Kamera atau Izin Ditolak...</Text>
                        </View>
                    )}
                    {/* Overlay Frame Scan */}
                    <View style={styles.scanOverlay}>
                        <View style={styles.scanFrame} />
                    </View>
                    <TouchableOpacity style={styles.btnCloseScanner} onPress={() => setScannerVisible(false)}>
                        <Text style={{color: 'white', fontWeight: 'bold'}}>TUTUP KAMERA</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Header / AppBar */}
            <View style={styles.appBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Permintaan Bahan MMT</Text>
                <TouchableOpacity onPress={saveForm} disabled={!isFormValid || isSaving}>
                    {isSaving ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="check-circle" size={26} color="white" />}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Section Header Data */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Data Header</Text>
                    <Text style={styles.label}>Nomor Transaksi</Text>
                    <TextInput style={[styles.input, styles.disabledInput]} value={formData.nomor} editable={false} />
                    
                    <View style={styles.row}>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>Tanggal</Text>
                            <TextInput style={styles.input} value={formData.tanggal} />
                        </View>
                        <View style={{flex: 1, marginLeft: 10}}>
                            <Text style={styles.label}>Gudang Asal</Text>
                            <TextInput style={[styles.input, styles.disabledInput]} value={formData.gudangKode} editable={false} />
                        </View>
                    </View>

                    <Text style={styles.label}>Keterangan Header</Text>
                    <TextInput 
                        style={styles.input} 
                        multiline 
                        onChangeText={(v) => setFormData({...formData, keteranganHeader: v})}
                    />
                    
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>TOTAL QTY MINTA:</Text>
                        <Text style={styles.totalValue}>{calculatedTotal}</Text>
                    </View>
                </View>

                {/* Section Detail Item */}
                <Text style={[styles.sectionTitle, {marginTop: 20}]}>Detail Item</Text>
                {formData.detail.map((item, index) => (
                    <View key={index} style={styles.itemCard}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.itemNumber}>Baris {index + 1}</Text>
                            <TouchableOpacity onPress={() => {
                                const newDet = [...formData.detail];
                                if(newDet.length > 1) {
                                    newDet.splice(index, 1);
                                    setFormData({...formData, detail: newDet});
                                }
                            }}>
                                <MaterialCommunityIcons name="delete" size={20} color="red" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rowInput}>
                            <TextInput 
                                style={[styles.input, {flex: 1, marginBottom: 0}]} 
                                placeholder="Scan Barcode / SKU..." 
                                value={item.barcode}
                                onSubmitEditing={() => handleBarcodeScan(index, item.barcode)}
                                onChangeText={(v) => {
                                    const nd = [...formData.detail];
                                    nd[index].barcode = v;
                                    setFormData({...formData, detail: nd});
                                }}
                            />
                            <TouchableOpacity 
                                style={styles.scanBtn} 
                                onPress={() => { setActiveScanIndex(index); setScannerVisible(true); }}
                            >
                                <MaterialCommunityIcons name="barcode-scan" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        {item.sku ? (
                            <View style={styles.infoContainer}>
                                <Text style={styles.infoTitle}>{item.Nama_Bahan}</Text>
                                <View style={styles.qtyRow}>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.label}>Qty Minta</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            keyboardType="numeric" 
                                            value={String(item.qty)}
                                            onChangeText={(v) => {
                                                const nd = [...formData.detail];
                                                nd[index].qty = Number(v);
                                                setFormData({...formData, detail: nd});
                                            }}
                                        />
                                    </View>
                                    <View style={{flex: 1, marginLeft: 10}}>
                                        <Text style={styles.label}>Satuan</Text>
                                        <TextInput style={[styles.input, styles.disabledInput]} value={item.satuan} editable={false} />
                                    </View>
                                </View>
                                <Text style={styles.infoSub}>Stok: {item.stok} | SPK: {item.spk || '-'}</Text>
                            </View>
                        ) : null}
                    </View>
                ))}
                <View style={{height: 50}} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    appBar: { height: 60, backgroundColor: '#3F51B5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
    appBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    content: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, elevation: 2 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    label: { fontSize: 11, color: '#888', marginTop: 8 },
    row: { flexDirection: 'row' },
    input: { borderBottomWidth: 1, borderColor: '#DDD', paddingVertical: 5, color: '#333', fontSize: 14, marginBottom: 5 },
    disabledInput: { backgroundColor: '#f9f9f9', borderBottomWidth: 0, paddingHorizontal: 5, borderRadius: 4 },
    totalBox: { marginTop: 15, padding: 12, backgroundColor: '#E8EAF6', borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontWeight: 'bold', color: '#3F51B5', fontSize: 12 },
    totalValue: { fontWeight: 'bold', fontSize: 18, color: '#333' },
    itemCard: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#3F51B5' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowInput: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    scanBtn: { backgroundColor: '#3F51B5', padding: 10, borderRadius: 6, marginLeft: 10 },
    infoContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
    infoTitle: { fontWeight: 'bold', color: '#1A237E', fontSize: 13 },
    infoSub: { fontSize: 11, color: '#666', marginTop: 5 },
    qtyRow: { flexDirection: 'row', marginTop: 5 },
    scannerContainer: { flex: 1, backgroundColor: 'black' },
    centerText: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 250, height: 150, borderWidth: 2, borderColor: '#00FF00', borderRadius: 10 },
    btnCloseScanner: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#FF5252', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 }
});

export default RealisasiProduksiScreen;