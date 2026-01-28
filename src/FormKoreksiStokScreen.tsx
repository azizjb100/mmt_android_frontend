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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import QRCode from "react-native-qrcode-svg";

import api from "../src/api/api.services";
import { toast } from "../components/toastComponent";
import ConfirmDialog from "../components/confirmComponent";

type DetailItem = {
  __id: string;
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

// Bentuk item stok dari endpoint /mmt/koreksi-stok/stok (yang kamu pakai di loadAllStock)
type StockApiItem = {
  Kode?: string;
  Nama?: string;
  Satuan?: string;
  Panjang?: number | string;
  Lebar?: number | string;
  Stok?: number | string;
  HRGBELI?: number | string;
};

const PRIMARY = "#3F51B5";
const INDIGO = "#1A237E";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const BORDER = "#E5E7EB";
const MUTED = "#6B7280";
const SUCCESS = "#16A34A";
const DANGER = "#DC2626";

const makeId = () => `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

/**
 * Modal Search Stok Gudang:
 * - query ke /mmt/koreksi-stok/stok
 * - params: gudangKode, tanggal, q
 * - user pilih item -> dikembalikan lewat onPick
 */
function StockSearchModal(props: {
  visible: boolean;
  gudangKode: string;
  tanggal: string;
  initialQuery?: string;
  onClose: () => void;
  onPick: (item: StockApiItem) => void;
}) {
  const { visible, gudangKode, tanggal, initialQuery, onClose, onPick } = props;
  const [q, setQ] = useState(initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StockApiItem[]>([]);

  useEffect(() => {
    if (!visible) return;
    setQ(initialQuery ?? "");
  }, [visible, initialQuery]);

  const fetchStock = useCallback(async () => {
    if (!gudangKode) {
      toast.warn("Validasi", "Pilih gudang terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/mmt/koreksi-stok/stok", {
        params: { gudangKode, tanggal, q: (q || "").trim() },
      });
      const raw = pickArray(res?.data) as StockApiItem[];
      setItems(raw || []);
    } catch (e: any) {
      toast.error("Gagal", String(e?.response?.data?.message || e?.message || "Gagal mencari stok"));
    } finally {
      setLoading(false);
    }
  }, [gudangKode, tanggal, q]);

  useEffect(() => {
    if (!visible) return;
    fetchStock();
  }, [visible]);

  const labelSku = (x: StockApiItem) => String(x?.Kode ?? "").trim();
  const labelNama = (x: StockApiItem) => String(x?.Nama ?? "").trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cari Stok ...</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
            <TextInput
              style={styles.searchInput}
              value={q}
              onChangeText={setQ}
              placeholder="Cari SKU / Nama..."
              placeholderTextColor="#9AA0A6"
              returnKeyType="search"
              onSubmitEditing={fetchStock}
            />
            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={fetchStock} disabled={loading}>
              {loading ? <ActivityIndicator /> : <Text style={styles.secondaryBtnText}>Cari</Text>}
            </TouchableOpacity>

            <Text style={{ marginTop: 10, color: MUTED, fontWeight: "800", fontSize: 12 }}>
              Gudang: <Text style={{ color: "#111827" }}>{gudangKode || "-"}</Text> • Tanggal:{" "}
              <Text style={{ color: "#111827" }}>{tanggal || "-"}</Text>
            </Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(it, idx) => `${String(it?.Kode ?? "item")}-${idx}`}
            renderItem={({ item }) => {
              const kode = labelSku(item);
              const nama = labelNama(item);
              const stok = num(item?.Stok);
              return (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                >
                  <Text style={styles.modalItemText}>{kode || "—"}</Text>
                  <Text style={{ color: MUTED, fontWeight: "700", marginTop: 4 }} numberOfLines={2}>
                    {nama || "—"}
                  </Text>
                  <Text style={{ marginTop: 6, color: "#111827", fontWeight: "900", fontSize: 12 }}>
                    Stok: {stok}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>
                {loading ? "Memuat..." : "Tidak ada data. Coba ganti kata kunci."}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default function FormKoreksiStokScreen({ navigation }: any) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(false);

  const LIST_TYPE_KOR: TypeKorLookup[] = useMemo(
    () => [
      { nama: "Terima", kode: 100, },
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
  const [searchKey, setSearchKey] = useState(""); // keyword search stok gudang (bukan filter lokal)
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [currentDetailIndex, setCurrentDetailIndex] = useState<number | null>(null);

  const [barcodeOpen, setBarcodeOpen] = useState(false);

  // draft input per rowId
  const draftFisikRef = useRef<Map<string, string>>(new Map());
  const draftPanjangRef = useRef<Map<string, string>>(new Map());
  const draftLebarRef = useRef<Map<string, string>>(new Map());

  // --- delete confirm ---
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; sku: string; nama: string } | null>(null);

  const openDeleteConfirm = (item: DetailItem) => {
    setPendingDelete({ id: item.__id, sku: item.SKU, nama: item.NamaBarang });
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  const addRow = useCallback(() => {
    const id = makeId();
    setDetails((prev) => [
      ...prev,
      {
        __id: id,
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

  // Vue: if (!isEdit) addRow() onMounted
  useEffect(() => {
    if (!details.length) addRow();
  }, []);

  const removeRowById = useCallback((id: string) => {
    setDetails((prev) => {
      const idx = prev.findIndex((x) => x.__id === id);
      if (idx < 0) return prev;

      const copy = [...prev];
      const removed = copy[idx];
      copy.splice(idx, 1);

      if (removed) {
        draftFisikRef.current.delete(removed.__id);
        draftPanjangRef.current.delete(removed.__id);
        draftLebarRef.current.delete(removed.__id);
      }

      if (!copy.length) {
        const nid = makeId();
        return [
          {
            __id: nid,
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
      }

      return copy;
    });
  }, []);

  const calculateRowByIndex = useCallback(
    (index: number, patch?: Partial<Pick<DetailItem, "Fisik" | "System" | "Harga">>) => {
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
    },
    []
  );

  const commitUkuran = useCallback(
    (rowId: string, indexHint: number, field: "Panjang" | "Lebar", valueStr: string, opts?: { keepDraft?: boolean }) => {
      const trimmed = String(valueStr ?? "").trim();
      const val = trimmed === "" ? 0 : num(trimmed);

      setDetails((prev) => {
        const copy = [...prev];
        const realIndex = copy[indexHint]?.__id === rowId ? indexHint : copy.findIndex((x) => x.__id === rowId);
        const idx = realIndex >= 0 ? realIndex : indexHint;
        const item = copy[idx];
        if (!item) return prev;

        copy[idx] = { ...item, [field]: val } as DetailItem;
        return copy;
      });

      if (!opts?.keepDraft) {
        if (field === "Panjang") draftPanjangRef.current.delete(rowId);
        if (field === "Lebar") draftLebarRef.current.delete(rowId);
      }
    },
    []
  );

  const commitFisik = useCallback(
    (rowId: string, indexHint: number, valueStr: string, opts?: { keepDraft?: boolean }) => {
      const trimmed = String(valueStr ?? "").trim();
      const val = trimmed === "" ? 0 : num(trimmed);

      const realIndex = (() => {
        const direct = details[indexHint];
        if (direct?.__id === rowId) return indexHint;
        const idx = details.findIndex((x) => x.__id === rowId);
        return idx >= 0 ? idx : indexHint;
      })();

      calculateRowByIndex(realIndex, { Fisik: val });

      if (!opts?.keepDraft) draftFisikRef.current.delete(rowId);
    },
    [details, calculateRowByIndex]
  );

  const adjustFisik = useCallback(
    (rowId: string, indexHint: number, currentFisik: number, delta: number) => {
      const map = draftFisikRef.current;
      const base = map.has(rowId) ? num(map.get(rowId)) : num(currentFisik);
      const next = String(base + delta);
      map.set(rowId, next);
      commitFisik(rowId, indexHint, next, { keepDraft: true });
    },
    [commitFisik]
  );

  // --- lookup gudang ---
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
      toast.error("Error", String(err?.response?.data?.message || err?.message || "Gagal load lookup gudang"));
    } finally {
      setLoadingLookup(false);
    }
  }, [header.GudangKode]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const typeKorName = useMemo(
    () => LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama ?? "",
    [LIST_TYPE_KOR, header.TypeKor]
  );

  // --- PENERAPAN ITEM STOK KE ROW (inti pengganti MasterBahanModal + loadAllStock wajib) ---
  const applyStockToRow = useCallback(
    (index: number, stock: StockApiItem) => {
      setDetails((prev) => {
        const copy = [...prev];
        const row = copy[index];
        if (!row) return prev;

        const skuBaru = String(stock?.Kode ?? "").trim();
        if (!skuBaru) {
          toast.warn("Validasi", "SKU kosong dari hasil pencarian.");
          return prev;
        }

        const isDuplicate = copy.some((d, i) => String(d.SKU || "").trim() === skuBaru && i !== index);
        if (isDuplicate) {
          toast.warn("Duplikat", `Bahan ${skuBaru} sudah ada di daftar.`);
          return prev;
        }

        const system = num(stock?.Stok);
        const harga = num(stock?.HRGBELI);

        const next: DetailItem = {
          ...row,
          SKU: skuBaru,
          NamaBarang: String(stock?.Nama ?? ""),
          Satuan: String(stock?.Satuan ?? ""),
          Panjang: num(stock?.Panjang),
          Lebar: num(stock?.Lebar),
          System: system,
          Harga: harga,
          Fisik: 0,
          Qty: fixNegZero(0 - system),
          Nilai: fixNegZero((0 - system) * harga),
        };

        copy[index] = next;

        if (index === copy.length - 1) {
          copy.push({
            __id: makeId(),
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
          });
        }

        return copy;
      });
    },
    []
  );

  const ensureEditableIndex = useCallback((): number => {
    let idx = details.findIndex((d) => !String(d.SKU || "").trim());
    if (idx >= 0) return idx;

    const newId = makeId();
    setDetails((prev) => [
      ...prev,
      {
        __id: newId,
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

    return details.length;
  }, [details]);

  const openStockSearch = useCallback(
    (index?: number) => {
      if (!header.GudangKode) {
        toast.warn("Validasi", "Pilih gudang terlebih dahulu");
        return;
      }
      const idx = typeof index === "number" ? index : ensureEditableIndex();
      setCurrentDetailIndex(idx);
      setStockModalOpen(true);
    },
    [header.GudangKode, ensureEditableIndex]
  );

  const onPickStock = useCallback(
    (stock: StockApiItem) => {
      const idx = currentDetailIndex ?? ensureEditableIndex();
      applyStockToRow(idx, stock);
      setCurrentDetailIndex(null);
    },
    [currentDetailIndex, ensureEditableIndex, applyStockToRow]
  );

  const loadAllStockFromGudang = useCallback(async () => {
    if (!header.GudangKode) return toast.warn("Validasi", "Pilih gudang terlebih dahulu");
    setLoading(true);
    try {
      const res = await api.get("/mmt/koreksi-stok/stok", {
        params: { gudangKode: header.GudangKode, tanggal: header.Tanggal },
      });

      const dataStok = pickArray(res?.data);
      if (!dataStok.length) {
        toast.warn("Info", "Tidak ada data stok ditemukan");
        return;
      }

      const mapped: DetailItem[] = dataStok.map((item: any) => {
        const system = num(item?.Stok ?? 0);
        const harga = num(item?.HRGBELI ?? 0);
        const qty = 0 - system;
        const nilai = qty * harga;

        return {
          __id: String(item?.Kode ?? makeId()),
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

      // sisipkan satu baris kosong di akhir untuk input manual
      mapped.push({
        __id: makeId(),
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
      });

      setDetails(mapped);
      setHeaderCollapsed(true);
      toast.success("Sukses", "Stok gudang dimuat");
    } catch (e: any) {
      toast.error("Gagal", "Gagal memuat stok: " + String(e?.response?.data?.message || e?.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  }, [header.GudangKode, header.Tanggal]);

  const totalNilai = useMemo(() => details.reduce((a, b) => a + (b.Nilai || 0), 0), [details]);

  const itemsToRender = useMemo(() => {
    const valid = details.filter((d) => String(d.SKU || "").trim());
    return valid.map((d) => ({
      id: d.__id,
      namaBahan: d.NamaBarang,
      qrValue: d.SKU,
      panjang: d.Panjang,
      lebar: d.Lebar,
    }));
  }, [details]);

  const saveData = useCallback(async () => {
    const validDetails = details.filter((d) => d.SKU && d.SKU.trim() !== "");
    if (!header.GudangKode || !header.TypeKor) return toast.warn("Validasi", "Header harus lengkap!");
    if (validDetails.length === 0) return toast.warn("Validasi", "Detail barang kosong!");

    setSaving(true);
    try {
      const typeName = LIST_TYPE_KOR.find((t) => t.kode === header.TypeKor)?.nama;

      const payload = {
        header: {
          ...header,
          TypeName: typeName,
        },
        details: validDetails.map(({ __id, ...rest }) => rest),
      };

      await api.post("/mmt/koreksi-stok", payload);
      toast.success("Sukses", "Simpan Berhasil");
      navigation.goBack();
    } catch (e: any) {
      toast.error("Gagal", "Gagal Simpan: " + String(e?.response?.data?.message || e?.message || "Unknown"));
    } finally {
      setSaving(false);
    }
  }, [details, header, LIST_TYPE_KOR, navigation]);

  const Row = React.memo(
    ({ item, index }: { item: DetailItem; index: number }) => {
      const [localFisik, setLocalFisik] = useState<string>(() => draftFisikRef.current.get(item.__id) ?? String(item.Fisik ?? 0));
      const [localPanjang, setLocalPanjang] = useState<string>(() => draftPanjangRef.current.get(item.__id) ?? String(item.Panjang ?? 0));
      const [localLebar, setLocalLebar] = useState<string>(() => draftLebarRef.current.get(item.__id) ?? String(item.Lebar ?? 0));

      useEffect(() => {
        setLocalFisik(draftFisikRef.current.get(item.__id) ?? String(item.Fisik ?? 0));
        setLocalPanjang(draftPanjangRef.current.get(item.__id) ?? String(item.Panjang ?? 0));
        setLocalLebar(draftLebarRef.current.get(item.__id) ?? String(item.Lebar ?? 0));
      }, [item.__id, item.Fisik, item.Panjang, item.Lebar]);

      const qty = item.Qty;

      return (
        <View style={styles.rowCard}>
          <View style={styles.rowHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skuText}>{item.SKU || "— (Pilih Item)"}</Text>
              <Text style={styles.namaText} numberOfLines={2}>
                {item.NamaBarang || "Nama Barang"}
              </Text>

              <Text style={styles.smallMeta}>
                Satuan: <Text style={styles.smallStrong}>{item.Satuan || "—"}</Text>
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { flex: 1, paddingVertical: 10 }]}
                  onPress={() => openStockSearch(index)}
                  disabled={saving || loading}
                >
                  <Text style={styles.secondaryBtnText}>{item.SKU ? "Ganti Item" : "Pilih Item"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => openDeleteConfirm(item)} style={styles.deleteBtn}>
              <MaterialIcons name="restore-from-trash" size={22} color={DANGER} />
            </TouchableOpacity>
          </View>

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
                  draftPanjangRef.current.set(item.__id, v);
                }}
                onEndEditing={() => commitUkuran(item.__id, index, "Panjang", localPanjang, { keepDraft: false })}
                onBlur={() => commitUkuran(item.__id, index, "Panjang", localPanjang, { keepDraft: false })}
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
                  draftLebarRef.current.set(item.__id, v);
                }}
                onEndEditing={() => commitUkuran(item.__id, index, "Lebar", localLebar, { keepDraft: false })}
                onBlur={() => commitUkuran(item.__id, index, "Lebar", localLebar, { keepDraft: false })}
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
                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustFisik(item.__id, index, item.Fisik, -1)}>
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
                    draftFisikRef.current.set(item.__id, v);
                  }}
                  onEndEditing={() => commitFisik(item.__id, index, localFisik, { keepDraft: false })}
                  onBlur={() => commitFisik(item.__id, index, localFisik, { keepDraft: false })}
                  returnKeyType="done"
                />

                <TouchableOpacity style={styles.adjBtn} onPress={() => adjustFisik(item.__id, index, item.Fisik, +1)}>
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
    }
  );

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
          style={[styles.appBarBtn, { marginRight: 10 }, (saving || loading) && { opacity: 0.6 }]}
          onPress={() => {
            if (!itemsToRender.length) return toast.warn("Validasi", "Pilih item terlebih dahulu");
            setBarcodeOpen(true);
          }}
          disabled={saving || loading}
        >
          <Text style={styles.appBarBtnText}>Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, (saving || loading) && { opacity: 0.6 }]} onPress={saveData} disabled={saving || loading}>
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

          {/* Tombol bulk opsional */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1 }, (saving || loading) && { opacity: 0.6 }]}
              onPress={loadAllStockFromGudang}
              disabled={saving || loading}
            >
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator />
                  <Text style={styles.secondaryBtnText}>Memuat...</Text>
                </View>
              ) : (
                <Text style={styles.secondaryBtnText}>Ambil Semua Stok</Text>
              )}
            </TouchableOpacity>
{/*
            <TouchableOpacity style={[styles.secondaryBtn, { width: 120 }]} onPress={addRow} disabled={saving || loading}>
              <Text style={styles.secondaryBtnText}>Tambah</Text>
            </TouchableOpacity> */}
          </View>

          {loadingLookup && (
            <Text style={{ marginTop: 10, color: MUTED, fontWeight: "700", fontSize: 12 }}>
              Memuat lookup gudang...
            </Text>
          )}
        </View>
      )}

      {/* Toolbar SEARCH STOCK (baru) */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={searchKey}
            onChangeText={setSearchKey}
            placeholder="Cari stok ..."
            placeholderTextColor="#9AA0A6"
            returnKeyType="search"
            onSubmitEditing={() => openStockSearch()}
          />
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => openStockSearch()}
          disabled={saving || loading}
        >
          <MaterialIcons name="search" size={20} color={PRIMARY} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerToggle} onPress={() => setHeaderCollapsed((prev: boolean) => !prev)}>
          <Text style={styles.headerToggleText}>{headerCollapsed ? "Filter ▼" : "Filter ▲"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={details}
        keyExtractor={(item) => item.__id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 90 }}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
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

      <StockSearchModal
        visible={stockModalOpen}
        gudangKode={header.GudangKode}
        tanggal={header.Tanggal}
        initialQuery={searchKey}
        onClose={() => setStockModalOpen(false)}
        onPick={onPickStock}
      />

      <ConfirmDialog
        visible={confirmOpen}
        variant="danger"
        title="Hapus Item"
        message="Yakin ingin menghapus item ini?"
        detail={`${pendingDelete?.sku || "—"}\n${pendingDelete?.nama || ""}`}
        cancelText="Batal"
        confirmText="Hapus"
        loading={confirmLoading}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          const id = String(pendingDelete?.id ?? "").trim();
          if (!id) {
            toast?.warn?.("Tidak bisa hapus", "ID item kosong.");
            closeDeleteConfirm();
            return;
          }

          setConfirmLoading(true);
          try {
            removeRowById(id);
            toast?.success?.("Berhasil", "Item berhasil dihapus");
            closeDeleteConfirm();
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      {/* Barcode Preview (Fullscreen) */}
      <Modal visible={barcodeOpen} animationType="slide" onRequestClose={() => setBarcodeOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#111827" }}>
          <View style={[styles.appBar, { backgroundColor: PRIMARY }]}>
            <TouchableOpacity style={styles.appBarBtn} onPress={() => setBarcodeOpen(false)}>
              <Text style={styles.appBarBtnText}>Tutup</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>

          <FlatList
            data={itemsToRender}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                  <View style={{ width: 90, height: 90, alignItems: "center", justifyContent: "center" }}>
                    <QRCode value={String(item.qrValue)} size={85} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: "#111827" }}>{item.qrValue}</Text>
                    <Text style={{ color: MUTED, fontWeight: "700", marginTop: 4 }}>
                      Ukuran: {item.panjang}m x {item.lebar}m
                    </Text>
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", marginVertical: 10 }} />
                <Text style={{ textAlign: "center", fontWeight: "900", color: "#111827" }}>
                  {String(item.namaBahan || "").toUpperCase()}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 24, color: "#E5E7EB" }}>Tidak ada item untuk barcode</Text>}
          />
        </View>
      </Modal>
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

  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
  },
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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerToggle: { paddingHorizontal: 8, paddingVertical: 8 },
  headerToggleText: { color: PRIMARY, fontWeight: "900" },

  rowCard: { backgroundColor: CARD, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  rowHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  deleteBtn: { paddingHorizontal: 6, paddingVertical: 2 },

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
