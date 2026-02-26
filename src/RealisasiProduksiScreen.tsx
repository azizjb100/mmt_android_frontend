/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  SafeAreaView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

import api from '../src/api/api.services';
import { toast } from '../components/toastComponent';
import ConfirmDialog from '../components/confirmComponent';

type GudangLookup = { Kode: string; Nama: string };

type DetailItem = {
  __id: string;
  barcode: string;
  sku: string;
  Nama_Bahan: string;
  qty: number;
  satuan: string;
  Panjang: number;
  Lebar: number;
  keterangan: string;
  operator: string;
  spk: string;
  stok: number;
};

type HeaderForm = {
  nomor: string;
  tanggal: string;
  gudangKode: string;
  gudangNama: string;
  lokasiProduksiKode: string;
  lokasiProduksiNama: string;
  keteranganHeader: string;
};

const PRIMARY = '#3F51B5';
const INDIGO = '#1A237E';
const BG = '#F5F5F5';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';
const DANGER = '#DC2626';

const FRAME_W = 260;
const FRAME_H = 160;
const SCAN_IDLE_MS = 180;

const makeId = () => `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const formatDateDDMMYYYY = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const pickArray = (data: any): any[] => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const createEmptyDetail = (): DetailItem => ({
  __id: makeId(),
  barcode: '',
  sku: '',
  Nama_Bahan: '',
  qty: 0,
  satuan: '',
  Panjang: 0,
  Lebar: 0,
  keterangan: '',
  operator: '',
  spk: '',
  stok: 0,
});

/** Modal Select (mirip Koreksi Stok) */
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
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
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>Data kosong</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default function RealisasiProduksiScreen({ navigation }: any) {
  const [saving, setSaving] = useState(false);
  const hiddenScanInputRef = useRef<TextInput | null>(null);
  const hiddenScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hiddenScanBuffer, setHiddenScanBuffer] = useState('');

  // scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  const focusHiddenScanInput = useCallback(() => {
    setTimeout(() => {
      hiddenScanInputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();

    focusHiddenScanInput();
  }, []);

  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const [header, setHeader] = useState<HeaderForm>({
    nomor: 'AUTO',
    tanggal: formatDateDDMMYYYY(new Date()),
    gudangKode: 'WH-16',
    gudangNama: 'Gudang Bahan MMT',
    lokasiProduksiKode: 'GPM',
    lokasiProduksiNama: 'Gudang Produksi',
    keteranganHeader: '',
  });

  const [details, setDetails] = useState<DetailItem[]>([createEmptyDetail()]);

  // lookup gudang
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [listGudang, setListGudang] = useState<GudangLookup[]>([]);
  const [openGudangAsal, setOpenGudangAsal] = useState(false);
  const [openLokasiProduksi, setOpenLokasiProduksi] = useState(false);

  const fetchLookups = useCallback(async () => {
    setLoadingLookup(true);
    try {
      const res = await api.get('/mmt/lookup/gudang', {
        params: { _ts: Date.now() },
      });
      const raw = pickArray(res?.data);

      const gudang: GudangLookup[] = raw
        .map((x: any) => ({
          Kode: String(x?.Kode ?? '').trim(),
          Nama: String(x?.Nama ?? '').trim(),
        }))
        .filter((x: GudangLookup) => x.Kode && x.Nama);

      setListGudang(gudang);

      if (header.gudangKode) {
        const g = gudang.find(it => it.Kode === header.gudangKode);
        if (g) setHeader(p => ({ ...p, gudangNama: g.Nama }));
      }
      if (header.lokasiProduksiKode) {
        const g = gudang.find(it => it.Kode === header.lokasiProduksiKode);
        if (g) setHeader(p => ({ ...p, lokasiProduksiNama: g.Nama }));
      }
    } catch (e: any) {
      toast.error(
        'Gagal',
        String(
          e?.response?.data?.message ||
            e?.message ||
            'Gagal load lookup gudang',
        ),
      );
      setListGudang([]);
    } finally {
      setLoadingLookup(false);
    }
  }, [header.gudangKode, header.lokasiProduksiKode]);

  useEffect(() => {
    fetchLookups();
  }, []);

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const openDeleteConfirm = (row: DetailItem) => {
    const label = `${row.barcode || '—'}\n${row.Nama_Bahan || row.sku || ''}`;
    setPendingDelete({ id: row.__id, label });
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setPendingDelete(null);
  };

  const removeRowById = useCallback((id: string) => {
    setDetails(prev => {
      const copy = prev.filter(x => x.__id !== id);
      if (!copy.length) return [createEmptyDetail()];
      return copy;
    });
  }, []);

  const ensureLastBlankRow = useCallback(() => {
    setDetails(prev => {
      const last = prev[prev.length - 1];
      if (!last) return [createEmptyDetail()];

      const hasValue =
        String(last.barcode || '').trim() || String(last.sku || '').trim();
      if (hasValue) return [...prev, createEmptyDetail()];
      return prev;
    });
  }, []);

  const totalScanned = useMemo(() => {
    // buat indikator cepat: berapa barcode terisi (tanpa qty)
    return details.filter(d => String(d.barcode || '').trim()).length;
  }, [details]);

  const isFormValid = useMemo(() => {
    const headerOk = !!header.gudangKode && !!header.lokasiProduksiKode;
    const hasDetail = details.some(d => String(d.barcode || '').trim());
    return headerOk && hasDetail;
  }, [header, details]);

  const openScannerForRow = useCallback((rowId: string) => {
    setActiveScanId(rowId);
    setScannerOpen(true);
  }, []);

  const applyBarcodeToRow = useCallback(
    (rowId: string, patch: Partial<DetailItem>) => {
      setDetails(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(x => x.__id === rowId);
        if (idx < 0) return prev;
        copy[idx] = { ...copy[idx], ...patch };
        return copy;
      });
    },
    [],
  );

  const handleBarcodeScan = useCallback(
    async (rowId: string, barcodeValue: string) => {
      const bc = String(barcodeValue || '').trim();
      if (!bc) return;

      if (!String(header.gudangKode || '').trim()) {
        return toast.warn(
          'Validasi',
          'Gudang asal harus dipilih sebelum scan barcode.',
        );
      }

      const isDuplicate = details.some(
        d => String(d.barcode || '').trim() === bc && d.__id !== rowId,
      );
      if (isDuplicate)
        return toast.warn('Duplikat', `Barcode ${bc} sudah digunakan.`);

      try {
        const res = await api.get(
          `/mmt/permintaan-produksi/stok-barcode/${encodeURIComponent(bc)}`,
          {
            params: {
              gudang: header.gudangKode,
              _ts: Date.now(),
            },
          },
        );

        const bahan = res?.data?.data ?? res?.data?.data?.data ?? res?.data;
        if (!bahan)
          return toast.error('Error', 'Data barcode tidak ditemukan.');

        applyBarcodeToRow(rowId, {
          barcode: String(bahan?.Barcode ?? bc),
          sku: String(bahan?.Kode ?? ''),
          Nama_Bahan: String(bahan?.Nama_Bahan ?? ''),
          satuan: String(bahan?.Satuan ?? ''),
          Panjang: num(bahan?.Panjang),
          Lebar: num(bahan?.Lebar),
          qty: 1,
          stok: num(bahan?.Stok),
          spk:
            bahan?.Nomor_SPK && String(bahan?.Nomor_SPK) !== '0'
              ? String(bahan?.Nomor_SPK)
              : '',
        });

        ensureLastBlankRow();
      } catch (err: any) {
        toast.error(
          'Gagal',
          String(
            err?.response?.data?.message ||
              err?.message ||
              'Gagal mengambil data barcode.',
          ),
        );
      }
    },
    [details, header.gudangKode, applyBarcodeToRow, ensureLastBlankRow],
  );

  const getAutoTargetRowId = useCallback(() => {
    const firstEmpty = details.find(d => !String(d.barcode || '').trim());
    if (firstEmpty?.__id) return firstEmpty.__id;

    const last = details[details.length - 1];
    return last?.__id ?? null;
  }, [details]);

  const flushHiddenScannerBuffer = useCallback(
    (raw?: string) => {
      const bc = String(raw ?? hiddenScanBuffer).trim();
      setHiddenScanBuffer('');

      if (!bc) {
        focusHiddenScanInput();
        return;
      }

      const targetId = getAutoTargetRowId();
      if (!targetId) {
        focusHiddenScanInput();
        return;
      }

      handleBarcodeScan(targetId, bc).finally(() => {
        focusHiddenScanInput();
      });
    },
    [
      hiddenScanBuffer,
      getAutoTargetRowId,
      handleBarcodeScan,
      focusHiddenScanInput,
    ],
  );

  const onHiddenScannerChange = useCallback(
    (text: string) => {
      setHiddenScanBuffer(text);

      if (hiddenScanTimerRef.current) {
        clearTimeout(hiddenScanTimerRef.current);
      }

      hiddenScanTimerRef.current = setTimeout(() => {
        flushHiddenScannerBuffer(text);
      }, SCAN_IDLE_MS);
    },
    [flushHiddenScannerBuffer],
  );

  useEffect(() => {
    return () => {
      if (hiddenScanTimerRef.current) {
        clearTimeout(hiddenScanTimerRef.current);
      }
    };
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['code-128', 'ean-13', 'qr'],
    onCodeScanned: codes => {
      if (!scannerOpen) return;
      const val = codes?.[0]?.value;
      if (!val) return;

      const id = activeScanId;
      setScannerOpen(false);

      if (id) handleBarcodeScan(id, val);
      setActiveScanId(null);
    },
  });

  const setRowField = useCallback(
    (rowId: string, field: keyof DetailItem, value: any) => {
      setDetails(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(x => x.__id === rowId);
        if (idx < 0) return prev;
        copy[idx] = { ...copy[idx], [field]: value };
        return copy;
      });
    },
    [],
  );

  const saveForm = useCallback(async () => {
    if (!isFormValid) {
      return toast.warn(
        'Validasi',
        'Header harus lengkap & minimal 1 barcode terisi',
      );
    }

    setSaving(true);
    try {
      const valid = details.filter(d => String(d.barcode || '').trim());
      if (!valid.length)
        return toast.warn('Validasi', 'Minimal satu barcode harus diisi.');

      const payload = {
        header: {
          nomor: header.nomor,
          tanggal: header.tanggal,
          mnt_gdg_kode: header.gudangKode,
          mnt_lokasiproduksi: header.lokasiProduksiKode,
          mnt_keterangan: header.keteranganHeader,
          user_create: 'Admin',
        },
        details: valid.map(d => ({
          sku: d.sku,
          barcode: d.barcode,
          qty: 1,
          satuan: d.satuan,
          spk: d.spk || '0',
          keterangan: d.keterangan || '',
        })),
        isEditMode: false,
      };

      await api.post('/mmt/permintaan-produksi', payload);
      toast.success('Sukses', 'Data berhasil disimpan');
      navigation.goBack();
    } catch (e: any) {
      toast.error(
        'Gagal',
        String(
          e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            'Terjadi kesalahan saat menyimpan.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [details, header, isFormValid, navigation]);

  const renderRow = useCallback(
    ({ item }: { item: DetailItem; index: number }) => {
      const hasBarcode = !!String(item.barcode || '').trim();
      const hasData = !!String(item.sku || '').trim();

      return (
        <View style={styles.rowCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowCode}>
                {hasBarcode ? item.barcode : '— (Scan Barcode)'}
              </Text>

              {!!item.Nama_Bahan && (
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.Nama_Bahan}
                </Text>
              )}

              {!!hasData && (
                <Text style={styles.rowSize}>
                  Spesifikasi: {num(item.Panjang)}m x {num(item.Lebar)}m
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => openScannerForRow(item.__id)}
              style={styles.scanBtn}
              disabled={hasBarcode}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={20}
                color="white"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openDeleteConfirm(item)}
              style={styles.trashBtn}
            >
              <MaterialIcons name="delete" size={20} color={DANGER} />
            </TouchableOpacity>
          </View>

          {/* input manual barcode (optional) */}
          <View style={{ marginTop: 10 }}>
            <View style={styles.barcodeBox}>
              <TextInput
                style={styles.barcodeInput}
                value={item.barcode}
                placeholder="Ketik barcode lalu enter..."
                placeholderTextColor="#9AA0A6"
                onChangeText={v => setRowField(item.__id, 'barcode', v)}
                onSubmitEditing={() =>
                  handleBarcodeScan(item.__id, item.barcode)
                }
                returnKeyType="search"
                editable={!hasBarcode}
              />
            </View>
          </View>
        </View>
      );
    },
    [handleBarcodeScan, openScannerForRow, openDeleteConfirm, setRowField],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TextInput
          ref={hiddenScanInputRef}
          style={styles.hiddenScannerInput}
          value={hiddenScanBuffer}
          onChangeText={onHiddenScannerChange}
          onSubmitEditing={() => flushHiddenScannerBuffer()}
          autoFocus
          blurOnSubmit={false}
          contextMenuHidden
          caretHidden
          showSoftInputOnFocus={false}
          autoCorrect={false}
          autoCapitalize="none"
          editable={!saving && !scannerOpen}
        />

        <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

        {/* AppBar aman notch/statusbar */}
        <View style={styles.appBar}>
          <TouchableOpacity
            style={[styles.appBarBtn, saving && { opacity: 0.6 }]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.appBarBtnText}>Batal</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!isFormValid || saving) && { opacity: 0.6 },
            ]}
            onPress={saveForm}
            disabled={!isFormValid || saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header form */}
        {!headerCollapsed && (
          <View style={styles.headerCard}>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tanggal</Text>
                <TextInput
                  style={styles.input}
                  value={header.tanggal}
                  editable={false}
                />
              </View>

              <View style={{ width: 10 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Gudang Asal</Text>
                <TouchableOpacity
                  onPress={() => setOpenGudangAsal(true)}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                  <View pointerEvents="none">
                    <TextInput
                      style={styles.input}
                      value={header.gudangKode}
                      editable={false}
                    />
                  </View>
                </TouchableOpacity>
                <Text style={styles.subText}>{header.gudangNama}</Text>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Lokasi Produksi</Text>
              <TouchableOpacity
                onPress={() => setOpenLokasiProduksi(true)}
                activeOpacity={0.85}
                disabled={saving}
              >
                <View pointerEvents="none">
                  <TextInput
                    style={styles.input}
                    value={header.lokasiProduksiKode}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.subText}>{header.lokasiProduksiNama}</Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Keterangan</Text>
              <TextInput
                style={[styles.input, { textAlign: 'left' }]}
                value={header.keteranganHeader}
                placeholder="(opsional)"
                placeholderTextColor="#9AA0A6"
                onChangeText={v =>
                  setHeader(p => ({ ...p, keteranganHeader: v }))
                }
              />
            </View>

            {loadingLookup && (
              <Text style={styles.smallInfo}>Memuat lookup gudang...</Text>
            )}
          </View>
        )}

        {/* toolbar */}
        <View style={styles.toolbar}>
          <Text style={{ color: MUTED, fontWeight: '900' }}>
            Ter-scan: <Text style={{ color: PRIMARY }}>{totalScanned}</Text>
          </Text>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.headerToggle}
            onPress={() => setHeaderCollapsed(p => !p)}
          >
            <Text style={styles.headerToggleText}>
              {headerCollapsed ? 'Buka Filter ▼' : 'Tutup Filter ▲'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={details}
          keyExtractor={it => it.__id}
          renderItem={renderRow}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 90,
          }}
          keyboardShouldPersistTaps="handled"
        />

        {/* bottom dock */}
        <View style={styles.bottomDock}>
          <Text style={styles.bottomLabel}>Ter-scan</Text>
          <Text style={styles.bottomTotal}>{totalScanned}</Text>
        </View>

        {/* Modal pilih gudang asal */}
        <SelectModal<GudangLookup>
          visible={openGudangAsal}
          title="Pilih Gudang Asal"
          items={listGudang}
          getKey={it => it.Kode}
          getLabel={it => `${it.Kode} — ${it.Nama}`}
          onSelect={g =>
            setHeader(p => ({ ...p, gudangKode: g.Kode, gudangNama: g.Nama }))
          }
          onClose={() => setOpenGudangAsal(false)}
        />

        {/* Modal pilih lokasi produksi */}
        <SelectModal<GudangLookup>
          visible={openLokasiProduksi}
          title="Pilih Lokasi Produksi"
          items={listGudang}
          getKey={it => it.Kode}
          getLabel={it => `${it.Kode} — ${it.Nama}`}
          onSelect={g =>
            setHeader(p => ({
              ...p,
              lokasiProduksiKode: g.Kode,
              lokasiProduksiNama: g.Nama,
            }))
          }
          onClose={() => setOpenLokasiProduksi(false)}
        />

        {/* Scanner Modal */}
        <Modal
          visible={scannerOpen}
          animationType="slide"
          onRequestClose={() => setScannerOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={[styles.appBar, { backgroundColor: PRIMARY }]}>
              <TouchableOpacity
                style={styles.appBarBtn}
                onPress={() => setScannerOpen(false)}
              >
                <Text style={styles.appBarBtnText}>Tutup</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            {device && hasPermission ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={scannerOpen}
                codeScanner={codeScanner}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '900' }}>
                  Kamera tidak tersedia / izin ditolak.
                </Text>
              </View>
            )}

            <View style={styles.scanOverlay}>
              <View style={styles.maskRowTop} />
              <View style={styles.maskRowMiddle}>
                <View style={styles.maskSide} />

                <View style={styles.holeWrap}>
                  <View style={styles.scanFrame}>
                    <View style={styles.scanLine} />
                  </View>
                  <Text style={styles.scanHint}>Arahkan barcode ke kotak</Text>
                </View>

                <View style={styles.maskSide} />
              </View>
              <View style={styles.maskRowBottom} />
            </View>
          </View>
        </Modal>

        {/* Confirm delete */}
        <ConfirmDialog
          visible={confirmOpen}
          variant="danger"
          title="Hapus Baris"
          message="Yakin ingin menghapus baris ini?"
          detail={pendingDelete?.label || ''}
          cancelText="Batal"
          confirmText="Hapus"
          loading={confirmLoading}
          onCancel={closeDeleteConfirm}
          onConfirm={() => {
            const id = String(pendingDelete?.id || '').trim();
            if (!id) return closeDeleteConfirm();

            setConfirmLoading(true);
            try {
              removeRowById(id);
              toast.success('Berhasil', 'Baris berhasil dihapus');
              closeDeleteConfirm();
            } finally {
              setConfirmLoading(false);
            }
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },
  screen: { flex: 1, backgroundColor: BG },

  appBar: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 6 : (StatusBar.currentHeight ?? 0) + 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarBtn: {
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarBtnText: { color: 'white', fontWeight: '900' },

  saveBtn: {
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '900' },

  headerCard: {
    margin: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  label: {
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#111827',
    fontWeight: '800',
    textAlign: 'center',
  },
  subText: { color: MUTED, fontWeight: '700', marginTop: 6, fontSize: 12 },
  smallInfo: { marginTop: 10, color: MUTED, fontWeight: '700', fontSize: 12 },

  toolbar: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerToggle: { paddingHorizontal: 8, paddingVertical: 8 },
  headerToggleText: { color: PRIMARY, fontWeight: '900' },

  rowCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCode: { color: PRIMARY, fontWeight: '900' },
  rowName: { marginTop: 4, fontWeight: '900', color: '#111827' },
  rowSize: { marginTop: 4, color: MUTED, fontWeight: '800', fontSize: 12 },

  scanBtn: {
    width: 44,
    height: 44,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  barcodeBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  barcodeInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontWeight: '800',
  },
  hiddenScannerInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -100,
    top: -100,
  },
  clearInlineBtn: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hintText: { marginTop: 8, color: MUTED, fontWeight: '700', fontSize: 12 },

  bottomDock: {
    position: 'absolute',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: { color: MUTED, fontWeight: '900', fontSize: 12 },
  bottomTotal: { color: PRIMARY, fontWeight: '900', fontSize: 16 },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskRowTop: { width: '100%', flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  maskRowMiddle: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  maskRowBottom: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskSide: {
    flex: 1,
    height: FRAME_H + 70,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  holeWrap: { width: FRAME_W, alignItems: 'center' },
  scanFrame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: FRAME_H / 2,
    height: 2,
    backgroundColor: 'rgba(34,197,94,0.9)',
  },
  scanHint: { marginTop: 14, color: '#E5E7EB', fontWeight: '900' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontWeight: '900', color: '#111827' },
  modalClose: { fontSize: 22, fontWeight: '900', color: MUTED },
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: { color: '#111827', fontWeight: '800' },
  modalEmpty: {
    padding: 16,
    textAlign: 'center',
    color: MUTED,
    fontWeight: '700',
  },
});
