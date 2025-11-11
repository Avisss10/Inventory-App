// ========================================
// KONFIGURASI & KONSTANTA
// ========================================
const API_BASE_URL = 'http://localhost:3000';

const CONFIG = {
  columnCounts: {
    oli_masuk: 8,
    oli_tersedia: 14,
    pemakaian_oli: 10
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
    ]
  },
  titles: {
    oli_masuk: 'REKAP LITERAN MASUK (TANPA GABUNGAN)',
    oli_tersedia: 'REKAP LITERAN TERSEDIA (STOK)',
    pemakaian_oli: 'REKAP PEMAKAIAN LITERAN'
  },
  filterLabels: {
    hari: 'Hari Ini',
    minggu: '7 Hari Terakhir',
    bulan: 'Bulan Ini',
    manual: 'Tanggal Manual'
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
    return rounded % 1 === 0 
      ? rounded.toLocaleString('id-ID')
      : rounded.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

      // Load vendors
      const vendorOptions = vendors.map(v => {
        state.vendorNameToId[v.nama_vendor] = v.id;
        state.vendorMap[v.id] = v.nama_vendor;
        return `<option value="${v.id}" data-name="${v.nama_vendor}">${v.nama_vendor}</option>`;
      });

      $('vendorFilter').innerHTML = `
        <option value="">Semua Vendor</option>
        ${vendorOptions.join('')}
      `;

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
    const vendorId = $('vendorFilter').value;
    const startDate = state.currentFilter.startDate;
    const endDate = state.currentFilter.endDate;

    if (namaOli) {
      filtered = filtered.filter(item =>
        (item.nama_oli || '').toLowerCase().includes(namaOli)
      );
    }

    if (vendorId) {
      filtered = filtered.filter(item => item.id_vendor === parseInt(vendorId));
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
    state.currentFilter.vendor = vendorId;
    state.currentFilter.vendorNama = vendorId
      ? $('vendorFilter').options[$('vendorFilter').selectedIndex].text
      : '';

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

        const vendorId = $('vendorFilter').value;
        const namaOli = $('namaOliFilter').value || '';
        const noSeri = $('noSeriFilter').value || '';

        if (vendorId) params.append('vendor', vendorId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          vendor: vendorId,
          vendorNama: vendorId
            ? $('vendorFilter').options[$('vendorFilter').selectedIndex].text
            : '',
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

        const vendorId = $('vendorFilter').value;
        const namaOli = $('namaOliFilter').value || '';
        const noSeri = $('noSeriFilter').value || '';

        if (vendorId) params.append('vendor', vendorId);
        if (namaOli) params.append('nama_oli', namaOli);
        if (noSeri) params.append('no_seri', noSeri);

        state.currentFilter = {
          vendor: vendorId,
          vendorNama: vendorId
            ? $('vendorFilter').options[$('vendorFilter').selectedIndex].text
            : '',
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
        const vendorId = $('vendorFilter').value;
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
          vendorNama: vendorId
            ? $('vendorFilter').options[$('vendorFilter').selectedIndex].text
            : '',
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterType,
          tipe: 'pemakaian_oli'
        };

        url = `/rekap/pemakaian_oli?${params.toString()}`;
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

    // Calculate total merged liters for each new literan
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

        const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = total - dipakai;
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;

        // Status Gabungan (Digabung Dari)
        const statusGabungan = sisaLama > 0
          ? `<span class="badge badge-gabungan">Gabungan dari ${row.no_seri_lama || 'Literan lama'}</span>`
          : `<span class="badge badge-murni">Literan Baru Murni</span>`;

        // Status Digabung Ke
        let statusDigabungKe = '-';
        if (row.id_oli_baru && row.id_oli_baru !== null) {
          const oliBaruData = state.allData.find(item => item.id === row.id_oli_baru);
          const noSeriBaru = oliBaruData ? oliBaruData.no_seri : 'N/A';

          // Hitung berapa liter yang digabungkan (ambil dari sisa_lama di id_oli_baru)
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

        const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = total - dipakai;
        const hargaSatuan = utils.parseQty(row.harga || 0);
        
        totalLiter += (sisaLama + baruMasuk);
        totalCost += sisaAkhir * hargaSatuan;
      } 
      else if (tipe === 'pemakaian_oli') {
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
        startDate: todayISO,
        endDate: todayISO,
        filterType: 'hari',
        tipe: 'pemakaian_oli'
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

    if (state.currentFilter.namaOli) {
      filters.push(['Nama Oli', state.currentFilter.namaOli]);
    }
    if (state.currentFilter.vendorNama) {
      filters.push(['Vendor', state.currentFilter.vendorNama]);
    }

    if (tipe === 'oli_masuk' || tipe === 'pemakaian_oli') {
      filters.push([
        'Periode',
        CONFIG.filterLabels[state.currentFilter.filterType] || state.currentFilter.filterType || ''
      ]);
      
      if (state.currentFilter.startDate && state.currentFilter.endDate) {
        filters.push([
          'Tanggal',
          state.currentFilter.startDate === state.currentFilter.endDate
            ? state.currentFilter.startDate
            : `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`
        ]);
      }
    }

    if (tipe === 'pemakaian_oli' && state.currentFilter.kendaraanLabel) {
      filters.push(['Kendaraan', state.currentFilter.kendaraanLabel]);
    }

    return filters;
  },

  generateFileName(ext) {
    const tipe = $('tipeLaporan').value;
    const date = new Date().toISOString().split('T')[0];
    const parts = ['Rekap'];

    const typeNames = {
      oli_masuk: 'LiteranMasuk',
      oli_tersedia: 'LiteranTersedia',
      pemakaian_oli: 'PemakaianLiteran'
    };

    parts.push(typeNames[tipe]);

    if (state.currentFilter.namaOli) {
      parts.push(state.currentFilter.namaOli.replace(/\s+/g, '_'));
    }
    if (state.currentFilter.vendorNama) {
      parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
    }

    parts.push(date);
    return `${parts.join('_')}.${ext}`;
  },

  toExcel() {
    if (!state.currentData.length) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const tipe = $('tipeLaporan').value;
    const wsData = [];

    // Header
    wsData.push([CONFIG.titles[tipe]]);
    wsData.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
    wsData.push([]);
    wsData.push(['FILTER YANG DITERAPKAN:']);

    this.buildFilterInfo().forEach(([label, value]) => {
      wsData.push([`${label}: ${value}`]);
    });

    wsData.push([]);
    wsData.push(CONFIG.headers[tipe]);

    // Data Rows
    state.currentData.forEach((row, idx) => {
      if (tipe === 'oli_masuk') {
        const jumlah = utils.parseQty(row.jumlah_baru);
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const total = jumlah * hargaSatuan;
        
        wsData.push([
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli,
          row.no_seri || '-',
          jumlah.toFixed(2),
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

        const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = total - dipakai;
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;
        const status = sisaLama > 0
          ? `Gabungan dari ${row.no_seri_lama || 'oli lama'}`
          : 'Oli Baru Murni';

        // Status Digabung Ke untuk Excel
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
          row.nama_oli,
          row.no_seri || '-',
          sisaLama.toFixed(2),
          baruMasuk.toFixed(2),
          total.toFixed(2),
          dipakai.toFixed(2),
          sisaAkhir.toFixed(2),
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
          row.nama_oli,
          row.no_seri || '-',
          row.kendaraan || '-',
          jumlah.toFixed(2),
          hargaSatuan,
          total,
          row.keterangan || '-',
          row.nama_vendor || '-'
        ]);
      }
    });

    // Summary
    const summary = dataHandler.calculateSummary();
    wsData.push([]);
    wsData.push(['RINGKASAN:']);
    wsData.push([]);

    const summaryLabels = {
      oli_masuk: 'Total Literan Masuk',
      oli_tersedia: 'Total Stok Tersedia',
      pemakaian_oli: 'Total Literan Terpakai'
    };

    wsData.push([`${summaryLabels[tipe]}: ${summary.totalLiter.toFixed(2)} Liter`]);
    wsData.push([`Grand Total: ${utils.formatCurrency(summary.totalCost)}`]);

    // Generate Excel
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const columnWidths = {
      oli_masuk: [5, 15, 25, 15, 15, 18, 18, 30],
      oli_tersedia: [5, 15, 25, 15, 12, 12, 12, 12, 12, 18, 18, 30, 30, 30],
      pemakaian_oli: [5, 15, 25, 15, 20, 15, 18, 18, 30, 30]
    };
    ws['!cols'] = columnWidths[tipe].map(w => ({ wch: w }));

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
    const doc = new jsPDF('l', 'mm', 'a4');
    const tipe = $('tipeLaporan').value;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(CONFIG.titles[tipe], 14, 15);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    // Filters
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('FILTER YANG DITERAPKAN:', 14, 30);

    let yPos = 35;
    doc.setFont(undefined, 'normal');
    this.buildFilterInfo().forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, yPos);
      yPos += 5;
    });

    // Table Data
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
          jumlah.toFixed(2) + ' L',
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

        const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
        const total = sisaLama + baruMasuk;
        const dipakai = utils.parseQty(row.total_dipakai || 0);
        const sisaAkhir = total - dipakai;
        const hargaSatuan = utils.parseQty(row.harga || 0);
        const totalHarga = sisaAkhir * hargaSatuan;
        const status = sisaLama > 0
          ? `Gabungan dari ${row.no_seri_lama || 'oli lama'}`
          : 'Oli Baru Murni';

        // Status Digabung Ke untuk PDF
        let statusDigabungKe = '-';
        if (row.id_oli_baru && row.id_oli_baru !== null) {
          const oliBaruData = state.allData.find(item => item.id === row.id_oli_baru);
          const noSeriBaru = oliBaruData ? oliBaruData.no_seri : 'N/A';
          const literDigabung = utils.parseQty(row.total_stok || 0);
          statusDigabungKe = `Digabung ke ${noSeriBaru} (${literDigabung.toFixed(2)} L)`;
        }

        return [
          idx + 1,
          utils.formatDate(row.tanggal_masuk),
          row.nama_oli || '',
          row.no_seri || '-',
          sisaLama.toFixed(2) + ' L',
          baruMasuk.toFixed(2) + ' L',
          total.toFixed(2) + ' L',
          dipakai.toFixed(2) + ' L',
          sisaAkhir.toFixed(2) + ' L',
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
          jumlah.toFixed(2) + ' L',
          utils.formatCurrency(hargaSatuan),
          utils.formatCurrency(total),
          row.keterangan || '-',
          row.nama_vendor || '-'
        ];
      }
    });

    // Column Styles
    const columnStyles = {
      oli_masuk: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'left', cellWidth: 45 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 30 },
        6: { halign: 'right', cellWidth: 35 },
        7: { halign: 'left', cellWidth: 35 }
      },
      oli_tersedia: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 15 },
        6: { halign: 'right', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 15 },
        8: { halign: 'right', cellWidth: 15 },
        9: { halign: 'right', cellWidth: 22 },
        10: { halign: 'right', cellWidth: 25 },
        11: { halign: 'center', cellWidth: 30 },
        12: { halign: 'center', cellWidth: 30 },
        13: { halign: 'left', cellWidth: 30 }
      },
      pemakaian_oli: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'left', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'left', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 30 },
        7: { halign: 'right', cellWidth: 35 },
        8: { halign: 'left', cellWidth: 40 },
        9: { halign: 'left', cellWidth: 35 }
      }
    };

    doc.autoTable({
      head: [CONFIG.headers[tipe]],
      body: tableData,
      startY: yPos + 8,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        textColor: 0,
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      columnStyles: columnStyles[tipe],
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    // Summary
    const summary = dataHandler.calculateSummary();
    let finalY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('RINGKASAN:', 14, finalY);

    finalY += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const summaryLabels = {
      oli_masuk: 'Total Literan Masuk',
      oli_tersedia: 'Total Stok Tersedia',
      pemakaian_oli: 'Total Literan Terpakai'
    };

    doc.text(`${summaryLabels[tipe]}: ${summary.totalLiter.toFixed(2)} Liter`, 14, finalY);
    finalY += 6;
    doc.text(`Grand Total: ${utils.formatCurrency(summary.totalCost)}`, 14, finalY);

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

  loadInitialData(tipe);
});

$('filterType').addEventListener('change', function() {
  const isManual = this.value === 'manual';
  $('filterStartGroup').classList.toggle('filter-hidden', !isManual);
  $('filterEndGroup').classList.toggle('filter-hidden', !isManual);
  $('filterStart').required = isManual;
  $('filterEnd').required = isManual;
});

// Real-time search for oli_tersedia
['namaOliFilter', 'vendorFilter'].forEach(id => {
  $(id).addEventListener('input', function() {
    const tipe = $('tipeLaporan').value;
    if (tipe === 'oli_tersedia') {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(() => {
        dataHandler.renderTable(state.allData);
      }, 250);
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
  const initialTipe = $('tipeLaporan').value;
  $('filterType').value = 'hari';
  await loadInitialData(initialTipe);
})();