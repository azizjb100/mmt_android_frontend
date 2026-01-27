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

// =====================
// Types
// =====================
type DetailItem = {
  SKU: string;
  NamaBarang: string;
  Satuan: string;
  Panjang: string;
  Lebar: string;
  System: number;
  Fisik: number | null;
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
type TypeKorLookup = { kode: string | number; nama: string };

// =====================
// Const
// =====================
const PRIMARY = "#3F51B5";
const INDIGO = "#1A237E";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const MUTED = "#6B7280";
const SUCCESS = "#16A34A";
const DANGER = "#DC2626";

const LIST_TYPE_KOR: { nama: string; kode: number }[] = [
  { nama: "Terima", kode: 100 },
  { nama: "Keluar", kode: 200 },
  { nama: "Sisa Produksi", kode: 300 },
];

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeText = (s: any) => String(s ?? "").trim().toLowerCase();
const fixNegZero = (n: number) => (Object.is(n, -0) ? 0 : n);

async function getLatestKoreksiDetailMap(params: { tanggalISO: string; gudangNama: string }) {
  const { tanggalISO, gudangNama } = params;

  const d = new Date(tanggalISO);
  const start = new Date(d);
  start.setDate(d.getDate() - 14);
  const end = new Date(d);
  end.setDate(d.getDate() + 14);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  try {
    const res = await api.get("/mmt/koreksi-stok", { params: { startDate, endDate } });
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
    if (!list.length) return new Map<string, { fisik: number }>();

    const gTarget = normalizeText(gudangNama);
    const byGudang = list.filter((x: any) => normalizeText(x?.Gudang) === gTarget);
    const chosen = byGudang[0] || null;

    const map = new Map<string, { fisik: number }>();
    const detailArr = Array.isArray(chosen?.Detail) ? chosen.Detail : [];
    for (const dItem of detailArr) {
      const kode = String(dItem?.Kode ?? "");
      if (!kode) continue;
      map.set(kode, { fisik: num(dItem?.Fisik ?? 0) });
    }
    return map;
  } catch {
    return new Map<string, { fisik: number }>();
  }
}

// =====================
// Simple Select Modal (tanpa lib)
// =====================
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
  const [loadingStok, setLoadingStok] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(false);

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [listGudang, setListGudang] = useState<GudangLookup[]>([]);
  const [listTypeKor, setListTypeKor] = useState<TypeKorLookup[]>([]);
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

  const fetchLookups = useCallback(async () => {
    setLoadingLookup(true);
    try {
      const resGdg = await api.get("/mmt/lookup/gudang");

      const gudangRaw = resGdg?.data?.data ?? [];
      const gudang: GudangLookup[] = (Array.isArray(gudangRaw) ? gudangRaw : [])
        .map((x: any) => ({
          Kode: String(x?.Kode ?? ""),
          Nama: String(x?.Nama ?? ""),
        }))
        .filter((x: GudangLookup) => x.Kode && x.Nama);

      setListGudang(gudang);

      setListTypeKor(LIST_TYPE_KOR.map((x) => ({ kode: x.kode, nama: x.nama })));

      if (header.GudangKode) {
        const found = gudang.find((g) => g.Kode === header.GudangKode);
        if (found) setHeader((p) => ({ ...p, GudangNama: found.Nama }));
      }
    } catch (err: any) {
      console.log("Lookup gudang gagal:", err?.response?.data || err?.message || err);
      Alert.alert("Error", String(err?.response?.data?.message || err?.message || "Gagal load lookup gudang"));
    } finally {
      setLoadingLookup(false);
    }
  }, [header.GudangKode]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

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

  const commitFisik = useCallback(
    (sku: string, indexHint: number, valueStr: string, opts?: { keepDraft?: boolean }) => {
      const trimmed = String(valueStr ?? "").trim();
      const valOrNull = trimmed === "" ? null : num(trimmed);

      setDetails((prev) => {
        const copy = [...prev];
        const realIndex = copy[indexHint]?.SKU === sku ? indexHint : copy.findIndex((x) => x.SKU === sku);
        if (realIndex < 0) return prev;

        const item = copy[realIndex];
        const system = num(item.System);
        const harga = num(item.Harga);

        const fisik = valOrNull;
        const qty = fisik === null ? 0 - system : num(fisik) - system;
        const nilai = qty * harga;

        copy[realIndex] = {
          ...item,
          Fisik: fisik,
          Qty: fixNegZero(qty),
          Nilai: fixNegZero(nilai),
        };
        return copy;
      });

      if (!opts?.keepDraft) draftFisikRef.current.delete(sku);
    },
    []
  );

  const adjustFisik = useCallback(
    (sku: string, indexHint: number, currentFisik: number | null, delta: number) => {
      const map = draftFisikRef.current;
      const base = map.has(sku) ? num(map.get(sku)) : currentFisik === null ? 0 : num(currentFisik);
      const next = String(base + delta);
      map.set(sku, next);
      commitFisik(sku, indexHint, next, { keepDraft: true });
    },
    [commitFisik]
  );

  const loadAllStockFromGudang = async () => {
    if (!header.GudangKode) return Alert.alert("Validasi", "Pilih gudang terlebih dahulu");

    setLoadingStok(true);
    try {
      const koreksiMap = await getLatestKoreksiDetailMap({
        tanggalISO: header.Tanggal,
        gudangNama: header.GudangNama,
      });

      const res = await api.get("/mmt/koreksi-stok/stok", {
        params: { gudangKode: header.GudangKode, tanggal: header.Tanggal },
      });

      const dataStok = res?.data?.data ?? [];
      if (!Array.isArray(dataStok) || dataStok.length === 0) {
        setDetails([]);
        draftFisikRef.current.clear();
        Alert.alert("Info", "Tidak ada data stok ditemukan.");
        return;
      }

      const mapped: DetailItem[] = dataStok.map((item: any) => {
        const sku = String(item?.Kode ?? "");
        const system = num(item?.Stok ?? 0);
        const harga = num(item?.HRGBELI ?? 0);

        const found = koreksiMap.get(sku);
        const fisik = found ? num(found.fisik) : 0;

        const qty = fisik - system;
        const nilai = qty * harga;

        return {
          SKU: sku,
          NamaBarang: String(item?.Nama ?? ""),
          Satuan: String(item?.Satuan ?? ""),
          Panjang: String(item?.Panjang ?? "0"),
          Lebar: String(item?.Lebar ?? "0"),
          System: system,
          Fisik: fisik,
          Qty: fixNegZero(qty),
          Harga: harga,
          Nilai: fixNegZero(nilai),
        };
      });

      draftFisikRef.current.clear();
      setDetails(mapped);
      setHeaderCollapsed(true);
    } catch (e: any) {
      Alert.alert("Gagal", "Gagal memuat stok: " + String(e?.response?.data?.message || e?.message || "Unknown"));
    } finally {
      setLoadingStok(false);
    }
  };

  const saveData = async () => {
    const validDetails = details.filter((d) => d.SKU && d.SKU.trim() !== "");

    if (!header.GudangKode || !header.TypeKor) return Alert.alert("Validasi", "Header harus lengkap!");
    if (validDetails.length === 0) return Alert.alert("Validasi", "Detail barang kosong!");

    const typeName = LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama;
    if (!typeName) return Alert.alert("Validasi", "Tipe koreksi tidak valid!");

    setSaving(true);
    try {
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
  };

  const Row = React.memo(({ item, index }: { item: DetailItem; index: number }) => {
    const [localFisik, setLocalFisik] = useState<string>(() => {
      const draft = draftFisikRef.current.get(item.SKU);
      if (draft !== undefined) return draft;
      return item.Fisik === null ? "" : String(item.Fisik);
    });

    useEffect(() => {
      const draft = draftFisikRef.current.get(item.SKU);
      if (draft !== undefined) setLocalFisik(draft);
      else setLocalFisik(item.Fisik === null ? "" : String(item.Fisik));
    }, [item.SKU, item.Fisik]);

    const qty = item.Qty;
    const p = String(item.Panjang ?? "").trim();
    const l = String(item.Lebar ?? "").trim();
    const ukuranText = `${p ? p : "—"} x ${l ? l : "—"}`;

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.skuText}>{item.SKU}</Text>
            <Text style={styles.namaText} numberOfLines={2}>
              {item.NamaBarang}
            </Text>

            <Text style={styles.smallMeta}>
              Satuan: <Text style={styles.smallStrong}>{item.Satuan}</Text>
              {"  "}•{"  "}
              Ukuran p x l: <Text style={styles.sizeStrong}>{ukuranText}</Text>
            </Text>
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

  const typeKorName = useMemo(() => {
    return LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama ?? "";
  }, [header.TypeKor]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header atas */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarBtn} onPress={() => navigation.goBack()} disabled={saving || loadingStok}>
          <Text style={styles.appBarBtnText}>Batal</Text>
        </TouchableOpacity>

        <Text style={styles.appBarTitle}>Input Koreksi Stok</Text>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || loadingStok) && { opacity: 0.6 }]}
          onPress={saveData}
          disabled={saving || loadingStok}
        >
          <Text style={styles.saveBtnText}>{saving ? "..." : "Simpan"}</Text>
        </TouchableOpacity>
      </View>

      {/* Header form tampil di awal */}
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
              <TextInput
                style={styles.input}
                value={typeKorName}
                placeholder="Pilih Tipe Koreksi"
                placeholderTextColor="#9AA0A6"
                editable={false}
              />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, (saving || loadingStok) && { opacity: 0.6 }]} onPress={loadAllStockFromGudang} disabled={saving || loadingStok}>
            {loadingStok ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryBtnText}>Mengambil stok...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Ambil Semua Stok Gudang</Text>
            )}
          </TouchableOpacity>

          {loadingLookup && (
            <Text style={{ marginTop: 10, color: MUTED, fontWeight: "700", fontSize: 12 }}>Memuat lookup gudang & tipe...</Text>
          )}
        </View>
      )}

      {/* Toolbar Search */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari SKU / Nama Barang"
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
          <Text style={styles.headerToggleText}>{headerCollapsed ? "Tampilkan Filter ▲" : "Sembunyikan Filter ▼"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredDetails}
        keyExtractor={(item, idx) => `${item.SKU}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 90 }}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 24, color: MUTED }}>{loadingStok ? "Memuat..." : "Data kosong. Ambil semua stok dari gudang."}</Text>
        }
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
        onSelect={(g) => {
          setHeader((p) => ({
            ...p,
            GudangKode: g.Kode,
            GudangNama: g.Nama,
          }));
        }}
        onClose={() => setOpenGudang(false)}
      />

      <SelectModal<TypeKorLookup>
        visible={openType}
        title="Pilih Tipe Koreksi"
        items={listTypeKor}
        getKey={(it, idx) => String(it.kode ?? idx)}
        getLabel={typeLabel}
        onSelect={(t) => setHeader((p) => ({ ...p, TypeKor: Number(t.kode) }))}
        onClose={() => setOpenType(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // AppBar minimal
  appBar: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === "ios" ? 44 : 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  appBarTitle: {
    flex: 1,
    textAlign: "center",
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },
  appBarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  appBarBtnText: { color: "white", fontWeight: "900" },

  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: INDIGO },
  saveBtnText: { color: "white", fontWeight: "900" },

  // Header form
  headerCard: {
    margin: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
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
  primaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  primaryBtnText: { color: "white", fontWeight: "900" },

  // Toolbar search
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
  clearBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  clearText: { fontSize: 18, fontWeight: "900", color: MUTED },

  headerToggle: { paddingHorizontal: 8, paddingVertical: 8 },
  headerToggleText: { color: PRIMARY, fontWeight: "900" },

  // Row card
  rowCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },

  skuText: { color: PRIMARY, fontWeight: "900" },
  namaText: { marginTop: 2, fontWeight: "900", color: "#111827" },
  smallMeta: { marginTop: 6, color: MUTED, fontWeight: "800", fontSize: 12 },
  smallStrong: { color: "#111827", fontWeight: "900" },
  sizeStrong: { color: "#111827", fontWeight: "900" },

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
  adjBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  adjText: { fontSize: 18, fontWeight: "900", color: PRIMARY },
  fisikInput: {
    flex: 1,
    paddingVertical: 8,
    textAlign: "center",
    fontWeight: "900",
    color: "#111827",
  },

  qtyInline: { marginTop: 10, fontWeight: "900" },

  // Bottom dock
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

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    maxHeight: "75%",
  },
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
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemText: { color: "#111827", fontWeight: "800" },
  modalEmpty: { padding: 16, textAlign: "center", color: MUTED, fontWeight: "700" },
});
