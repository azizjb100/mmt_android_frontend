/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
} from "react-native";
import DatePicker from "react-native-date-picker";
import api from "../src/api/api.services";
import { toast } from "../components/toastComponent";
import ConfirmDialog from "../components/confirmComponent";

type DetailKoreksi = {
  Nomor: string;
  Kode: string;
  Nama_Bahan: string;
  Panjang: number;
  Lebar: number;
  Satuan: string;
  Stock: number;
  Fisik: number;
  Koreksi: number;
  List_Barcode?: string | null;
};

type KoreksiStok = {
  Nomor: string;
  Tanggal: string;
  Gudang: string;
  Tipe: number;
  Nama: string | null;
  Keterangan: string;
  Detail: DetailKoreksi[];
};

const API_KOREKSI_STOK = "/mmt/koreksi-stok";

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const fromISODate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const minusDaysISO = (baseISO: string, days: number) => {
  const d = fromISODate(baseISO);
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

const pickArray = (payload: any): any[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const typeName = (tipe?: number) => {
  if (tipe === 100) return "Terima";
  if (tipe === 200) return "Keluar";
  if (tipe === 300) return "Sisa Produksi";
  return String(tipe ?? "-");
};

export default function KoreksiStokView({ navigation }: any) {
  const [masterData, setMasterData] = useState<KoreksiStok[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  });
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));

  const [openPicker, setOpenPicker] = useState<null | "start" | "end">(null);

  const [selectedNomor, setSelectedNomor] = useState<string | null>(null);
  const [expandedNomor, setExpandedNomor] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const selectedItem = useMemo(
    () => masterData.find((x) => x.Nomor === selectedNomor) || null,
    [masterData, selectedNomor]
  );

  const fetchData = async () => {
    setLoading(true);
    setSelectedNomor(null);
    setExpandedNomor(null);
    try {
      const res = await api.get(API_KOREKSI_STOK, {
        params: { startDate, endDate },
      });

      const rows = pickArray(res?.data);
      setMasterData(rows as KoreksiStok[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Error", "Gagal memuat data koreksi");
      setMasterData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleAdd = () => navigation.navigate("FormKoreksiStok");

  const handlePrintSlip = async () => {
    if (!selectedItem) return;

    const url = `https://103.94.238.252:8003/print/koreksi-stok/${selectedItem.Nomor}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return toast.error("Gagal", "Tidak bisa membuka URL print.");

    Linking.openURL(url);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    setConfirmOpen(true);
  };

  const applyQuickRange = (daysBack: number) => {
    const todayISO = toISODate(new Date());
    setEndDate(todayISO);
    setStartDate(minusDaysISO(todayISO, daysBack));
  };

  const resetDefault = () => applyQuickRange(30);

  const renderRow = ({ item }: { item: KoreksiStok }) => {
    const isSelected = item.Nomor === selectedNomor;
    const isExpanded = item.Nomor === expandedNomor;

    return (
      <View style={[styles.card, isSelected && styles.cardSelected]}>
        <TouchableOpacity
          onPress={() => setSelectedNomor(item.Nomor)}
          onLongPress={() =>
            setExpandedNomor(isExpanded ? null : item.Nomor)
          }
          activeOpacity={0.85}
        >
          <View style={styles.rowTop}>
            <Text style={styles.nomor}>{item.Nomor}</Text>
            <Text style={styles.tanggal}>{item.Tanggal}</Text>
          </View>

          <Text style={styles.meta}>Gudang: {item.Gudang}</Text>
          <Text style={styles.meta}>Tipe: {typeName(item.Tipe)}</Text>

          <Text style={styles.keterangan} numberOfLines={2}>
            Ket: {item.Keterangan || "-"}
          </Text>

          <Text style={styles.expandHint}>
            Tekan lama untuk {isExpanded ? "tutup" : "lihat"} detail
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Rincian Koreksi Barang</Text>

            {(!item.Detail || item.Detail.length === 0) ? (
              <Text style={styles.emptyDetail}>Tidak ada detail.</Text>
            ) : (
              (item.Detail || []).map((d, idx) => (
                <View key={`${d.Kode}-${idx}`} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>
                      {d.Kode} - {d.Nama_Bahan}
                    </Text>

                    <Text style={styles.detailSmall}>
                      Satuan: {d.Satuan} | Sistem: {d.Stock} | Fisik: {d.Fisik}
                    </Text>

                    <Text style={styles.detailSmall}>
                      Ukuran: {Number(d.Panjang || 0)} x {Number(d.Lebar || 0)}{" "}
                      | Barcode: {d.List_Barcode ?? "-"}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.badge,
                      d.Koreksi < 0 ? styles.badgeRed : styles.badgeGreen,
                    ]}
                  >
                    {d.Koreksi}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSuccess, loading && styles.btnDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          <Text style={styles.btnText}>Koreksi Stok</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnInfo,
            (!selectedItem || loading) && styles.btnDisabled,
          ]}
          onPress={handlePrintSlip}
          disabled={!selectedItem || loading}
        >
          <Text style={styles.btnText}>Cetak Slip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnDanger,
            (!selectedItem || loading) && styles.btnDisabled,
          ]}
          onPress={handleDelete}
          disabled={!selectedItem || loading}
        >
          <Text style={styles.btnText}>Hapus</Text>
        </TouchableOpacity>
      </View>

      {/* Filter modern */}
      <View style={styles.filterCard}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterTitle}>Periode</Text>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => applyQuickRange(0)}
              disabled={loading}
            >
              <Text style={styles.quickChipText}>Hari ini</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => applyQuickRange(7)}
              disabled={loading}
            >
              <Text style={styles.quickChipText}>-7H</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => applyQuickRange(30)}
              disabled={loading}
            >
              <Text style={styles.quickChipText}>-30H</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearMini}
              onPress={resetDefault}
              disabled={loading}
              hitSlop={10}
            >
              <Text style={styles.clearMiniText}>↺</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setOpenPicker("start")}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{startDate}</Text>
          </TouchableOpacity>

          <Text style={styles.sep}>s/d</Text>

          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setOpenPicker("end")}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{endDate}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnPrimary,
              loading && styles.btnDisabled,
            ]}
            onPress={fetchData}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "Loading..." : "Refresh"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePicker
        modal
        open={openPicker !== null}
        mode="date"
        date={fromISODate(openPicker === "start" ? startDate : endDate)}
        onConfirm={(d) => {
          const iso = toISODate(d);
          const mode = openPicker;
          setOpenPicker(null);

          if (mode === "start") {
            if (iso > endDate) {
              setStartDate(endDate);
              setEndDate(iso);
            } else {
              setStartDate(iso);
            }
          } else if (mode === "end") {
            if (iso < startDate) {
              setEndDate(startDate);
              setStartDate(iso);
            } else {
              setEndDate(iso);
            }
          }
        }}
        onCancel={() => setOpenPicker(null)}
      />

      <FlatList
        data={masterData}
        keyExtractor={(item) => item.Nomor}
        renderItem={renderRow}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 24 }}>
            {loading ? "Memuat..." : "Data kosong"}
          </Text>
        }
      />

      {/* Confirm dialog (hapus) */}
      <ConfirmDialog
        visible={confirmOpen}
        variant="danger"
        title="Hapus Koreksi Stok"
        message="Yakin ingin menghapus dokumen ini?"
        detail={
          selectedItem
            ? `${selectedItem.Nomor}\n${selectedItem.Gudang}\n${selectedItem.Tanggal}`
            : ""
        }
        cancelText="Batal"
        confirmText="Hapus"
        loading={confirmLoading}
        onCancel={() => {
          if (confirmLoading) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!selectedItem) return;

          setConfirmLoading(true);
          try {
            await api.delete(`${API_KOREKSI_STOK}/${selectedItem.Nomor}`);
            toast.success("Sukses", "Hapus data sukses.");
            setConfirmOpen(false);
            await fetchData();
          } catch (e: any) {
            toast.error(
              "Gagal",
              "Hapus data gagal: " +
                (e?.response?.data?.message || e?.message || "Server Error")
            );
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },

  actions: { flexDirection: "row", gap: 8, padding: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: "white", fontWeight: "700"},
  btnDisabled: { opacity: 0.4 },
  btnPrimary: { backgroundColor: "#3F51B5" },
  btnSuccess: { backgroundColor: "#2E7D32" },
  btnInfo: { backgroundColor: "#0288D1" },
  btnDanger: { backgroundColor: "#C62828" },

  filterCard: {
    backgroundColor: "white",
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterTitle: { fontWeight: "900", color: "#111827" },

  quickRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  quickChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickChipText: { fontWeight: "800", fontSize: 12, color: "#111827" },
  clearMini: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  clearMiniText: { fontWeight: "900", color: "#1A237E" },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  dateField: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  dateValue: {
    marginTop: 2,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  sep: { color: "#9CA3AF", fontWeight: "900" },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardSelected: { borderColor: "#3F51B5", borderWidth: 2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
  nomor: { color: "#3F51B5", fontWeight: "800" },
  tanggal: { fontWeight: "600" },
  meta: { color: "#444", marginTop: 2 },
  keterangan: { color: "#333", marginTop: 6 },
  expandHint: { marginTop: 6, color: "#888", fontSize: 12 },

  detailBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  detailTitle: { fontWeight: "800", marginBottom: 8 },
  emptyDetail: { color: "#6B7280", fontWeight: "700" },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  detailName: { fontWeight: "700" },
  detailSmall: { color: "#666", fontSize: 12, marginTop: 2 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: "white",
    fontWeight: "800",
    overflow: "hidden",
  },
  badgeRed: { backgroundColor: "#D32F2F" },
  badgeGreen: { backgroundColor: "#388E3C" },
});
