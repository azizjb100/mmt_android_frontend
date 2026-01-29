/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../src/api/api.services';
import { toast } from '../components/toastComponent';
import ConfirmDialog from '../components/confirmComponent';

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
  Detail?: DetailKoreksi[];
};

type BarcodeItem = {
  namaBahan: string;
  qrValue: string;
  panjang: number;
  lebar: number;
};

const API = '/mmt/koreksi-stok';

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const formatTanggalDDMMYYYY = (input: string) => {
  const s = String(input || '').trim();
  if (!s) return '-';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}-${m}-${y}`;
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;

  return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
};

const parseToDate = (input: string) => {
  const s = String(input || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
};

const pickArray = (v: any) => {
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.data?.data)) return v.data.data;
  if (Array.isArray(v)) return v;
  return [];
};

const typeLabel = (t: number) =>
  t === 100 ? 'Terima' : t === 200 ? 'Keluar' : t === 300 ? 'Sisa Produksi' : String(t ?? '-');

export default function KoreksiStokViewScreen({ navigation }: any) {
  const [data, setData] = useState<KoreksiStok[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(() => toISO(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(() => toISO(new Date()));

  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [pickerTemp, setPickerTemp] = useState<Date>(new Date());

  const openDatePicker = (mode: 'start' | 'end') => {
    setPicker(mode);
    setPickerTemp(parseToDate(mode === 'start' ? startDate : endDate));
  };

  const applyPickedDate = () => {
    const iso = toISO(pickerTemp);
    const mode = picker;
    setPicker(null);

    if (mode === 'start') {
      if (iso > endDate) {
        setStartDate(endDate);
        setEndDate(iso);
      } else {
        setStartDate(iso);
      }
    } else if (mode === 'end') {
      if (iso < startDate) {
        setEndDate(startDate);
        setStartDate(iso);
      } else {
        setEndDate(iso);
      }
    }
  };

  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([]);

  const selectedItem = useMemo(() => data.find(x => x.Nomor === selected) || null, [data, selected]);
  const hasSelected = !!selectedItem;

  const fetchData = async () => {
    setLoading(true);
    setSelected(null);
    setExpanded(null);
    try {
      const res = await api.get(API, { params: { startDate, endDate } });
      setData(pickArray(res?.data) as KoreksiStok[]);
    } catch (e) {
      console.log(e);
      toast.error('Gagal', 'Gagal memuat data koreksi');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (nomor: string) => {
    const existing = data.find(x => x.Nomor === nomor);
    if (existing?.Detail?.length) return;

    try {
      const res = await api.get(`${API}/detail/${nomor}`);
      const detail = pickArray(res?.data) as DetailKoreksi[];

      setData(prev =>
        prev.map(row => (row.Nomor === nomor ? { ...row, Detail: detail } : row)),
      );
    } catch (e) {
      console.log(e);
      toast.error('Gagal', 'Gagal memuat detail');
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleAdd = () => navigation.navigate('FormKoreksiStok');

  const handlePrintSlip = async () => {
    if (!selectedItem) return;

    const url = `https://103.94.238.252:8003/print/koreksi-stok/${selectedItem.Nomor}`;
    const can = await Linking.canOpenURL(url);
    if (!can) return toast.error('Gagal', 'Tidak bisa membuka URL print.');

    Linking.openURL(url);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    setConfirmOpen(true);
  };

  const openBarcodePreview = async () => {
    if (!selectedItem) return;

    setBarcodeLoading(true);
    try {
      await loadDetail(selectedItem.Nomor);

      const master = ((): KoreksiStok | undefined => data.find(x => x.Nomor === selectedItem.Nomor))();
      const details = master?.Detail || [];

      if (!details.length) {
        toast.warn('Info', 'Detail tidak ditemukan.');
        return;
      }

      const list: BarcodeItem[] = [];
      for (const d of details) {
        const barcodes = String(d.List_Barcode ?? '')
          .split(',')
          .map(b => b.trim())
          .filter(Boolean);

        for (const val of barcodes) {
          list.push({
            namaBahan: d.Nama_Bahan,
            qrValue: val,
            panjang: Number(d.Panjang || 0),
            lebar: Number(d.Lebar || 0),
          });
        }
      }

      if (!list.length) {
        toast.warn('Info', 'Barcode tidak ditemukan di database.');
        return;
      }

      setBarcodeItems(list);
      setBarcodeOpen(true);
    } catch (e) {
      console.log(e);
      toast.error('Error', 'Gagal menyiapkan barcode');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const renderRow = ({ item }: { item: KoreksiStok }) => {
    const isSelected = item.Nomor === selected;
    const isExpanded = item.Nomor === expanded;

    return (
      <View style={[styles.card, isSelected && styles.cardSelected]}>
        <TouchableOpacity
          onPress={() => setSelected(item.Nomor)}
          onLongPress={async () => {
            const next = isExpanded ? null : item.Nomor;
            setExpanded(next);
            if (next) await loadDetail(next);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.rowTop}>
            <Text style={styles.nomor}>{item.Nomor}</Text>
            <Text style={styles.tanggal}>{formatTanggalDDMMYYYY(item.Tanggal)}</Text>
          </View>

          <Text style={styles.meta}>Gudang: {item.Gudang}</Text>
          <Text style={styles.meta}>Tipe: {typeLabel(item.Tipe)}</Text>

          <Text style={styles.keterangan} numberOfLines={2}>
            Ket: {item.Keterangan || '-'}
          </Text>

          <Text style={styles.expandHint}>
            Tekan dan tahan untuk {isExpanded ? 'tutup' : 'lihat'} detail
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Rincian Barang:</Text>

            {!item.Detail?.length ? (
              <Text style={styles.emptyDetail}>Tidak ada detail / memuat...</Text>
            ) : (
              item.Detail.map((d, idx) => (
                <View key={`${d.Kode}-${idx}`} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>
                      {d.Kode} - {d.Nama_Bahan}
                    </Text>

                    <Text style={styles.detailSmall}>
                      Satuan: {d.Satuan} | Sistem: {d.Stock} | Fisik: {d.Fisik}
                    </Text>

                    <Text style={styles.detailSmall}>
                      Ukuran: {Number(d.Panjang || 0)}m x {Number(d.Lebar || 0)}m
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.badge,
                      d.Koreksi < 0 ? styles.badgeRed : styles.badgeGreen,
                    ]}
                  >
                    {d.Koreksi > 0 ? `+${d.Koreksi}` : d.Koreksi}
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
          style={[
            styles.actionBtn,
            styles.btnSuccess,
            loading && styles.btnDisabled,
          ]}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Tambah</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.btnTeal,
            (!hasSelected || loading || barcodeLoading) && styles.btnDisabled,
          ]}
          onPress={openBarcodePreview}
          disabled={!hasSelected || loading || barcodeLoading}
          activeOpacity={0.85}
        >
          {barcodeLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialIcons name="qr-code-2" size={20} color="#fff" />
          )}
          <Text style={styles.actionBtnText}>Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.btnInfo,
            (!hasSelected || loading) && styles.btnDisabled,
          ]}
          onPress={handlePrintSlip}
          disabled={!hasSelected || loading}
          activeOpacity={0.85}
        >
          <MaterialIcons name="print" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Slip</Text>
        </TouchableOpacity>

        {/* Hapus icon only */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            styles.btnDanger,
            (!hasSelected || loading) && styles.btnDisabled,
          ]}
          onPress={handleDelete}
          disabled={!hasSelected || loading}
          activeOpacity={0.85}
        >
          <MaterialIcons name="delete" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Card */}
      <View style={styles.filterCard}>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => openDatePicker('start')}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{formatTanggalDDMMYYYY(startDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.sep}>s/d</Text>

          <TouchableOpacity
            style={styles.dateField}
            onPress={() => openDatePicker('end')}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{formatTanggalDDMMYYYY(endDate)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.refreshWideBtn, loading && styles.btnDisabled]}
          onPress={fetchData}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.dpBackdrop}>
          <View style={styles.dpCard}>
            <View style={styles.dpHeader}>
              <Text style={styles.dpTitle}>
                {picker === 'start' ? 'Pilih Tanggal Mulai' : 'Pilih Tanggal Akhir'}
              </Text>
              <Text style={styles.dpSubtitle}>
                {formatTanggalDDMMYYYY(toISO(pickerTemp))}
              </Text>
            </View>

            <View style={styles.dpBody}>
              <DatePicker date={pickerTemp} onDateChange={setPickerTemp} mode="date" />
            </View>

            <View style={styles.dpFooter}>
              <TouchableOpacity
                style={[styles.dpBtn, styles.dpBtnGhost]}
                onPress={() => setPicker(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.dpBtnGhostText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dpBtn, styles.dpBtnPrimary]}
                onPress={applyPickedDate}
                activeOpacity={0.85}
              >
                <Text style={styles.dpBtnPrimaryText}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={data}
        keyExtractor={item => item.Nomor}
        renderItem={renderRow}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 24, color: '#6B7280', fontWeight: '700' }}>
            {loading ? 'Memuat...' : 'Data kosong'}
          </Text>
        }
      />

      {/* Barcode Preview Modal */}
      <Modal
        visible={barcodeOpen}
        animationType="slide"
        onRequestClose={() => setBarcodeOpen(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setBarcodeOpen(false)}
              style={styles.modalIconBtn}
              hitSlop={10}
            >
              <MaterialIcons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Preview Barcode ({barcodeItems.length})</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            {barcodeItems.map((it, idx) => (
              <View key={`${it.qrValue}-${idx}`} style={styles.labelBox}>
                <View style={styles.labelTop}>
                  <View style={styles.qrBox}>
                    <QRCode value={it.qrValue} size={85} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.qrValueText}>{it.qrValue}</Text>
                    <Text style={styles.dimText}>
                      Ukuran: {it.panjang}m x {it.lebar}m
                    </Text>
                  </View>
                </View>

                <View style={styles.labelDivider} />
                <Text style={styles.namaBahan} numberOfLines={2}>
                  {it.namaBahan}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        visible={confirmOpen}
        variant="danger"
        title="Hapus Koreksi Stok"
        message="Yakin ingin menghapus dokumen ini?"
        detail={
          selectedItem
            ? `${selectedItem.Nomor}\n${selectedItem.Gudang}\n${formatTanggalDDMMYYYY(selectedItem.Tanggal)}`
            : ''
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
            await api.delete(`${API}/${selectedItem.Nomor}`);
            toast.success('Sukses', 'Hapus data sukses.');
            setConfirmOpen(false);
            await fetchData();
          } catch (e: any) {
            toast.error(
              'Gagal',
              'Hapus data gagal: ' + (e?.response?.data?.message || e?.message || 'Server Error'),
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
  screen: { flex: 1, backgroundColor: '#F5F5F5' },

  actions: { flexDirection: 'row', padding: 12 },
  btnDisabled: { opacity: 0.35 },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  actionBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 8,
  },

  btnSuccess: { backgroundColor: '#16A34A' },
  btnTeal: { backgroundColor: '#0F766E' },
  btnInfo: { backgroundColor: '#0288D1' },
  btnDanger: { backgroundColor: '#C62828' },

  filterCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateField: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateValue: { fontWeight: '900', color: '#111827', textAlign: 'center' },
  sep: { marginHorizontal: 10, color: '#9CA3AF', fontWeight: '900' },

  refreshWideBtn: {
    marginTop: 10,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  refreshText: { color: '#fff', fontWeight: '900', fontSize: 13, marginLeft: 8 },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardSelected: { borderColor: '#3F51B5', borderWidth: 2 },

  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  nomor: { color: '#3F51B5', fontWeight: '900' },
  tanggal: { fontWeight: '800', color: '#111827' },

  meta: { color: '#444', marginTop: 2, fontWeight: '700' },
  keterangan: { color: '#333', marginTop: 6, fontWeight: '700' },
  expandHint: { marginTop: 6, color: '#888', fontSize: 12, fontWeight: '700' },

  detailBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailTitle: { fontWeight: '900', marginBottom: 8, color: '#111827' },
  emptyDetail: { color: '#6B7280', fontWeight: '800' },

  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  detailName: { fontWeight: '900', color: '#111827' },
  detailSmall: { color: '#666', fontSize: 12, marginTop: 2, fontWeight: '700' },

  badge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: 'white',
    fontWeight: '900',
    overflow: 'hidden',
  },
  badgeRed: { backgroundColor: '#D32F2F' },
  badgeGreen: { backgroundColor: '#388E3C' },

  modalScreen: { flex: 1, backgroundColor: '#F5F5F5' },
  modalHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  modalTitle: { fontWeight: '900', color: '#111827' },

  labelBox: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  labelTop: { flexDirection: 'row', alignItems: 'center' },
  qrBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 12,
  },
  qrValueText: { fontWeight: '900', color: '#111827' },
  dimText: { marginTop: 4, color: '#374151', fontWeight: '800', fontSize: 12 },

  labelDivider: { borderTopWidth: 1, borderTopColor: '#111827', borderStyle: 'dashed', marginVertical: 10 },
  namaBahan: { textAlign: 'center', fontWeight: '900', color: '#111827' },

  dpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  dpCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  dpHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dpTitle: { fontWeight: '900', color: '#111827', fontSize: 14 },
  dpSubtitle: { marginTop: 6, fontWeight: '900', color: '#3F51B5', fontSize: 13 },
  dpBody: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  dpFooter: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  dpBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dpBtnGhost: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 10 },
  dpBtnGhostText: { fontWeight: '900', color: '#111827' },
  dpBtnPrimary: { backgroundColor: '#3F51B5' },
  dpBtnPrimaryText: { fontWeight: '900', color: '#fff' },
});
