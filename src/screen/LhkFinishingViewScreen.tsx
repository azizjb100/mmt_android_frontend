import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import api from '../api/api.services';
import { toast } from '../../components/toastComponent';

type LhkFinishingHeader = {
  Nomor: string;
  Tanggal?: string;
  Gudang?: string;
  Nama_Gudang?: string;
  Shift?: string;
  Operator?: string;
  Lengkap?: 'Y' | 'N';
};

type LhkFinishingDetail = {
  Nomor_SPK?: string;
  Nama_SPK?: string;
  J_Order?: number;
  J_Seaming?: number;
  J_MataAyam?: number;
  J_Coly?: number;
  J_Bs?: number;
  Mata_Ayam?: number;
  XBanner?: number;
  Plastik?: number;
};

const API_BASE = '/mmt/lhk-finishing';

const pad2 = (n: number) => String(n).padStart(2, '0');

const toDisplayDate = (d: Date) => {
  const day = pad2(d.getDate());
  const m = pad2(d.getMonth() + 1);
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
};

const toApiDate = (input: string) => {
  const s = String(input || '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
};

const parseDisplayDate = (input: string) => {
  const s = String(input || '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/').map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
};

const formatDate = (input?: string) => {
  if (!input) return '-';

  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const pickArray = (v: any) => {
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.data?.data)) return v.data.data;
  if (Array.isArray(v)) return v;
  return [];
};

