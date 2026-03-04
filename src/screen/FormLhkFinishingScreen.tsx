/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import api from '../api/api.services';
import type { RootStackParamList } from '../../App';
import { toast } from '../../components/toastComponent';

type Props = NativeStackScreenProps<RootStackParamList, 'FormLhkFinishing'>;

type SpkItem = {
  nomor: string;
  nama: string;
  ukuranRaw?: string;
  panjang?: number;
  lebar?: number;
};

const JENIS_OPTIONS = ['POTONG', 'SEAMING', 'MATA AYAM', 'COLY', 'LAIN-LAIN'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

const pickArray = (v: any): any[] => {
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.data?.data)) return v.data.data;
  if (Array.isArray(v)) return v;
  return [];
};

const toNum = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const parseUkuranText = (ukuran?: string) => {
  const raw = String(ukuran || '')
    .trim()
    .toUpperCase();
  if (!raw)
    return {
      p: undefined as number | undefined,
      l: undefined as number | undefined,
    };

  const cleaned = raw.replace('M', '').trim();
  const m = cleaned.match(
    /([0-9]+(?:\.[0-9]+)?)\s*[Xx]\s*([0-9]+(?:\.[0-9]+)?)/,
  );
  if (!m)
    return {
      p: undefined as number | undefined,
      l: undefined as number | undefined,
    };

  return {
    p: Number(m[1]),
    l: Number(m[2]),
  };
};

const mapSpk = (item: any): SpkItem => ({
  nomor: String(
    item?.Nomor ?? item?.No_SPK ?? item?.SPK ?? item?.Kode ?? item?.nomor ?? '',
  ).trim(),
  nama: String(
    item?.Nama ?? item?.Nama_SPK ?? item?.Keterangan ?? item?.nama ?? '',
  ).trim(),
  ukuranRaw: String(item?.Ukuran ?? item?.ukuran ?? '').trim(),
  panjang: toNum(item?.Panjang ?? item?.panjang),
  lebar: toNum(item?.Lebar ?? item?.lebar),
});

