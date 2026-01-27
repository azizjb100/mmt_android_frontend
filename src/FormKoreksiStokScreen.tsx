/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import api from "../src/api/api.services";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type DetailItem = {
  SKU: string;
  NamaBarang: string;
  Satuan: string;
  Panjang: number;
  Lebar: number;
  Expired: string | null;
  System: number;
  Fisik: number;
  Qty: number;
  Harga: number;
  Nilai: number;
};

type MasterHeader = {
  Nomor: string;
  Tanggal: string;
  GudangKode: string;
  GudangNama: string;
  TypeKor: number;
  Keterangan: string;
};

type GudangLookup = { Kode: string; Nama: string };
type TypeKorLookup = { kode: number; nama: string };

const PRIMARY = "#3F51B5";
const INDIGO = "#1A237E";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const MUTED = "#6B7280";
const SUCCESS = "#16A34A";
const DANGER = "#DC2626";

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pickArray = (data: any): any[] => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};

const fixNegZero = (n: number) => (Object.is(n, -0) ? 0 : n);

function SelectModal<T>(props: {
  visible: boolean;
  title: string;
  items: T[];
  getKey: (it: T, idx: number) => string;
  getLabel: (it: T) => string;
  onSelect: (it: T) => void;
  onClose: () => void;
}) {
  const { visible, title, items, getKey, getLabel, onSelect, onClose } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={(it, idx) => getKey(it, idx)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{getLabel(item)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.modalEmpty}>Data kosong</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function FormKoreksiStok({ navigation }: any) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(false);

  const LIST_TYPE_KOR: TypeKorLookup[] = useMemo(
    () => [
      { nama: "Terima", kode: 100 },
      { nama: "Keluar", kode: 200 },
      { nama: "Sisa Produksi", kode: 300 },
    ],
    []
  );

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [listGudang, setListGudang] = useState<GudangLookup[]>([]);
  const [openGudang, setOpenGudang] = useState(false);

  const [openType, setOpenType] = useState(false);

  const [header, setHeader] = useState<MasterHeader>({
    Nomor: "AUTO",
    Tanggal: new Date().toISOString().slice(0, 10),
    GudangKode: "WH-16",
    GudangNama: "GUDANG UTAMA MMT",
    TypeKor: 100,
    Keterangan: "",
  });

  const [details, setDetails] = useState<DetailItem[]>([]);
  const [search, setSearch] = useState("");

  const draftFisikRef = useRef<Map<string, string>>(new Map());
  const draftPanjangRef = useRef<Map<string, string>>(new Map());
  const draftLebarRef = useRef<Map<string, string>>(new Map());

  const addRow = useCallback(() => {
    setDetails((prev) => [
      ...prev,
      {
        SKU: "",
        NamaBarang: "",
        Satuan: "",
        Panjang: 0,
        Lebar: 0,
        Expired: null,
        System: 0,
        Fisik: 0,
        Qty: 0,
        Harga: 0,
        Nilai: 0,
      },
    ]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setDetails((prev) => {
      const copy = [...prev];
      const removed = copy[index];
      copy.splice(index, 1);

      if (removed?.SKU) {
        draftFisikRef.current.delete(removed.SKU);
        draftPanjangRef.current.delete(removed.SKU);
        draftLebarRef.current.delete(removed.SKU);
      }

      return copy.length
        ? copy
        : [
            {
              SKU: "",
              NamaBarang: "",
              Satuan: "",
              Panjang: 0,
              Lebar: 0,
              Expired: null,
              System: 0,
              Fisik: 0,
              Qty: 0,
              Harga: 0,
              Nilai: 0,
            },
          ];
    });
  }, []);

  const calculateRowByIndex = useCallback((index: number, patch?: Partial<Pick<DetailItem, "Fisik" | "System" | "Harga">>) => {
    setDetails((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;

      const next = { ...item, ...patch };

      const fisik = num(next.Fisik);
      const system = num(next.System);
      const harga = num(next.Harga);

      const qty = fisik - system;
      const nilai = qty * harga;

      copy[index] = {
        ...next,
        Fisik: fisik,
        System: system,
        Harga: harga,
        Qty: fixNegZero(qty),
        Nilai: fixNegZero(nilai),
      };
      return copy;
    });
  }, []);

  const commitUkuran = useCallback(
    (sku: string, indexHint: number, field: "Panjang" | "Lebar", valueStr: string, opts?: { keepDraft?: boolean }) => {
      const trimmed = String(valueStr ?? "").trim();
      const val = trimmed === "" ? 0 : num(trimmed);

      setDetails((prev) => {
        const copy = [...prev];
        const realIndex = copy[indexHint]?.SKU === sku ? indexHint : copy.findIndex((x) => x.SKU === sku);
        const idx = realIndex >= 0 ? realIndex : indexHint;
        const item = copy[idx];
        if (!item) return prev;

        copy[idx] = { ...item, [field]: val } as DetailItem;
        return copy;
      });

      if (!opts?.keepDraft) {
        if (field === "Panjang") draftPanjangRef.current.delete(sku);
        if (field === "Lebar") draftLebarRef.current.delete(sku);
      }
    },
    []
  );

  const fetchLookups = useCallback(async () => {
    setLoadingLookup(true);
    try {
      const resGdg = await api.get("/mmt/lookup/gudang");
      const raw = pickArray(resGdg?.data);
      const gudang: GudangLookup[] = raw
        .map((x: any) => ({
          Kode: String(x?.Kode ?? ""),
          Nama: String(x?.Nama ?? ""),
        }))
        .filter((x: GudangLookup) => x.Kode && x.Nama);

      setListGudang(gudang);

      if (header.GudangKode) {
        const found = gudang.find((g) => g.Kode === header.GudangKode);
        if (found) setHeader((p) => ({ ...p, GudangNama: found.Nama }));
      }
    } catch (err: any) {
      console.log("Gagal load lookup gudang:", err?.response?.data || err?.message || err);
      Alert.alert("Error", String(err?.response?.data?.message || err?.message || "Gagal load lookup gudang"));
    } finally {
      setLoadingLookup(false);
    }
  }, [header.GudangKode]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const totalNilai = useMemo(() => details.reduce((a, b) => a + (b.Nilai || 0), 0), [details]);

  const filteredDetails = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return details;
    return details.filter((x) => {
      const sku = (x.SKU || "").toLowerCase();
      const nama = (x.NamaBarang || "").toLowerCase();
      return sku.includes(q) || nama.includes(q);
    });
  }, [details, search]);

  const typeKorName = useMemo(() => LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama ?? "", [LIST_TYPE_KOR, header.TypeKor]);

  const commitFisik = useCallback(
    (sku: string, indexHint: number, valueStr: string, opts?: { keepDraft?: boolean }) => {
      const trimmed = String(valueStr ?? "").trim();
      const val = trimmed === "" ? 0 : num(trimmed);

      const realIndex = (() => {
        const direct = details[indexHint];
        if (direct?.SKU === sku) return indexHint;
        const idx = details.findIndex((x) => x.SKU === sku);
        return idx >= 0 ? idx : indexHint;
      })();

      calculateRowByIndex(realIndex, { Fisik: val });

      if (!opts?.keepDraft) draftFisikRef.current.delete(sku);
    },
    [details, calculateRowByIndex]
  );

  const adjustFisik = useCallback(
    (sku: string, indexHint: number, currentFisik: number, delta: number) => {
      const map = draftFisikRef.current;
      const base = map.has(sku) ? num(map.get(sku)) : num(currentFisik);
      const next = String(base + delta);
      map.set(sku, next);
      commitFisik(sku, indexHint, next, { keepDraft: true });
    },
    [commitFisik]
  );

  const loadAllStockFromGudang = useCallback(async () => {
    if (!header.GudangKode) return Alert.alert("Validasi", "Pilih gudang terlebih dahulu");

    setLoading(true);
    try {
      const res = await api.get("/mmt/koreksi-stok/stok", {
        params: { gudangKode: header.GudangKode, tanggal: header.Tanggal },
      });

      const dataStok = pickArray(res?.data);
      if (!dataStok.length) {
        setDetails([]);
        draftFisikRef.current.clear();
        draftPanjangRef.current.clear();
        draftLebarRef.current.clear();
        Alert.alert("Info", "Tidak ada data stok ditemukan.");
        return;
      }

      const mapped: DetailItem[] = dataStok.map((item: any) => {
        const system = num(item?.Stok ?? 0);
        const harga = num(item?.HRGBELI ?? 0);
        const qty = 0 - system;
        const nilai = qty * harga;

        return {
          SKU: String(item?.Kode ?? ""),
          NamaBarang: String(item?.Nama ?? ""),
          Satuan: String(item?.Satuan ?? ""),
          Panjang: num(item?.Panjang ?? 0),
          Lebar: num(item?.Lebar ?? 0),
          Expired: null,
          System: system,
          Fisik: 0,
          Qty: fixNegZero(qty),
          Harga: harga,
          Nilai: fixNegZero(nilai),
        };
      });

      draftFisikRef.current.clear();
      draftPanjangRef.current.clear();
      draftLebarRef.current.clear();
      setDetails(mapped);
      setHeaderCollapsed(true);
    } catch (e: any) {
      Alert.alert("Gagal", "Gagal memuat stok: " + String(e?.response?.data?.message || e?.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  }, [header.GudangKode, header.Tanggal]);

  const saveData = useCallback(async () => {
    const validDetails = details.filter((d) => d.SKU && d.SKU.trim() !== "");
    if (!header.GudangKode || !header.TypeKor) return Alert.alert("Validasi", "Header harus lengkap!");
    if (validDetails.length === 0) return Alert.alert("Validasi", "Detail barang kosong!");

    setSaving(true);
    try {
      const typeName = LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama;

      const payload = {
        header: {
          ...header,
          TypeName: typeName,
        },
        details: validDetails,
      };

      await api.post("/mmt/koreksi-stok", payload);

      Alert.alert("Sukses", "Simpan Berhasil!");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Gagal", "Gagal Simpan: " + String(e?.response?.data?.message || e?.message || "Unknown"));
    } finally {
      setSaving(false);
    }
  }, [details, header, LIST_TYPE_KOR, navigation]);

  const Row = React.memo(({ item, index }: { item: DetailItem; index: number }) => {
    const [localFisik, setLocalFisik] = useState<string>(() => draftFisikRef.current.get(item.SKU) ?? String(item.Fisik ?? 0));
    const [localPanjang, setLocalPanjang] = useState<string>(() => draftPanjangRef.current.get(item.SKU) ?? String(item.Panjang ?? 0));
    const [localLebar, setLocalLebar] = useState<string>(() => draftLebarRef.current.get(item.SKU) ?? String(item.Lebar ?? 0));

    useEffect(() => {
      setLocalFisik(draftFisikRef.current.get(item.SKU) ?? String(item.Fisik ?? 0));
      setLocalPanjang(draftPanjangRef.current.get(item.SKU) ?? String(item.Panjang ?? 0));
      setLocalLebar(draftLebarRef.current.get(item.SKU) ?? String(item.Lebar ?? 0));
    }, [item.SKU, item.Fisik, item.Panjang, item.Lebar]);

    const qty = item.Qty;

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.skuText}>{item.SKU || "—"}</Text>
            <Text style={styles.namaText} numberOfLines={2}>
              {item.NamaBarang || "Nama Barang"}
            </Text>

            <Text style={styles.smallMeta}>
              Satuan: <Text style={styles.smallStrong}>{item.Satuan || "—"}</Text>
            </Text>
          </View>

          <TouchableOpacity onPress={() => removeRow(index)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="restore-from-trash" size={22} color={DANGER} />
          </TouchableOpacity>
        </View>

        {/* Ukuran editable (Panjang & Lebar) */}
        <View style={[styles.gridRow, { marginTop: 10 }]}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Panjang (m)</Text>
            <TextInput
              style={[styles.inputMini, { textAlign: "right" }]}
              keyboardType="decimal-pad"
              value={localPanjang}
              placeholder="0"
              placeholderTextColor="#9AA0A6"
              onChangeText={(v) => {
                setLocalPanjang(v);
                draftPanjangRef.current.set(item.SKU, v);
              }}
              onEndEditing={() => commitUkuran(item.SKU, index, "Panjang", localPanjang, { keepDraft: false })}
              onBlur={() => commitUkuran(item.SKU, index, "Panjang", localPanjang, { keepDraft: false })}
            />
          </View>

          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Lebar (m)</Text>
            <TextInput
              style={[styles.inputMini, { textAlign: "right" }]}
              keyboardType="decimal-pad"
              value={localLebar}
              placeholder="0"
              placeholderTextColor="#9AA0A6"
              onChangeText={(v) => {
                setLocalLebar(v);
                draftLebarRef.current.set(item.SKU, v);
              }}
              onEndEditing={() => commitUkuran(item.SKU, index, "Lebar", localLebar, { keepDraft: false })}
              onBlur={() => commitUkuran(item.SKU, index, "Lebar", localLebar, { keepDraft: false })}
            />
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Stok Sistem</Text>
            <Text style={styles.gridValue}>{item.System}</Text>
          </View>

          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Stok Fisik</Text>
            <View style={styles.fisikBox}>
              <TouchableOpacity style={styles.adjBtn} onPress={() => adjustFisik(item.SKU, index, item.Fisik, -1)}>
                <Text style={styles.adjText}>-</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.fisikInput}
                keyboardType="number-pad"
                value={localFisik}
                placeholder="0"
                placeholderTextColor="#9AA0A6"
                selectTextOnFocus
                onChangeText={(v) => {
                  setLocalFisik(v);
                  draftFisikRef.current.set(item.SKU, v);
                }}
                onEndEditing={() => commitFisik(item.SKU, index, localFisik, { keepDraft: false })}
                onBlur={() => commitFisik(item.SKU, index, localFisik, { keepDraft: false })}
                returnKeyType="done"
              />

              <TouchableOpacity style={styles.adjBtn} onPress={() => adjustFisik(item.SKU, index, item.Fisik, +1)}>
                <Text style={styles.adjText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[styles.qtyInline, { color: qty < 0 ? DANGER : qty > 0 ? SUCCESS : MUTED }]}>
          Qty Koreksi: <Text style={{ fontWeight: "900" }}>{qty}</Text>
        </Text>
      </View>
    );
  });

  const renderItem = useCallback(({ item, index }: { item: DetailItem; index: number }) => <Row item={item} index={index} />, []);

  const typeLabel = (t: TypeKorLookup) => `${t.nama}`;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={[styles.appBarBtn, (saving || loading) && { opacity: 0.6 }]}
          onPress={() => navigation.goBack()}
          disabled={saving || loading}
        >
          <Text style={styles.appBarBtnText}>Batal</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.saveBtn, (saving || loading) && { opacity: 0.6 }]}
          onPress={saveData}
          disabled={saving || loading}
        >
          <Text style={styles.saveBtnText}>{saving ? "Menyimpan..." : "Simpan"}</Text>
        </TouchableOpacity>
      </View>

      {/* Header Form */}
      {!headerCollapsed && (
        <View style={styles.headerCard}>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tanggal</Text>
              <TextInput style={styles.input} value={header.Tanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#9AA0A6" editable={false} />
            </View>

            <View style={{ width: 10 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gudang</Text>
              <TouchableOpacity onPress={() => setOpenGudang(true)} activeOpacity={0.85}>
                <View pointerEvents="none">
                  <TextInput style={styles.input} value={header.GudangKode} placeholder="Pilih Gudang" placeholderTextColor="#9AA0A6" editable={false} />
                </View>
              </TouchableOpacity>

              <Text style={{ color: MUTED, fontWeight: "700", marginTop: 6, fontSize: 12 }}>{header.GudangNama}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Tipe Koreksi</Text>
            <TouchableOpacity onPress={() => setOpenType(true)} activeOpacity={0.85}>
              <View pointerEvents="none">
                <TextInput style={styles.input} value={typeKorName} placeholder="Pilih Tipe Koreksi" placeholderTextColor="#9AA0A6" editable={false} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={[styles.input, { textAlign: "left" }]}
              value={header.Keterangan}
              placeholder="(opsional)"
              placeholderTextColor="#9AA0A6"
              onChangeText={(v) => setHeader((p) => ({ ...p, Keterangan: v }))}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, (saving || loading) && { opacity: 0.6 }]} onPress={loadAllStockFromGudang} disabled={saving || loading}>
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryBtnText}>Mengambil stok...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Ambil Semua Stok Gudang</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { width: 120 }]} onPress={addRow} disabled={saving || loading}>
              <Text style={styles.secondaryBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          {loadingLookup && (
            <Text style={{ marginTop: 10, color: MUTED, fontWeight: "700", fontSize: 12 }}>
              Memuat lookup gudang...
            </Text>
          )}
        </View>
      )}

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari Nama Barang"
            placeholderTextColor="#9AA0A6"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.headerToggle} onPress={() => setHeaderCollapsed((prev: boolean) => !prev)}>
          <Text style={styles.headerToggleText}>{headerCollapsed ? "Tampilkan Filter ▼" : "Sembunyikan Filter ▲"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredDetails}
        keyExtractor={(item, idx) => `${item.SKU || "row"}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 90 }}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 24, color: MUTED }}>{loading ? "Memuat..." : "Tekan Ambil Semua Stok Gudang"}</Text>}
      />

      {/* Bottom dock */}
      <View style={styles.bottomDock}>
        <Text style={styles.bottomLabel}>Total Nilai</Text>
        <Text style={styles.bottomTotal}>{fixNegZero(num(totalNilai)).toLocaleString()}</Text>
      </View>

      {/* MODALS */}
      <SelectModal<GudangLookup>
        visible={openGudang}
        title="Pilih Gudang"
        items={listGudang}
        getKey={(it) => it.Kode}
        getLabel={(it) => `${it.Kode} — ${it.Nama}`}
        onSelect={(g) => setHeader((p) => ({ ...p, GudangKode: g.Kode, GudangNama: g.Nama }))}
        onClose={() => setOpenGudang(false)}
      />

      <SelectModal<TypeKorLookup>
        visible={openType}
        title="Pilih Tipe Koreksi"
        items={LIST_TYPE_KOR}
        getKey={(it) => String(it.kode)}
        getLabel={typeLabel}
        onSelect={(t) => setHeader((p) => ({ ...p, TypeKor: Number(t.kode) }))}
        onClose={() => setOpenType(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  appBar: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === "ios" ? 44 : 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  appBarBtn: {
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  appBarBtnText: {
    color: "white",
    fontWeight: "900",
  },
  saveBtn: {
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: INDIGO,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "white",
    fontWeight: "900",
  },

  headerCard: { margin: 12, backgroundColor: CARD, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BORDER },
  formRow: { flexDirection: "row", gap: 10 },
  label: { fontWeight: "800", color: "#111827", marginTop: 6, marginBottom: 6, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: "800",
    textAlign: "center",
  },
  inputMini: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: "900",
  },

  primaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: PRIMARY },
  primaryBtnText: { color: "white", fontWeight: "900" },

  secondaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: BORDER },
  secondaryBtnText: { color: PRIMARY, fontWeight: "900" },

  toolbar: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchWrap: { flex: 1, position: "relative" },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    color: "#111827",
    fontWeight: "800",
    backgroundColor: "#fff",
    paddingRight: 26,
  },
  clearBtn: { position: "absolute", right: 10, top: "50%", transform: [{ translateY: -10 }] },
  clearText: { fontSize: 18, fontWeight: "900", color: MUTED },
  headerToggle: { paddingHorizontal: 8, paddingVertical: 8 },
  headerToggleText: { color: PRIMARY, fontWeight: "900" },

  rowCard: { backgroundColor: CARD, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  rowHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  deleteBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  deleteText: { fontSize: 16 },

  skuText: { color: PRIMARY, fontWeight: "900" },
  namaText: { marginTop: 2, fontWeight: "900", color: "#111827" },
  smallMeta: { marginTop: 6, color: MUTED, fontWeight: "800", fontSize: 12 },
  smallStrong: { color: "#111827", fontWeight: "900" },

  gridRow: { flexDirection: "row", gap: 10, marginTop: 12, alignItems: "flex-start" },
  gridCell: { flex: 1 },
  gridLabel: { color: MUTED, fontSize: 12, fontWeight: "900" },
  gridValue: { marginTop: 6, color: "#111827", fontWeight: "900" },

  fisikBox: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  adjBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
  adjText: { fontSize: 18, fontWeight: "900", color: PRIMARY },
  fisikInput: { flex: 1, paddingVertical: 8, textAlign: "center", fontWeight: "900", color: "#111827" },

  qtyInline: { marginTop: 10, fontWeight: "900" },

  bottomDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLabel: { color: MUTED, fontWeight: "900", fontSize: 12 },
  bottomTotal: { color: PRIMARY, fontWeight: "900", fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden", maxHeight: "75%" },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontWeight: "900", color: "#111827" },
  modalClose: { fontSize: 22, fontWeight: "900", color: MUTED },
  modalItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalItemText: { color: "#111827", fontWeight: "800" },
  modalEmpty: { padding: 16, textAlign: "center", color: MUTED, fontWeight: "700" },
});
