// ========================================
// KONFIGURASI & KONSTANTA
// ========================================
const API_BASE_URL = 'http://localhost:3000';

const CONFIG = {
  columnCounts: {
    oli_masuk: 8,
    oli_tersedia: 14,
    pemakaian_oli: 10,
    pemakaian_per_bon: 11
  },
  headers: {
    oli_masuk: [
      'No', 'Tanggal', 'Nama Literan', 'No Seri', 
      'Jumlah Masuk (L)', 'Harga Satuan', 'Total', 'Vendor'
    ],
    oli_tersedia: [
      'No', 'Tanggal', 'Nama Literan', 'No Seri', 
      'Sisa Lama (L)', 'Baru Masuk (L)', 'Total (L)', 'Dipakai (L)', 'Sisa Akhir (L)',
      'Harga Satuan', 'Total', 'Status Gabungan', 'Digabung Ke', 'Vendor'
    ],
    pemakaian_oli: [
      'No', 'Tanggal', 'Nama Literan', 'No Seri', 'Kendaraan',
      'Jumlah (L)', 'Harga Satuan', 'Total', 'Keterangan', 'Vendor'
    ],
    pemakaian_per_bon: [
      'No', 'Tanggal Masuk', 'No Seri', 'Nama Literan', 'Vendor',
      'Kendaraan', 'Jumlah (L)', 'Harga Satuan', 'Total', 'Keterangan', 'Tanggal Pemakaian'
    ]
  },
  titles: {
    oli_masuk: 'REKAP LITERAN MASUK (TANPA GABUNGAN)',
    oli_tersedia: 'REKAP LITERAN TERSEDIA (STOK)',
    pemakaian_oli: 'REKAP PEMAKAIAN LITERAN',
    pemakaian_per_bon: 'REKAP PEMAKAIAN PER BON'
  },
  filterLabels: {
    hari: 'Hari Ini',
    minggu: '7 Hari Terakhir',
    bulan: 'Bulan Ini',
    manual: 'Tanggal Manual',
    semua: 'Semua Data'
  }
};