export default function LhkFinishingViewScreen({ navigation }: any) {
  const [startDate, setStartDate] = useState(() =>
    toDisplayDate(new Date(Date.now() - 30 * 86400000)),
  );
  const [endDate, setEndDate] = useState(() => toDisplayDate(new Date()));

  const [rows, setRows] = useState<LhkFinishingHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedNomor, setExpandedNomor] = useState<string | null>(null);
  const [detailsMap, setDetailsMap] = useState<
    Record<string, LhkFinishingDetail[]>
  >({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>(
    {},
  );

  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [pickerTemp, setPickerTemp] = useState<Date>(new Date());

  const openDatePicker = (mode: 'start' | 'end') => {
    setPickerMode(mode);
    setPickerTemp(parseDisplayDate(mode === 'start' ? startDate : endDate));
  };

  const applyPickedDate = () => {
    const picked = toDisplayDate(pickerTemp);
    const mode = pickerMode;
    setPickerMode(null);

    if (mode === 'start') {
      if (toApiDate(picked) > toApiDate(endDate)) {
        setStartDate(endDate);
        setEndDate(picked);
      } else {
        setStartDate(picked);
      }
    } else if (mode === 'end') {
      if (toApiDate(picked) < toApiDate(startDate)) {
        setEndDate(startDate);
        setStartDate(picked);
      } else {
        setEndDate(picked);
      }
    }
  };

  const fetchHeaders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get(API_BASE, {
        params: {
          startDate: toApiDate(startDate),
          endDate: toApiDate(endDate),
        },
      });
      setRows(pickArray(res?.data) as LhkFinishingHeader[]);
      setExpandedNomor(null);
      setDetailsMap({});
    } catch {
      toast.error('Gagal', 'Gagal memuat data LHK Finishing');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const loadDetail = async (nomor: string) => {
    if (detailsMap[nomor]) return;

    setLoadingDetails(prev => ({ ...prev, [nomor]: true }));
    try {
      const res = await api.get(`${API_BASE}/details`, { params: { nomor } });
      const detail = pickArray(res?.data) as LhkFinishingDetail[];
      setDetailsMap(prev => ({ ...prev, [nomor]: detail }));
    } catch {
      toast.error('Gagal', `Gagal memuat detail nomor ${nomor}`);
      setDetailsMap(prev => ({ ...prev, [nomor]: [] }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [nomor]: false }));
    }
  };

  const toggleExpand = async (nomor: string) => {
    const next = expandedNomor === nomor ? null : nomor;
    setExpandedNomor(next);
    if (next) {
      await loadDetail(next);
    }
  };

  const renderDetail = (nomor: string) => {
    if (loadingDetails[nomor]) {
      return (
        <View style={styles.detailLoading}>
          <ActivityIndicator size="small" color="#3F51B5" />
          <Text style={styles.detailLoadingText}>Memuat detail...</Text>
        </View>
      );
    }

    const details = detailsMap[nomor] || [];
    if (!details.length) {
      return <Text style={styles.emptyDetail}>Tidak ada data detail.</Text>;
    }

    return (
      <View style={styles.detailWrap}>
        {details.map((d, idx) => (
          <View
            key={`${nomor}-${d.Nomor_SPK || 'spk'}-${idx}`}
            style={styles.detailCard}
          >
            <Text style={styles.detailTitle}>{d.Nomor_SPK || '-'}</Text>
            <Text style={styles.detailName}>{d.Nama_SPK || '-'}</Text>

            <View style={styles.detailGrid}>
              <Text style={styles.detailLabel}>
                Order: {Number(d.J_Order || 0)}
              </Text>
              <Text style={styles.detailLabel}>
                Seaming: {Number(d.J_Seaming || 0)}
              </Text>
              <Text style={styles.detailLabel}>
                Mata Ayam: {Number(d.J_MataAyam || 0)}
              </Text>
              <Text style={styles.detailLabel}>
                Coly: {Number(d.J_Coly || 0)}
              </Text>
              <Text style={styles.detailLabel}>BS: {Number(d.J_Bs || 0)}</Text>
              <Text style={styles.detailLabel}>
                Qty XBanner: {Number(d.XBanner || 0)}
              </Text>
              <Text style={styles.detailLabel}>
                Qty Plastik: {Number(d.Plastik || 0)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: LhkFinishingHeader }) => {
    const isExpanded = item.Nomor === expandedNomor;
    const lengkap = item.Lengkap === 'Y';

    return (
      <View style={[styles.rowCard, !lengkap && styles.rowCardWarning]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => toggleExpand(item.Nomor)}
        >
          <View style={styles.rowTop}>
            <Text style={[styles.nomor, !lengkap && styles.textRed]}>
              {item.Nomor}
            </Text>
            <View
              style={[styles.chip, lengkap ? styles.chipOk : styles.chipNo]}
            >
              <Text style={styles.chipText}>{lengkap ? 'YA' : 'TIDAK'}</Text>
            </View>
          </View>

          <Text style={styles.meta}>Tanggal: {formatDate(item.Tanggal)}</Text>
          <Text style={styles.meta}>
            Gudang: {item.Gudang || '-'} - {item.Nama_Gudang || '-'}
          </Text>
          <Text style={styles.meta}>
            Shift: {item.Shift || '-'} | Operator: {item.Operator || '-'}
          </Text>

          <Text style={styles.expandHint}>
            {isExpanded ? 'Sembunyikan detail ▲' : 'Lihat detail ▼'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.detailSection}>
            {/* <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handlePrint(item.Nomor)}
              >
                <Text style={styles.secondaryBtnText}>Cetak Slip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() =>
                  toast.info('Info', 'Export detail belum tersedia di mobile')
                }
              >
                <Text style={styles.secondaryBtnText}>Export Detail</Text>
              </TouchableOpacity>
            </View> */}

            {renderDetail(item.Nomor)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.safeArea]}>
      <View style={styles.filterCard}>
        {/* Header actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.btnSuccess,
              loading && styles.btnDisabled,
            ]}
            onPress={() => navigation.navigate('FormLhkFinishing')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateField}
            activeOpacity={0.85}
            onPress={() => openDatePicker('start')}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{startDate}</Text>
          </TouchableOpacity>

          <Text style={styles.sep}>s/d</Text>

          <TouchableOpacity
            style={styles.dateField}
            activeOpacity={0.85}
            onPress={() => openDatePicker('end')}
            disabled={loading}
          >
            <Text style={styles.dateValue}>{endDate}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.refreshWideBtn, loading && styles.btnDisabled]}
          onPress={() => fetchHeaders()}
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

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#3F51B5" />
          <Text style={styles.centerLoadingText}>Memuat data...</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.Nomor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Tidak ada data LHK Finishing.</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHeaders(true)}
              colors={['#3F51B5']}
            />
          }
        />
      )}

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={styles.dpBackdrop}>
          <View style={styles.dpCard}>
            <View style={styles.dpHeader}>
              <Text style={styles.dpTitle}>
                {pickerMode === 'start'
                  ? 'Pilih Tanggal Mulai'
                  : 'Pilih Tanggal Akhir'}
              </Text>
              <Text style={styles.dpSubtitle}>{toDisplayDate(pickerTemp)}</Text>
            </View>

            <View style={styles.dpBody}>
              <DatePicker
                date={pickerTemp}
                onDateChange={setPickerTemp}
                mode="date"
              />
            </View>

            <View style={styles.dpFooter}>
              <TouchableOpacity
                style={[styles.dpBtn, styles.dpBtnGhost]}
                onPress={() => setPickerMode(null)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },

  actions: { flexDirection: 'row', paddingBottom: 12 },
  btnDisabled: { opacity: 0.35 },
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

  filterCard: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 12,
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
  refreshText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    marginLeft: 8,
  },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerLoadingText: { marginTop: 8, color: '#6B7280' },

  listContent: { paddingHorizontal: 14, paddingBottom: 18 },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  rowCardWarning: { borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nomor: { fontSize: 14, fontWeight: '700', color: '#111827' },
  textRed: { color: '#B91C1C' },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOk: { backgroundColor: '#DCFCE7' },
  chipNo: { backgroundColor: '#FEE2E2' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 5, fontSize: 12, color: '#374151' },
  expandHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },

  detailSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#3F51B5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#EEF2FF',
  },
  secondaryBtnText: { color: '#1E3A8A', fontWeight: '700', fontSize: 12 },

  detailLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  detailLoadingText: { color: '#6B7280', fontSize: 12 },
  detailWrap: { gap: 8 },
  detailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailTitle: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  detailName: { fontSize: 12, color: '#374151', marginTop: 2, marginBottom: 6 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailLabel: {
    fontSize: 11,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 10,
  },
  emptyDetail: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#6B7280',
    fontSize: 13,
  },

  dpBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  dpCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dpHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dpTitle: { fontWeight: '900', color: '#111827', fontSize: 14 },
  dpSubtitle: {
    marginTop: 6,
    fontWeight: '900',
    color: '#3F51B5',
    fontSize: 13,
  },
  dpBody: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dpBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpBtnGhost: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  dpBtnGhostText: { fontWeight: '900', color: '#111827' },
  dpBtnPrimary: { backgroundColor: '#3F51B5' },
  dpBtnPrimaryText: { fontWeight: '900', color: '#fff' },
});