export default function FormLhkFinishingScreen({ navigation }: Props) {
  const [jenis, setJenis] = useState('');
  const [tanggal, setTanggal] = useState<Date>(new Date());
  const [spk, setSpk] = useState<SpkItem | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [panjang, setPanjang] = useState('');
  const [lebar, setLebar] = useState('');
  const [qty, setQty] = useState('');
  const [qtyBs, setQtyBs] = useState('');

  const [openJenis, setOpenJenis] = useState(false);
  const [openTanggal, setOpenTanggal] = useState(false);
  const [openSpk, setOpenSpk] = useState(false);

  const [spkKeyword, setSpkKeyword] = useState('');
  const [spkItems, setSpkItems] = useState<SpkItem[]>([]);
  const [spkLoading, setSpkLoading] = useState(false);

  const canPreview = useMemo(
    () => !!jenis && !!spk && !!panjang && !!lebar && !!qty,
    [jenis, spk, panjang, lebar, qty],
  );

  const isJenisInvalid = submitAttempted && !jenis;
  const isSpkInvalid = submitAttempted && !spk;

  const fetchSpk = async (keyword = '') => {
    setSpkLoading(true);
    try {
      const res = await api.get('/mmt/SPK/lookup', {
        params: { keyword: String(keyword || '').trim() },
      });

      const mapped = pickArray(res?.data)
        .map(mapSpk)
        .filter((x: SpkItem) => !!x.nomor);

      setSpkItems(mapped);
    } catch (e: any) {
      toast.error(
        'Gagal',
        String(
          e?.response?.data?.message || e?.message || 'Gagal memuat data SPK',
        ),
      );
      setSpkItems([]);
    } finally {
      setSpkLoading(false);
    }
  };

  useEffect(() => {
    if (!openSpk) return;
    fetchSpk(spkKeyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSpk]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Input LHK Finishing</Text>

            <Text style={styles.label}>
              Jenis <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.select, isJenisInvalid && styles.selectInvalid]}
              onPress={() => setOpenJenis(true)}
            >
              <Text style={[styles.selectText, !jenis && styles.placeholder]}>
                {jenis || 'Pilih jenis'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
            {isJenisInvalid && (
              <Text style={styles.errorText}>Jenis wajib diisi.</Text>
            )}

            <Text style={styles.label}>Tanggal</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setOpenTanggal(true)}
            >
              <Text style={styles.selectText}>{formatDate(tanggal)}</Text>
              <MaterialIcons name="date-range" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <Text style={styles.label}>
              SPK <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.select, isSpkInvalid && styles.selectInvalid]}
              onPress={() => setOpenSpk(true)}
            >
              <Text style={[styles.selectText, !spk && styles.placeholder]}>
                {spk ? spk.nomor : 'ketuk untuk cari SPK'}
              </Text>
              <MaterialIcons name="search" size={22} color="#9CA3AF" />
            </TouchableOpacity>
            {isSpkInvalid && (
              <Text style={styles.errorText}>SPK wajib diisi.</Text>
            )}
            {!!spk?.nama && <Text style={styles.spkNameBelow}>{spk.nama}</Text>}

            <Text style={styles.label}>Ukuran (p x l)</Text>
            <View style={styles.row2}>
              <View style={styles.fieldWithSuffix}>
                <TextInput
                  value={panjang}
                  onChangeText={setPanjang}
                  keyboardType="decimal-pad"
                  placeholder="Panjang"
                  placeholderTextColor="#9CA3AF"
                  style={styles.inputWithSuffix}
                  editable={false}
                />
                <Text style={styles.suffixText}>m</Text>
              </View>
              <Text style={styles.xText}>x</Text>
              <View style={styles.fieldWithSuffix}>
                <TextInput
                  value={lebar}
                  onChangeText={setLebar}
                  keyboardType="decimal-pad"
                  placeholder="Lebar"
                  placeholderTextColor="#9CA3AF"
                  style={styles.inputWithSuffix}
                  editable={false}
                />
                <Text style={styles.suffixText}>m</Text>
              </View>
            </View>

            <Text style={styles.label}>Qty</Text>
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              placeholder="Masukkan Qty"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            <Text style={styles.label}>Qty BS</Text>
            <TextInput
              value={qtyBs}
              onChangeText={setQtyBs}
              keyboardType="number-pad"
              placeholder="Masukkan Qty BS"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                canPreview ? styles.saveBtnOn : styles.saveBtnOff,
              ]}
              onPress={() => {
                setSubmitAttempted(true);
                if (!jenis || !spk) {
                  toast.warn('Validasi', 'Jenis dan SPK wajib diisi.');
                  return;
                }
                toast.info(
                  'Coming Soon',
                  'Simpan belum diaktifkan, backend belum siap.',
                );
              }}
            >
              <Text style={styles.saveBtnText}>Simpan - Coming Soon</Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              * Tombol simpan hanya penanda sementara sampai BE siap.
            </Text>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backBtnText}>Kembali</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePicker
        modal
        open={openTanggal}
        date={tanggal}
        mode="date"
        title="Pilih Tanggal"
        onConfirm={date => {
          setOpenTanggal(false);
          setTanggal(date);
        }}
        onCancel={() => setOpenTanggal(false)}
      />

      <Modal
        visible={openJenis}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenJenis(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Jenis</Text>
            {JENIS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={styles.modalItem}
                onPress={() => {
                  setJenis(opt);
                  setOpenJenis(false);
                }}
              >
                <Text style={styles.modalItemText}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOpenJenis(false)}
            >
              <Text style={styles.modalCloseBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={openSpk}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenSpk(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih SPK</Text>

            <View style={styles.searchRow}>
              <TextInput
                value={spkKeyword}
                onChangeText={setSpkKeyword}
                placeholder="Cari nomor / nama SPK"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.searchInput]}
              />
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={() => fetchSpk(spkKeyword)}
              >
                <Text style={styles.searchBtnText}>Cari</Text>
              </TouchableOpacity>
            </View>

            {spkLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#3F51B5" />
                <Text style={styles.loadingText}>Memuat SPK...</Text>
              </View>
            ) : spkItems.length ? (
              <ScrollView style={styles.spkList}>
                {spkItems.map(item => (
                  <TouchableOpacity
                    key={item.nomor}
                    style={styles.modalItem}
                    onPress={() => {
                      const parsed = parseUkuranText(item.ukuranRaw);
                      const p = item.panjang ?? parsed.p;
                      const l = item.lebar ?? parsed.l;

                      setSpk(item);
                      setPanjang(p !== undefined ? String(p) : '');
                      setLebar(l !== undefined ? String(l) : '');
                      setOpenSpk(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.nomor}</Text>
                    <Text style={styles.modalItemSub}>{item.nama || '-'}</Text>
                    {!!item.ukuranRaw && (
                      <Text style={styles.modalItemHint}>
                        Ukuran: {item.ukuranRaw}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>SPK tidak ditemukan.</Text>
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOpenSpk(false)}
            >
              <Text style={styles.modalCloseBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 14, paddingBottom: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
    textAlign: 'center',
  },
  cardSubTitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '600',
  },
  requiredStar: { color: '#DC2626' },
  select: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInvalid: {
    borderColor: '#DC2626',
  },
  selectText: { color: '#111827', fontSize: 14, flex: 1 },
  placeholder: { color: '#9CA3AF', fontStyle: 'italic' },
  selectArrow: { marginLeft: 8, color: '#6B7280' },
  errorText: {
    marginTop: 4,
    color: '#DC2626',
    fontSize: 11,
  },
  spkNameBelow: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    height: 16,
  },

  row2: { flexDirection: 'row', alignItems: 'center' },
  xText: { marginHorizontal: 8, color: '#4B5563', fontWeight: '700' },
  fieldWithSuffix: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    height: 44,
    paddingHorizontal: 12,
  },
  inputWithSuffix: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    paddingVertical: 0,
  },
  suffixText: {
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    color: '#111827',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputHalf: { flex: 1 },

  saveBtn: {
    marginTop: 18,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnOn: { backgroundColor: '#3F51B5' },
  saveBtnOff: { backgroundColor: '#94A3B8' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  helperText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 11,
    fontStyle: 'italic',
  },

  backBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#3F51B5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  backBtnText: { color: '#1E3A8A', fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 10,
  },
  modalItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalItemText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  modalItemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalItemHint: { fontSize: 11, color: '#374151', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  searchInput: { flex: 1, height: 42 },
  searchBtn: {
    marginLeft: 8,
    backgroundColor: '#3F51B5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  spkList: { maxHeight: 260 },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: { marginLeft: 8, color: '#6B7280', fontSize: 12 },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    paddingVertical: 8,
  },
  modalCloseBtn: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseBtnText: { color: '#374151', fontWeight: '700' },
});