// ========================================
// STATE MANAGEMENT
// ========================================
const state = {
  vendorMap: {},
  kendaraanMap: {},
  vendorNameToId: {},
  kendaraanLabelToId: {},
  currentData: [],
  allData: [],
  currentFilter: {},
  searchTimeout: null,
  pemakaianTotals: {},
  oliLamaStokMap: {}
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const utils = {
  parseQty: qty => parseFloat((qty || '').toString().replace(',', '.')) || 0,
  
  formatCurrency: val => `Rp ${val.toLocaleString('id-ID')}`,

  formatNumber: val => {
    const rounded = Math.round(val * 100) / 100;
    if (rounded % 1 === 0) {
      return rounded.toLocaleString('id-ID');
    }
    return rounded.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  
  formatDate: date => date ? new Date(date).toLocaleDateString('id-ID') : '',

  formatDateISO(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  getDateRange(filterType, startVal, endVal) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start, end;

    switch (filterType) {
      case 'hari':
        start = end = this.formatDateISO(today);
        break;
      case 'minggu':
        end = this.formatDateISO(today);
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 6);
        start = this.formatDateISO(lastWeek);
        break;
      case 'bulan':
        start = this.formatDateISO(new Date(today.getFullYear(), today.getMonth(), 1));
        end = this.formatDateISO(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      case 'manual':
        start = startVal;
        end = endVal;
        break;
      default:
        start = end = this.formatDateISO(today);
    }

    return { start, end };
  }
};

// ========================================
// API FUNCTIONS
// ========================================
const api = {
  async fetch(endpoint) {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  async loadOliList() {
    try {
      const olis = await this.fetch('/oli_masuk');
      const uniqueOlis = [...new Set(olis.map(o => o.nama_oli))];
      $('oliList').innerHTML = uniqueOlis.map(n => `<option value="${n}">`).join('');
    } catch (error) {
      console.error('Error loading oli list:', error);
    }
  },

  async loadFilters() {
    try {
      const [vendors, kendaraans] = await Promise.all([
        this.fetch('/vendor'),
        this.fetch('/kendaraan')
      ]);

      // Load vendors - UBAH MENJADI DATALIST
      vendors.forEach(v => {
        state.vendorNameToId[v.nama_vendor] = v.id;
        state.vendorMap[v.id] = v.nama_vendor;
      });

      $('vendorList').innerHTML = vendors.map(v => 
        `<option value="${v.nama_vendor}">`
      ).join('');

      // Load kendaraans
      $('kendaraanFilterList').innerHTML = kendaraans.map(k => {
        const label = `${k.dt_mobil} - ${k.plat}`;
        state.kendaraanLabelToId[label] = k.id;
        state.kendaraanMap[k.id] = label;
        return `<option value="${label}">`;
      }).join('');
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  },

  async fetchPemakaian(query = '') {
    try {
      const endpoint = `/rekap/pemakaian_oli${query ? '?' + query : ''}`;
      return await this.fetch(endpoint);
    } catch (err) {
      console.error('Error fetching pemakaian:', err);
      return [];
    }
  }
};

// ========================================
// UI FUNCTIONS
// ========================================
const ui = {
  toggleFilters(tipe) {
    $$('.filter-oli_masuk, .filter-oli_tersedia, .filter-pemakaian_oli').forEach(el => 
      el.classList.add('filter-hidden')
    );
    $$(`.filter-${tipe}`).forEach(el => 
      el.classList.remove('filter-hidden')
    );
  },

  updateHeaders(tipe) {
    $('tableHead').innerHTML = `
      <tr>${CONFIG.headers[tipe].map(h => `<th>${h}</th>`).join('')}</tr>
    `;
  },

  showLoading(tipe) {
    $('rekapTable').querySelector('tbody').innerHTML = 
      `<tr><td colspan="${CONFIG.columnCounts[tipe]}" class="loading">Memuat data...</td></tr>`;
  },

  showEmpty(tipe, msg = 'Tidak ada data yang ditemukan') {
    $('rekapTable').querySelector('tbody').innerHTML = 
      `<tr><td colspan="${CONFIG.columnCounts[tipe]}" class="empty-state">${msg}</td></tr>`;
  },

  resetSummary() {
    $('summary').innerHTML = '<strong>Total Literan:</strong> 0 L<br><strong>Grand Total:</strong> Rp 0';
  }
};

// ========================================
// DATA HANDLER
// ========================================
const dataHandler = {
applyClientFilters(data) {
  const tipe = $('tipeLaporan').value;
  if (tipe !== 'oli_tersedia') return data;

  let filtered = [...data];
  const namaOli = $('namaOliFilter').value.toLowerCase().trim();
  const vendorNama = $('vendorFilter').value.trim();
  const noSeri = $('noSeriFilter').value.toLowerCase().trim();
  const startDate = state.currentFilter.startDate;
  const endDate = state.currentFilter.endDate;

  if (namaOli) {
    filtered = filtered.filter(item =>
      (item.nama_oli || '').toLowerCase().includes(namaOli)
    );
  }

  if (noSeri) {
    filtered = filtered.filter(item =>
      (item.no_seri || '').toLowerCase().includes(noSeri)
    );
  }

  // PERBAIKAN: Definisikan vendorId dengan benar
  if (vendorNama) {
    const vendorId = state.vendorNameToId[vendorNama];
    if (vendorId) {
      filtered = filtered.filter(item => item.id_vendor === vendorId);
    }
  }

  if (startDate && endDate) {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.tanggal_masuk);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return itemDate >= start && itemDate <= end;
    });
  }

  state.currentFilter.namaOli = $('namaOliFilter').value || '';
  state.currentFilter.noSeri = $('noSeriFilter').value || '';
  state.currentFilter.vendor = vendorNama ? state.vendorNameToId[vendorNama] : '';
  state.currentFilter.vendorNama = vendorNama;

  return filtered;
},

  async loadData(tipe) {
    try {
      const filterType = $('filterType').value;
      const dateRange = utils.getDateRange(
        filterType,
        $('filterStart').value,
        $('filterEnd').value
      );

      let url = '';
      const params = new URLSearchParams();

      if (tipe === 'oli_masuk') {
        if (!dateRange.start || !dateRange.end) {
          alert('Harap isi tanggal untuk filter!');
          return;
        }

        params.append('start', dateRange.start);
        params.append('end', dateRange.end);

        const vendorNama = $('vendorFilter').value.trim();
        const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
        const namaOli = $('namaOliFilter').value || '';
        const noSeri = $('noSeriFilter').value || '';

        if (vendorId) params.append('vendor', vendorId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          vendor: vendorId,
          vendorNama: vendorNama,
          namaOli,
          noSeri,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterType,
          tipe: 'oli_masuk'
        };

        url = `/rekap/oli_masuk?${params.toString()}`;
      } 
      else if (tipe === 'oli_tersedia') {
        if (filterType === 'manual' && (!dateRange.start || !dateRange.end)) {
          alert('Harap isi tanggal untuk filter manual!');
          return;
        }

        const vendorNama = $('vendorFilter').value.trim();
        const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
        const namaOli = $('namaOliFilter').value || '';
        const noSeri = $('noSeriFilter').value || '';

        if (vendorId) params.append('vendor', vendorId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          vendor: vendorId,
          vendorNama: vendorNama,
          namaOli,
          noSeri,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterType,
          tipe: 'oli_tersedia'
        };

        url = `/rekap/oli_tersedia${params.toString() ? '?' + params.toString() : ''}`;
      }
      else if (tipe === 'pemakaian_oli') {
        if (!dateRange.start || !dateRange.end) {
          alert('Harap isi tanggal untuk filter!');
          return;
        }

        params.append('start', dateRange.start);
        params.append('end', dateRange.end);

        const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
        const namaOli = $('namaOliFilter').value || '';
        const vendorNama = $('vendorFilter').value.trim();
        const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
        const noSeri = $('noSeriFilter').value || '';

        if (kendaraanId) params.append('kendaraan', kendaraanId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (vendorId) params.append('vendor', vendorId);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          kendaraan: kendaraanId,
          kendaraanLabel: $('kendaraanFilter').value || '',
          namaOli,
          noSeri,
          vendor: vendorId,
          vendorNama: vendorNama,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterType,
          tipe: 'pemakaian_oli'
        };

        url = `/rekap/pemakaian_oli?${params.toString()}`;
      }
      else if (tipe === 'pemakaian_per_bon') {
        // Two separate date filters: Masuk (tanggal masuk oli) and Pemakaian (tanggal pemakaian)
        const masukType = $('filterMasukType').value;
        const pemakaianType = $('filterPemakaianType').value;

        const masukRange = utils.getDateRange(masukType, $('filterMasukStart').value, $('filterMasukEnd').value);
        const pemakaianRange = utils.getDateRange(pemakaianType, $('filterPemakaianStart').value, $('filterPemakaianEnd').value);

        if (masukType === 'manual' && (!masukRange.start || !masukRange.end)) {
          alert('Harap isi tanggal untuk filter Tanggal Masuk!');
          return;
        }
        if (pemakaianType === 'manual' && (!pemakaianRange.start || !pemakaianRange.end)) {
          alert('Harap isi tanggal untuk filter Tanggal Pemakaian!');
          return;
        }

        if (masukRange.start && masukRange.end) {
          params.append('masuk_start', masukRange.start);
          params.append('masuk_end', masukRange.end);
        }
        if (pemakaianRange.start && pemakaianRange.end) {
          params.append('pemakaian_start', pemakaianRange.start);
          params.append('pemakaian_end', pemakaianRange.end);
        }

        const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
        const namaOli = $('namaOliFilter').value || '';
        const vendorNama = $('vendorFilter').value.trim();
        const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
        const noSeri = $('noSeriFilter').value || '';

        if (kendaraanId) params.append('kendaraan', kendaraanId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (vendorId) params.append('vendor', vendorId);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          kendaraan: kendaraanId,
          kendaraanLabel: $('kendaraanFilter').value || '',
          namaOli,
          noSeri,
          vendor: vendorId,
          vendorNama: vendorNama,
          masukStart: masukRange.start || '',
          masukEnd: masukRange.end || '',
          masukFilterType: masukType,
          pemakaianStart: pemakaianRange.start || '',
          pemakaianEnd: pemakaianRange.end || '',
          pemakaianFilterType: pemakaianType,
          tipe: 'pemakaian_per_bon'
        };

        url = `/rekap/pemakaian_per_bon?${params.toString()}`;
      }

      ui.showLoading(tipe);
      const data = await api.fetch(url);
      state.allData = data;

      if (tipe === 'oli_tersedia') {
        await this.loadPemakaianTotals();
        this.buildOliLamaStokMap(data);
      }

      this.renderTable(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
    }
  },

  async loadPemakaianTotals() {
    try {
      const params = new URLSearchParams();
      if (state.currentFilter?.namaOli) {
        params.append('nama_oli', state.currentFilter.namaOli);
      }
      
      const pemakaianList = await api.fetchPemakaian(params.toString());
      const totals = {};
      
      (pemakaianList || []).forEach(p => {
        const namaKey = (p.nama_oli || '').toString().toLowerCase().trim();
        const qty = utils.parseQty(p.jumlah_pakai || 0);
        totals[namaKey] = (totals[namaKey] || 0) + qty;
      });
      
      state.pemakaianTotals = totals;
    } catch (err) {
      console.warn('Gagal ambil pemakaian, lanjut tanpa totals:', err);
      state.pemakaianTotals = {};
    }
  },

  buildOliLamaStokMap(data) {
    state.oliLamaStokMap = {};
    data.forEach(item => {
      if (item.id) {
        const stokTersisa = utils.parseQty(item.total_stok || 0);
        state.oliLamaStokMap[item.id] = stokTersisa;
      }
    });
  },

  renderTable(data) {
    const tipe = $('tipeLaporan').value;
    let filtered = tipe === 'oli_tersedia' ? this.applyClientFilters(data) : data;

    state.currentData = filtered;
    const tbody = $('rekapTable').querySelector('tbody');
    tbody.innerHTML = '';

    if (!filtered || filtered.length === 0) {
      ui.showEmpty(tipe);
      this.updateSummary();
      return;
    }

    const totalMergedMap = {};
    filtered.forEach(row => {
      if (row.id_oli_baru && row.id_oli_baru !== null) {
        totalMergedMap[row.id_oli_baru] = (totalMergedMap[row.id_oli_baru] || 0) + utils.parseQty(row.total_stok || 0);
      }
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = this.getRowHTML(tipe, row, idx, totalMergedMap);
      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
    this.updateSummary();
  },

  getRowHTML(tipe, row, idx, totalMergedMap = {}) {
    const templates = {
      oli_masuk: () => {
        const jumlah = utils.parseQty(row.jumlah_baru);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return `
          <td>${idx + 1}</td>
          <td>${utils.formatDate(row.tanggal_masuk)}</td>
          <td style="text-align: left;">${row.nama_oli || ''}</td>
          <td>${row.no_seri || '-'}</td>
          <td>${jumlah.toFixed(2)}</td>
          <td>${utils.formatCurrency(hargaSatuan)}</td>
          <td>${utils.formatCurrency(total)}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
        `;
      },

      oli_tersedia: () => {
        let sisaLama = utils.parseQty(row.sisa_lama || 0);

        if (row.id_oli_lama && row.id_oli_lama !== null) {
          const stokOliLama = state.oliLamaStokMap[row.id_oli_lama] || 0;
          sisaLama = Math.max(0, sisaLama - stokOliLama);
        }

        const baruMasuk = utils.parseQty(row.jumlah_baru || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = row.id_oli_baru && row.id_oli_baru !== null ? 0 : Math.max(0, total - dipakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;

        const statusGabungan = sisaLama > 0
          ? `<span class="badge badge-gabungan">Gabungan dari ${row.no_seri_lama || 'Literan lama'}</span>`
          : `<span class="badge badge-murni">Literan Baru Murni</span>`;

        let statusDigabungKe = '-';
        if (row.id_oli_baru && row.id_oli_baru !== null) {
          const oliBaruData = state.allData.find(item => item.id === row.id_oli_baru);
          const noSeriBaru = oliBaruData ? oliBaruData.no_seri : 'N/A';
          const literDigabung = utils.parseQty(oliBaruData ? oliBaruData.sisa_lama || 0 : 0);
          statusDigabungKe = `<span class="badge badge-digabung-ke">Digabung ke ${noSeriBaru}<br>(${literDigabung.toFixed(2)} L)</span>`;
        }

        return `
          <td>${idx + 1}</td>
          <td>${utils.formatDate(row.tanggal_masuk)}</td>
          <td style="text-align: left;">${row.nama_oli || ''}</td>
          <td>${row.no_seri || '-'}</td>
          <td>${sisaLama.toFixed(2)}</td>
          <td>${baruMasuk.toFixed(2)}</td>
          <td><strong>${total.toFixed(2)}</strong></td>
          <td style="color: #dc3545;">${dipakai.toFixed(2)}</td>
          <td style="color: #28a745;"><strong>${sisaAkhir.toFixed(2)}</strong></td>
          <td>${utils.formatCurrency(hargaSatuan)}</td>
          <td>${utils.formatCurrency(totalHarga)}</td>
          <td>${statusGabungan}</td>
          <td>${statusDigabungKe}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
        `;
      },

      pemakaian_oli: () => {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return `
          <td>${idx + 1}</td>
          <td>${utils.formatDate(row.tanggal_pakai)}</td>
          <td style="text-align: left;">${row.nama_oli || ''}</td>
          <td>${row.no_seri || '-'}</td>
          <td style="text-align: left;">${row.kendaraan || '-'}</td>
          <td>${jumlah.toFixed(2)}</td>
          <td>${utils.formatCurrency(hargaSatuan)}</td>
          <td>${utils.formatCurrency(total)}</td>
          <td style="text-align: left;">${row.keterangan || '-'}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
        `;
      },

     pemakaian_per_bon: () => {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return `
          <td>${idx + 1}</td>
          <td>${utils.formatDate(row.tanggal_masuk)}</td>
          <td>${row.no_seri || '-'}</td>
          <td style="text-align: left;">${row.nama_oli || ''}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
          <td style="text-align: left;">${row.kendaraan || '-'}</td>
          <td>${jumlah.toFixed(2)}</td>
          <td>${utils.formatCurrency(hargaSatuan)}</td>
          <td>${utils.formatCurrency(total)}</td>
          <td style="text-align: left;">${row.keterangan || '-'}</td>
          <td>${utils.formatDate(row.tanggal_pemakaian)}</td>
        `;
      }
    };

    return templates[tipe]();
  },

  calculateSummary() {
    const tipe = $('tipeLaporan').value;
    let totalLiter = 0;
    let totalCost = 0;

    state.currentData.forEach(row => {
      if (tipe === 'oli_masuk') {
        const jumlah = utils.parseQty(row.jumlah_baru);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        totalLiter += jumlah;
        totalCost += jumlah * hargaSatuan;
      } 
      else if (tipe === 'oli_tersedia') {
        let sisaLama = utils.parseQty(row.sisa_lama || 0);

        if (row.id_oli_lama && row.id_oli_lama !== null) {
          const stokOliLama = state.oliLamaStokMap[row.id_oli_lama] || 0;
          sisaLama = Math.max(0, sisaLama - stokOliLama);
        }

        const baruMasuk = utils.parseQty(row.jumlah_baru || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = row.id_oli_baru && row.id_oli_baru !== null ? 0 : Math.max(0, total - dipakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);

        totalLiter += sisaAkhir;
        totalCost += sisaAkhir * hargaSatuan;
      }
      else if (tipe === 'pemakaian_oli') {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        totalLiter += jumlah;
        totalCost += jumlah * hargaSatuan;
      }
      else if (tipe === 'pemakaian_per_bon') {
      const jumlah = utils.parseQty(row.jumlah_pakai);
      const hargaSatuan = utils.parseQty(row.harga || 0);
      totalLiter += jumlah;
      totalCost += jumlah * hargaSatuan;
    }
    });

    return { totalLiter, totalCost };
  },

  updateSummary() {
    const summary = this.calculateSummary();
    $('summary').innerHTML = `
      <strong>Total Literan:</strong> ${utils.formatNumber(summary.totalLiter)} L<br>
      <strong>Grand Total:</strong> ${utils.formatCurrency(summary.totalCost)}
    `;
  }
};

// ========================================
// LOAD INITIAL DATA
// ========================================
async function loadInitialData(tipe) {
  ui.resetSummary();
  ui.showLoading(tipe);

  try {
    const todayISO = utils.formatDateISO(new Date());
    let url = '';

    if (tipe === 'oli_masuk') {
      const params = new URLSearchParams();
      params.append('start', todayISO);
      params.append('end', todayISO);

      url = `/rekap/oli_masuk?${params.toString()}`;
      state.currentFilter = {
        vendor: '',
        vendorNama: '',
        namaOli: '',
        noSeri: '',
        startDate: todayISO,
        endDate: todayISO,
        filterType: 'hari',
        tipe: 'oli_masuk'
      };
    } 
    else if (tipe === 'oli_tersedia') {
      url = '/rekap/oli_tersedia';
      state.currentFilter = {
        vendor: '',
        vendorNama: '',
        namaOli: '',
        noSeri: '',
        startDate: '',
        endDate: '',
        filterType: 'semua',
        tipe: 'oli_tersedia'
      };
    } 
    else if (tipe === 'pemakaian_oli') {
      const params = new URLSearchParams();
      params.append('start', todayISO);
      params.append('end', todayISO);

      url = `/rekap/pemakaian_oli?${params.toString()}`;
      state.currentFilter = {
        kendaraan: '',
        kendaraanLabel: '',
        namaOli: '',
        noSeri: '',
        startDate: todayISO,
        endDate: todayISO,
        filterType: 'hari',
        tipe: 'pemakaian_oli'
      };
    }
    else if (tipe === 'pemakaian_per_bon') {
      const params = new URLSearchParams();
      // Default to today's Masuk and Pemakaian ranges (hari)
      params.append('masuk_start', todayISO);
      params.append('masuk_end', todayISO);
      params.append('pemakaian_start', todayISO);
      params.append('pemakaian_end', todayISO);

      url = `/rekap/pemakaian_per_bon?${params.toString()}`;
      state.currentFilter = {
        kendaraan: '',
        kendaraanLabel: '',
        namaOli: '',
        noSeri: '',
        masukStart: todayISO,
        masukEnd: todayISO,
        masukFilterType: 'hari',
        pemakaianStart: todayISO,
        pemakaianEnd: todayISO,
        pemakaianFilterType: 'hari',
        tipe: 'pemakaian_per_bon'
      };
    }

    const data = await api.fetch(url);
    state.allData = data;

    if (tipe === 'oli_tersedia') {
      await dataHandler.loadPemakaianTotals();
      dataHandler.buildOliLamaStokMap(data);
    }

    dataHandler.renderTable(data);
  } catch (error) {
    console.error('Error loading initial data:', error);
    ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data: ' + (error.message || error));
  }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
const exporter = {
  buildFilterInfo() {
    const tipe = $('tipeLaporan').value;
    const filters = [];

    // Periode
    if (tipe === 'oli_masuk' || tipe === 'pemakaian_oli') {
      filters.push([
        'Periode',
        CONFIG.filterLabels[state.currentFilter.filterType] || state.currentFilter.filterType || 'Semua Data'
      ]);
      
      if (state.currentFilter.startDate && state.currentFilter.endDate) {
        filters.push([
          'Tanggal',
          state.currentFilter.startDate === state.currentFilter.endDate
            ? utils.formatDate(state.currentFilter.startDate)
            : `${utils.formatDate(state.currentFilter.startDate)} s/d ${utils.formatDate(state.currentFilter.endDate)}`
        ]);
      }
    } else if (tipe === 'oli_tersedia') {
      if (state.currentFilter.startDate && state.currentFilter.endDate) {
        filters.push([
          'Periode Tanggal Masuk',
          state.currentFilter.startDate === state.currentFilter.endDate
            ? utils.formatDate(state.currentFilter.startDate)
            : `${utils.formatDate(state.currentFilter.startDate)} s/d ${utils.formatDate(state.currentFilter.endDate)}`
        ]);
      } else {
        filters.push(['Periode', 'Semua Data']);
      }
    }

    // Pemakaian per bon: show both Masuk & Pemakaian filters if present
    if (tipe === 'pemakaian_per_bon') {
      if (state.currentFilter.masukFilterType) {
        filters.push(['Periode Tanggal Masuk', CONFIG.filterLabels[state.currentFilter.masukFilterType]]);
        if (state.currentFilter.masukStart && state.currentFilter.masukEnd) {
          filters.push(['Tanggal Masuk', state.currentFilter.masukStart === state.currentFilter.masukEnd ? utils.formatDate(state.currentFilter.masukStart) : `${utils.formatDate(state.currentFilter.masukStart)} s/d ${utils.formatDate(state.currentFilter.masukEnd)}`]);
        }
      }
      if (state.currentFilter.pemakaianFilterType) {
        filters.push(['Periode Tanggal Pemakaian', CONFIG.filterLabels[state.currentFilter.pemakaianFilterType]]);
        if (state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd) {
          filters.push(['Tanggal Pemakaian', state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? utils.formatDate(state.currentFilter.pemakaianStart) : `${utils.formatDate(state.currentFilter.pemakaianStart)} s/d ${utils.formatDate(state.currentFilter.pemakaianEnd)}`]);
        }
      }
    }

    // Vendor
    if (state.currentFilter.vendorNama) {
      filters.push(['Vendor', state.currentFilter.vendorNama]);
    }

    // Nama Oli
    if (state.currentFilter.namaOli) {
      filters.push(['Nama Literan', state.currentFilter.namaOli]);
    }

    // No Seri
    if (state.currentFilter.noSeri) {
      filters.push(['No Seri', state.currentFilter.noSeri]);
    }

    // Kendaraan (khusus pemakaian oli)
    if (tipe === 'pemakaian_oli' && state.currentFilter.kendaraanLabel) {
      filters.push(['Kendaraan', state.currentFilter.kendaraanLabel]);
    }

    // Jumlah Data
    filters.push(['Jumlah Data', `${state.currentData.length} record`]);

    return filters;
  },

  generateFileName(ext) {
    const tipe = $('tipeLaporan').value;
    const date = new Date().toISOString().split('T')[0];
    const parts = ['Rekap_Literan'];

    const typeNames = {
      oli_masuk: 'Masuk',
      oli_tersedia: 'Stok',
      pemakaian_oli: 'Pemakaian',
      pemakaian_per_bon: 'PemakaianPerBon'
    };

    parts.push(typeNames[tipe]);

    // Tambahkan filter periode (umum)
    if (state.currentFilter.startDate && state.currentFilter.endDate) {
      if (state.currentFilter.startDate === state.currentFilter.endDate) {
        parts.push(state.currentFilter.startDate);
      } else {
        parts.push(`${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
      }
    }

    // Tambahkan Masuk/Pemakaian ranges untuk pemakaian_per_bon
    if (tipe === 'pemakaian_per_bon') {
      if (state.currentFilter.masukStart && state.currentFilter.masukEnd) {
        parts.push(state.currentFilter.masukStart === state.currentFilter.masukEnd ? `Masuk_${state.currentFilter.masukStart}` : `Masuk_${state.currentFilter.masukStart}_sd_${state.currentFilter.masukEnd}`);
      }
      if (state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd) {
        parts.push(state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? `Pemakaian_${state.currentFilter.pemakaianStart}` : `Pemakaian_${state.currentFilter.pemakaianStart}_sd_${state.currentFilter.pemakaianEnd}`);
      }
    }

    // Tambahkan nama oli jika ada
    if (state.currentFilter.namaOli) {
      const cleanName = state.currentFilter.namaOli.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      parts.push(cleanName);
    }

    // Tambahkan vendor jika ada
    if (state.currentFilter.vendorNama) {
      const cleanVendor = state.currentFilter.vendorNama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      parts.push(cleanVendor);
    }

    return `${parts.join('_')}.${ext}`;
  },

  toExcel() {
    if (!state.currentData.length) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const tipe = $('tipeLaporan').value;
    const wsData = [];

    // ===== HEADER =====
    wsData.push([CONFIG.titles[tipe]]);
    wsData.push([`Tanggal Export: ${utils.formatDate(new Date())}`]);
    wsData.push([]);

    // ===== FILTER INFO =====
    const filterInfo = this.buildFilterInfo();
    if (filterInfo.length > 0) {
      wsData.push(['INFORMASI FILTER:']);
      filterInfo.forEach(([label, value]) => {
        wsData.push([`${label}:`, value]);
      });
      wsData.push([]);
    }

    // ===== HEADER TABEL =====
    wsData.push(CONFIG.headers[tipe]);

    // ===== DATA ROWS =====
    state.currentData.forEach((row, idx) => {
      if (tipe === 'oli_masuk') {
        const jumlah = utils.parseQty(row.jumlah_baru);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        wsData.push([
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli || '',
          row.no_seri || '-',
          jumlah,
          hargaSatuan,
          total,
          row.nama_vendor || '-'
        ]);
      } 
      else if (tipe === 'oli_tersedia') {
        let sisaLama = utils.parseQty(row.sisa_lama || 0);

        if (row.id_oli_lama && row.id_oli_lama !== null) {
          const stokOliLama = state.oliLamaStokMap[row.id_oli_lama] || 0;
          sisaLama = Math.max(0, sisaLama - stokOliLama);
        }

        const baruMasuk = utils.parseQty(row.jumlah_baru || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = row.id_oli_baru && row.id_oli_baru !== null ? 0 : Math.max(0, total - dipakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;
        const status = sisaLama > 0
          ? `Gabungan dari ${row.no_seri_lama || 'literan lama'}`
          : 'Literan Baru Murni';

        let statusDigabungKe = '-';
        if (row.id_oli_baru && row.id_oli_baru !== null) {
          const oliBaruData = state.allData.find(item => item.id === row.id_oli_baru);
          const noSeriBaru = oliBaruData ? oliBaruData.no_seri : 'N/A';
          const literDigabung = utils.parseQty(oliBaruData ? oliBaruData.sisa_lama || 0 : 0);
          statusDigabungKe = `Digabung ke ${noSeriBaru} (${literDigabung.toFixed(2)} L)`;
        }

        wsData.push([
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli || '',
          row.no_seri || '-',
          sisaLama,
          baruMasuk,
          total,
          dipakai,
          sisaAkhir,
          hargaSatuan,
          totalHarga,
          status,
          statusDigabungKe,
          row.nama_vendor || '-'
        ]);
      } 
      else if (tipe === 'pemakaian_oli') {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        wsData.push([
          idx + 1,
          utils.formatDate(row.tanggal_pakai),
          row.nama_oli || '',
          row.no_seri || '-',
          row.kendaraan || '-',
          jumlah,
          hargaSatuan,
          total,
          row.keterangan || '-',
          row.nama_vendor || '-'
        ]);
      }
      else if (tipe === 'pemakaian_per_bon') {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        wsData.push([
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.no_seri || '-',
          row.nama_oli || '',
          row.nama_vendor || '-',
          row.kendaraan || '-',
          jumlah,
          hargaSatuan,
          total,
          row.keterangan || '-',
          utils.formatDate(row.tanggal_pemakaian)
        ]);
      }
    });

    // ===== SUMMARY =====
    const summary = dataHandler.calculateSummary();
    wsData.push([]);
    wsData.push(['RINGKASAN:']);
    wsData.push([]);

    const summaryLabels = {
      oli_masuk: 'Total Literan Masuk',
      oli_tersedia: 'Total Stok Tersedia',
      pemakaian_oli: 'Total Literan Terpakai',
      pemakaian_per_bon: 'Total Literan Terpakai'
    };

    wsData.push([`${summaryLabels[tipe]}:`, `${summary.totalLiter.toFixed(2)} Liter`]);
    wsData.push(['Grand Total:', utils.formatCurrency(summary.totalCost)]);

    // ===== GENERATE EXCEL =====
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const columnWidths = {
      oli_masuk: [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal
        { wch: 25 }, // Nama Literan
        { wch: 15 }, // No Seri
        { wch: 15 }, // Jumlah Masuk
        { wch: 15 }, // Harga Satuan
        { wch: 18 }, // Total
        { wch: 20 }  // Vendor
      ],
      oli_tersedia: [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal
        { wch: 25 }, // Nama Literan
        { wch: 15 }, // No Seri
        { wch: 12 }, // Sisa Lama
        { wch: 12 }, // Baru Masuk
        { wch: 12 }, // Total
        { wch: 12 }, // Dipakai
        { wch: 12 }, // Sisa Akhir
        { wch: 15 }, // Harga Satuan
        { wch: 18 }, // Total
        { wch: 30 }, // Status Gabungan
        { wch: 30 }, // Digabung Ke
        { wch: 20 }  // Vendor
      ],
      pemakaian_oli: [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal
        { wch: 25 }, // Nama Literan
        { wch: 15 }, // No Seri
        { wch: 25 }, // Kendaraan
        { wch: 12 }, // Jumlah
        { wch: 15 }, // Harga Satuan
        { wch: 18 }, // Total
        { wch: 30 }, // Keterangan
        { wch: 20 }  // Vendor
      ],
      pemakaian_per_bon: [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal Masuk
        { wch: 15 }, // No Seri
        { wch: 25 }, // Nama Literan
        { wch: 20 }, // Vendor
        { wch: 25 }, // Kendaraan
        { wch: 12 }, // Jumlah
        { wch: 15 }, // Harga Satuan
        { wch: 18 }, // Total
        { wch: 30 }, // Keterangan
        { wch: 15 }  // Tanggal Pemakaian
      ]
    };
    ws['!cols'] = columnWidths[tipe];

    // Styling untuk header
    const headerRowIndex = filterInfo.length > 0 ? filterInfo.length + 4 : 3;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + (headerRowIndex + 1);
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F8F9FA" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Literan');
    XLSX.writeFile(wb, this.generateFileName('xlsx'));
  },

  toPDF() {
    if (!state.currentData.length) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const { jsPDF } = window.jspdf;
    const tipe = $('tipeLaporan').value;
    
    // Gunakan landscape untuk semua tipe karena kolom banyak
    const doc = new jsPDF('l', 'mm', 'a4');
    let yPos = 15;

    // ===== HEADER =====
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(CONFIG.titles[tipe], 14, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Tanggal Export: ${utils.formatDate(new Date())}`, 14, yPos);
    yPos += 10;

    // ===== FILTER INFO =====
    const filterInfo = this.buildFilterInfo();
    if (filterInfo.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('INFORMASI FILTER:', 14, yPos);
      yPos += 5;

      doc.setFont(undefined, 'normal');
      filterInfo.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 14, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    // ===== TABLE DATA =====
    const tableData = state.currentData.map((row, idx) => {
      if (tipe === 'oli_masuk') {
        const jumlah = utils.parseQty(row.jumlah_baru);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return [
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli || '',
          row.no_seri || '-',
          jumlah.toFixed(2),
          utils.formatCurrency(hargaSatuan),
          utils.formatCurrency(total),
          row.nama_vendor || '-'
        ];
      } 
      else if (tipe === 'oli_tersedia') {
        let sisaLama = utils.parseQty(row.sisa_lama || 0);

        if (row.id_oli_lama && row.id_oli_lama !== null) {
          const stokOliLama = state.oliLamaStokMap[row.id_oli_lama] || 0;
          sisaLama = Math.max(0, sisaLama - stokOliLama);
        }

        const baruMasuk = utils.parseQty(row.jumlah_baru || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = row.id_oli_baru && row.id_oli_baru !== null ? 0 : Math.max(0, total - dipakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;
        const status = sisaLama > 0
          ? `Gabungan dari ${row.no_seri_lama || 'literan lama'}`
          : 'Literan Baru';

        let statusDigabungKe = '-';
        if (row.id_oli_baru && row.id_oli_baru !== null) {
          const oliBaruData = state.allData.find(item => item.id === row.id_oli_baru);
          const noSeriBaru = oliBaruData ? oliBaruData.no_seri : 'N/A';
          const literDigabung = utils.parseQty(oliBaruData ? oliBaruData.sisa_lama || 0 : 0);
          statusDigabungKe = `Ke ${noSeriBaru} (${literDigabung.toFixed(2)}L)`;
        }

        return [
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli || '',
          row.no_seri || '-',
          sisaLama.toFixed(2),
          baruMasuk.toFixed(2),
          total.toFixed(2),
          dipakai.toFixed(2),
          sisaAkhir.toFixed(2),
          utils.formatCurrency(hargaSatuan),
          utils.formatCurrency(totalHarga),
          status,
          statusDigabungKe,
          row.nama_vendor || '-'
        ];
      } 
      else if (tipe === 'pemakaian_oli') {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return [
          idx + 1,
          utils.formatDate(row.tanggal_pakai),
          row.nama_oli || '',
          row.no_seri || '-',
          row.kendaraan || '-',
          jumlah.toFixed(2),
          utils.formatCurrency(hargaSatuan),
          utils.formatCurrency(total),
          row.keterangan || '-',
          row.nama_vendor || '-'
        ];
      }
      else if (tipe === 'pemakaian_per_bon') {
        const jumlah = utils.parseQty(row.jumlah_pakai);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        return [
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.no_seri || '-',
          row.nama_oli || '',
          row.nama_vendor || '-',
          row.kendaraan || '-',
          jumlah.toFixed(2),
          utils.formatCurrency(hargaSatuan),
          utils.formatCurrency(total),
          row.keterangan || '-',
          utils.formatDate(row.tanggal_pemakaian)
        ];
      }
    });

    // Column Styles untuk masing-masing tipe
    const columnStyles = {
      oli_masuk: {
        0: { halign: 'center', cellWidth: 10 },  // No
        1: { halign: 'center', cellWidth: 22 },  // Tanggal
        2: { halign: 'left', cellWidth: 50 },    // Nama Literan
        3: { halign: 'center', cellWidth: 25 },  // No Seri
        4: { halign: 'right', cellWidth: 22 },   // Jumlah Masuk
        5: { halign: 'right', cellWidth: 30 },   // Harga Satuan
        6: { halign: 'right', cellWidth: 35 },   // Total
        7: { halign: 'left', cellWidth: 35 }     // Vendor
      },
      oli_tersedia: {
        0: { halign: 'center', cellWidth: 8 },   // No
        1: { halign: 'center', cellWidth: 18 },  // Tanggal
        2: { halign: 'left', cellWidth: 30 },    // Nama Literan
        3: { halign: 'center', cellWidth: 18 },  // No Seri
        4: { halign: 'right', cellWidth: 14 },   // Sisa Lama
        5: { halign: 'right', cellWidth: 14 },   // Baru Masuk
        6: { halign: 'right', cellWidth: 14 },   // Total
        7: { halign: 'right', cellWidth: 14 },   // Dipakai
        8: { halign: 'right', cellWidth: 14 },   // Sisa Akhir
        9: { halign: 'right', cellWidth: 20 },   // Harga Satuan
        10: { halign: 'right', cellWidth: 22 },  // Total Harga
        11: { halign: 'center', cellWidth: 28 }, // Status Gabungan
        12: { halign: 'center', cellWidth: 25 }, // Digabung Ke
        13: { halign: 'left', cellWidth: 25 }    // Vendor
      },
      pemakaian_oli: {
        0: { halign: 'center', cellWidth: 10 },  // No
        1: { halign: 'center', cellWidth: 22 },  // Tanggal
        2: { halign: 'left', cellWidth: 38 },    // Nama Literan
        3: { halign: 'center', cellWidth: 22 },  // No Seri
        4: { halign: 'left', cellWidth: 35 },    // Kendaraan
        5: { halign: 'right', cellWidth: 18 },   // Jumlah
        6: { halign: 'right', cellWidth: 28 },   // Harga Satuan
        7: { halign: 'right', cellWidth: 32 },   // Total
        8: { halign: 'left', cellWidth: 35 },    // Keterangan
        9: { halign: 'left', cellWidth: 30 }     // Vendor
      },
      pemakaian_per_bon: {
        0: { halign: 'center', cellWidth: 8 },   // No
        1: { halign: 'center', cellWidth: 22 },  // Tanggal Masuk
        2: { halign: 'center', cellWidth: 20 },  // No Seri
        3: { halign: 'left', cellWidth: 35 },    // Nama Literan
        4: { halign: 'left', cellWidth: 28 },    // Vendor
        5: { halign: 'left', cellWidth: 32 },    // Kendaraan
        6: { halign: 'right', cellWidth: 15 },   // Jumlah
        7: { halign: 'right', cellWidth: 25 },   // Harga Satuan
        8: { halign: 'right', cellWidth: 28 },   // Total
        9: { halign: 'left', cellWidth: 30 },    // Keterangan
        10: { halign: 'center', cellWidth: 22 }  // Tanggal Pemakaian
      }
    };

    // Generate table
    doc.autoTable({
      head: [CONFIG.headers[tipe]],
      body: tableData,
      startY: yPos,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [0, 0, 0],
        fillColor: false,           // pastikan background kosong
        opacity: 1                  // <=== ini kuncinya supaya hitamnya solid!
      },

      headStyles: {
        fillColor: [52, 58, 64],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: columnStyles[tipe],
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 14, right: 14 }
    });

    // ===== SUMMARY =====
    const summary = dataHandler.calculateSummary();
    let finalY = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (finalY > 180) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('RINGKASAN:', 14, finalY);

    finalY += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const summaryLabels = {
      oli_masuk: 'Total Literan Masuk',
      oli_tersedia: 'Total Stok Tersedia',
      pemakaian_oli: 'Total Literan Terpakai',
      pemakaian_per_bon: 'Total Literan Terpakai'
    };

    doc.text(`${summaryLabels[tipe]}: ${summary.totalLiter.toFixed(2)} Liter`, 14, finalY);
    finalY += 5;
    doc.text(`Grand Total: ${utils.formatCurrency(summary.totalCost)}`, 14, finalY);

    // Save PDF
    doc.save(this.generateFileName('pdf'));
  }
};

// ========================================
// EVENT LISTENERS
// ========================================
$('tipeLaporan').addEventListener('change', function() {
  const tipe = this.value;
  ui.toggleFilters(tipe);
  ui.updateHeaders(tipe);

  // Reset filters
  $('filterType').value = 'hari';
  $('filterStart').value = '';
  $('filterEnd').value = '';
  $('vendorFilter').value = '';
  $('kendaraanFilter').value = '';
  $('namaOliFilter').value = '';
  $('noSeriFilter').value = '';

  // Ensure date inputs visibility updated according to current tipe and selects
  $('filterType').dispatchEvent(new Event('change'));
  if ($('filterMasukType')) $('filterMasukType').dispatchEvent(new Event('change'));
  if ($('filterPemakaianType')) $('filterPemakaianType').dispatchEvent(new Event('change'));

  loadInitialData(tipe);
});

$('filterType').addEventListener('change', function() {
  const isManual = this.value === 'manual';
  const tipe = $('tipeLaporan').value;
  const showFor = ['oli_masuk','pemakaian_oli'];

  if (showFor.includes(tipe)) {
    $('filterStartGroup').classList.toggle('filter-hidden', !isManual);
    $('filterEndGroup').classList.toggle('filter-hidden', !isManual);
    $('filterStart').required = isManual;
    $('filterEnd').required = isManual;
  } else {
    // always hide when not applicable for current tipe
    $('filterStartGroup').classList.add('filter-hidden');
    $('filterEndGroup').classList.add('filter-hidden');
    $('filterStart').required = false;
    $('filterEnd').required = false;
  }
});

// Masuk date filter handler (Pemakaian Per Bon)
$('filterMasukType').addEventListener('change', function() {
  const isManual = this.value === 'manual';
  $('filterMasukStartGroup').classList.toggle('filter-hidden', !isManual);
  $('filterMasukEndGroup').classList.toggle('filter-hidden', !isManual);
  $('filterMasukStart').required = isManual;
  $('filterMasukEnd').required = isManual;
});

// Pemakaian date filter handler (Pemakaian Per Bon)
$('filterPemakaianType').addEventListener('change', function() {
  const isManual = this.value === 'manual';
  $('filterPemakaianStartGroup').classList.toggle('filter-hidden', !isManual);
  $('filterPemakaianEndGroup').classList.toggle('filter-hidden', !isManual);
  $('filterPemakaianStart').required = isManual;
  $('filterPemakaianEnd').required = isManual;
});

// Real-time search untuk oli_tersedia
['namaOliFilter', 'vendorFilter', 'noSeriFilter'].forEach(id => {
  $(id).addEventListener('input', function() {
    const tipe = $('tipeLaporan').value;
    if (tipe === 'oli_tersedia') {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(() => {
        dataHandler.renderTable(state.allData);
      }, 300);
    }
  });
});

$('filterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipe = $('tipeLaporan').value;

  if (tipe === 'oli_masuk' || tipe === 'pemakaian_oli') {
    const filterType = $('filterType').value;
    if (filterType === 'manual') {
      const startDate = $('filterStart').value;
      const endDate = $('filterEnd').value;
      if (!startDate || !endDate) {
        alert('Harap isi tanggal mulai dan tanggal akhir!');
        return;
      }
    }
  }

  ui.resetSummary();
  ui.showLoading(tipe);
  await dataHandler.loadData(tipe);
});

$('resetFilter').addEventListener('click', () => {
  const tipe = $('tipeLaporan').value;

  $('filterType').value = 'hari';
  $('filterStart').value = '';
  $('filterEnd').value = '';
  $('vendorFilter').value = '';
  $('kendaraanFilter').value = '';
  $('namaOliFilter').value = '';
  $('noSeriFilter').value = '';

  // reset pemakaian per bon controls
  $('filterMasukType').value = 'hari';
  $('filterMasukStart').value = '';
  $('filterMasukEnd').value = '';
  $('filterMasukStartGroup').classList.add('filter-hidden');
  $('filterMasukEndGroup').classList.add('filter-hidden');

  $('filterPemakaianType').value = 'hari';
  $('filterPemakaianStart').value = '';
  $('filterPemakaianEnd').value = '';
  $('filterPemakaianStartGroup').classList.add('filter-hidden');
  $('filterPemakaianEndGroup').classList.add('filter-hidden');

  $('filterStartGroup').classList.add('filter-hidden');
  $('filterEndGroup').classList.add('filter-hidden');

  loadInitialData(tipe);
});

$('exportExcel').addEventListener('click', () => exporter.toExcel());
$('exportPDF').addEventListener('click', () => exporter.toPDF());

// ========================================
// INITIALIZATION
// ========================================
(async function init() {
  // Add custom styles
  const style = document.createElement('style');
  style.textContent = `
    .badge-digabung-ke {
      background-color: #ff9800;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: normal;
      display: inline-block;
      line-height: 1.4;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  await Promise.all([api.loadOliList(), api.loadFilters()]);
  $('filterType').dispatchEvent(new Event('change'));
  // init pemakaian-per-bon controls
  $('filterMasukType').dispatchEvent(new Event('change'));
  $('filterPemakaianType').dispatchEvent(new Event('change'));
  const initialTipe = $('tipeLaporan').value;
  $('filterType').value = 'hari';
  await loadInitialData(initialTipe);
})();