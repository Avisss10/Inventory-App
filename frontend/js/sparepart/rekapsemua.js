    const API_BASE_URL = 'http://localhost:3000';
    
    const CONFIG = {
      columnCounts: { stok: 9, kendaraan: 11, vendor: 8, pemakaian_vendor: 11 },
      headers: {
        stok: ['No', 'No Seri', 'Nama Sparepart', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total', 'Vendor', 'Tanggal'],
        kendaraan: ['No', 'Tanggal', 'Kendaraan', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total', 'Vendor', 'Penanggung Jawab', 'No Seri / Keterangan'],
        vendor: ['No', 'Tanggal', 'Vendor', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total'],
        pemakaian_vendor: ['No', 'Tanggal Masuk', 'No Seri', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total', 'Vendor', 'Kendaraan', 'Tanggal Pemakaian']
      },
      titles: {
        stok: 'REKAP STOK GUDANG',
        kendaraan: 'REKAP PEMAKAIAN KENDARAAN',
        vendor: 'REKAP TRANSAKSI VENDOR',
        pemakaian_vendor: 'REKAP PEMAKAIAN PER VENDOR'
      },
      filterLabels: {
        hari: 'Hari Ini',
        minggu: '7 Hari Terakhir',
        bulan: 'Bulan Ini',
        manual: 'Tanggal Manual'
      }
    };

    const state = {
      vendorMap: {},
      kendaraanMap: {},
      vendorNameToId: {},
      kendaraanLabelToId: {},
      currentData: [],
      allData: [],
      currentFilter: {},
      searchTimeout: null
    };

    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);

    // Utility Functions
    const utils = {
      parseQty: qty => parseFloat((qty || '').toString().replace(',', '.')) || 0,
      formatCurrency: val => `Rp ${val.toLocaleString('id-ID')}`,
      formatDate: date => date ? new Date(date).toLocaleDateString('id-ID') : '',
      capitalize: str => str.charAt(0).toUpperCase() + str.slice(1),
      
      getDateRange(filterType, startVal, endVal) {
        const today = new Date();
        let start, end;

        switch (filterType) {
          case 'hari':
            start = end = today.toISOString().split('T')[0];
            break;
          case 'minggu':
            end = today.toISOString().split('T')[0];
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 6);
            start = lastWeek.toISOString().split('T')[0];
            break;
          case 'bulan':
            start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
          case 'manual':
            start = startVal;
            end = endVal;
            break;
          default:
            start = end = today.toISOString().split('T')[0];
        }

        return { start, end };
      }
    };

    // API Functions
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

      async loadBarangList() {
        try {
          const barangs = await this.fetch('/sparepart');
          $('barangList').innerHTML = barangs.map(b => `<option value="${b.nama_sparepart}">`).join('');
        } catch (error) {
          console.error('Error loading sparepart list:', error);
        }
      },

      async loadFilters() {
        try {
          const [vendors, kendaraans] = await Promise.all([
            this.fetch('/vendor'),
            this.fetch('/kendaraan')
          ]);

          $('vendorFilter').innerHTML = `
            <option value="">Semua Vendor</option>
            ${vendors.map(v => {
              state.vendorNameToId[v.nama_vendor] = v.id;
              state.vendorMap[v.id] = v.nama_vendor;
              return `<option value="${v.nama_vendor}">${v.nama_vendor}</option>`;
            }).join('')}
          `;

          $('kendaraanFilterList').innerHTML = kendaraans.map(k => {
            const label = `${k.dt_mobil} - ${k.plat}`;
            state.kendaraanLabelToId[label] = k.id;
            state.kendaraanMap[k.id] = label;
            return `<option value="${label}">`;
          }).join('');
        } catch (error) {
          console.error('Error loading filters:', error);
        }
      }
    };

    // UI Functions
    const ui = {
      toggleFilters(tipe) {
        // Hide all filters first
        $$('.filter-stok, .filter-kendaraan, .filter-vendor, .filter-pemakaian_vendor').forEach(el => el.classList.add('filter-hidden'));
        // Show filters for the selected type
        $$(`.filter-${tipe}`).forEach(el => el.classList.remove('filter-hidden'));
        $('filterWaktuGroup').classList.remove('filter-hidden');
      },

      updateHeaders(tipe) {
        $('tableHead').innerHTML = `<tr>${CONFIG.headers[tipe].map(h => `<th>${h}</th>`).join('')}</tr>`;
      },

      showLowStockAlert(data) {
        const lowStock = data.filter(item => utils.parseQty(item.jumlah) === 0);
        const alert = $('lowStockAlert');
        
        if (lowStock.length > 0) {
          alert.classList.remove('filter-hidden');
          alert.innerHTML = `⚠️ Ada ${lowStock.length} item dengan stok habis.`;
        } else {
          alert.classList.add('filter-hidden');
        }
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
        $('summary').innerHTML = '<strong>Total Barang (Keseluruhan):</strong> 0<br><strong>Grand Total:</strong> Rp 0';
      }
    };

    // Data Functions
    const dataHandler = {
      applyFilters(data) {
        const tipe = $('tipeLaporan').value;
        let filtered = [...data];
        const searchTerm = $('barangFilter').value.toLowerCase();
        const stokFilter = $('stokFilter').value;
        const vendorNama = $('vendorFilter').value;
        const satuanFilter = $('satuanFilter').value;

        if (tipe === 'stok' && searchTerm) {
          filtered = filtered.filter(item =>
            (item.nama_sparepart || item.nama_barang || '').toLowerCase().includes(searchTerm)
          );
        }

        if (tipe === 'stok' && stokFilter === 'habis') {
          filtered = filtered.filter(item => utils.parseQty(item.jumlah) === 0);
        }

        if (vendorNama) {
          filtered = filtered.filter(item => item.nama_vendor === vendorNama);
        }

        if (satuanFilter !== 'semua') {
          filtered = filtered.filter(item => item.satuan === satuanFilter);
        }

        return filtered;
      },

      async loadData(tipe) {
        try {
          const dateRange = utils.getDateRange($('filterType').value, $('filterStart').value, $('filterEnd').value);
          let url = '';

          if (tipe === 'stok') {
            const vendorId = state.vendorNameToId[$('vendorFilter').value] || '';
            const barang = $('barangFilter').value;
            const satuan = $('satuanFilter').value;
            const dateParams = $('filterType').value !== 'hari' ? `&start=${dateRange.start}&end=${dateRange.end}` : '';
            
            url = `/rekap?type=stok&vendor=${vendorId}&barang=${barang}&satuan=${satuan}${dateParams}`;
            state.currentFilter = {
              vendor: vendorId,
              barang,
              vendorNama: $('vendorFilter').value,
              stokFilter: $('stokFilter').value,
              satuanFilter: satuan,
              startDate: $('filterType').value === 'hari' ? '' : dateRange.start,
              endDate: $('filterType').value === 'hari' ? '' : dateRange.end,
              filterType: $('filterType').value,
              tipe: 'stok'
            };
          } else if (tipe === 'kendaraan') {
            if (!dateRange.start || !dateRange.end) {
              alert('Harap isi tanggal untuk filter!');
              return;
            }

            const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
            const jenisBarang = $('jenisBarangFilter').value;
            const vendorId = state.vendorNameToId[$('vendorFilter').value] || '';
            
            url = `/rekap?type=kendaraan&start=${dateRange.start}&end=${dateRange.end}${kendaraanId ? `&kendaraan=${kendaraanId}` : ''}${jenisBarang !== 'semua' ? `&jenis_barang=${jenisBarang}` : ''}${vendorId ? `&vendor=${vendorId}` : ''}`;
            
            state.currentFilter = {
              kendaraan: kendaraanId,
              kendaraanLabel: $('kendaraanFilter').value,
              jenisBarang,
              vendor: vendorId,
              vendorNama: $('vendorFilter').value,
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: $('filterType').value,
              tipe: 'kendaraan'
            };
          } else if (tipe === 'vendor') {
            if (!dateRange.start || !dateRange.end) {
              alert('Harap isi tanggal untuk filter!');
              return;
            }

            const vendorId = state.vendorNameToId[$('vendorFilter').value] || '';
            const satuan = $('satuanFilter').value;
            
            url = `/rekap?type=vendor&vendor=${vendorId}&start=${dateRange.start}&end=${dateRange.end}&satuan=${satuan}`;
            
            state.currentFilter = {
              vendor: vendorId,
              vendorNama: $('vendorFilter').value,
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: $('filterType').value,
              satuanFilter: satuan,
              tipe: 'vendor'
            };
          } else if (tipe === 'pemakaian_vendor') {
            if (!dateRange.start || !dateRange.end) {
              alert('Harap isi tanggal untuk filter!');
              return;
            }

            const vendorId = state.vendorNameToId[$('vendorFilter').value] || '';
            const barang = $('barangFilter').value;
            const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
            
            url = `/pemakaian_vendor?start=${dateRange.start}&end=${dateRange.end}&vendor=${vendorId}&barang=${barang}&kendaraan=${kendaraanId}`;
            
            state.currentFilter = {
              vendor: vendorId,
              vendorNama: $('vendorFilter').value,
              barang,
              kendaraan: kendaraanId,
              kendaraanLabel: $('kendaraanFilter').value,
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: $('filterType').value,
              tipe: 'pemakaian_vendor'
            };
          }

          const data = await api.fetch(url);
          state.allData = data;
          this.renderTable(this.applyFilters(data));

          if (tipe === 'stok') {
            ui.showLowStockAlert(this.applyFilters(data));
          } else {
            $('lowStockAlert').classList.add('filter-hidden');
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
        }
      },

      renderTable(data) {
        state.currentData = data;
        const tipe = $('tipeLaporan').value;
        const tbody = $('rekapTable').querySelector('tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
          ui.showEmpty(tipe);
          this.updateSummary();
          return;
        }

        const fragment = document.createDocumentFragment();
        data.forEach((row, idx) => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;

          const tr = document.createElement('tr');
          if (tipe === 'stok' && qty === 0) tr.style.backgroundColor = '#fff3cd';
          tr.innerHTML = this.getRowHTML(tipe, row, idx, qty, price, total);
          fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);
        this.updateSummary();
      },

      getRowHTML(tipe, row, idx, qty, price, total) {
        const templates = {
          stok: () => `
            <td>${idx + 1}</td>
            <td>${row.no_seri || '-'}</td>
            <td style="text-align: left;">${row.nama_sparepart || row.nama_barang || ''}</td>
            <td>${qty}</td>
            <td>${row.satuan || ''}</td>
            <td style="text-align: right;">${utils.formatCurrency(price)}</td>
            <td style="text-align: right;">${utils.formatCurrency(total)}</td>
            <td style="text-align: left;">${row.nama_vendor || '-'}</td>
            <td>${utils.formatDate(row.tanggal)}</td>
          `,
          kendaraan: () => `
            <td>${idx + 1}</td>
            <td>${utils.formatDate(row.tanggal)}</td>
            <td style="text-align: left;">${row.kendaraan || '-'}</td>
            <td style="text-align: left;">${row.nama_sparepart || row.nama_barang || ''}</td>
            <td>${qty}</td>
            <td>${row.satuan || ''}</td>
            <td style="text-align: right;">${utils.formatCurrency(price)}</td>
            <td style="text-align: right;">${utils.formatCurrency(total)}</td>
            <td style="text-align: left;">${row.nama_vendor || '-'}</td>
            <td style="text-align: left;">${row.penanggung_jawab || '-'}</td>
            <td style="text-align: left;">${(row.nama_sparepart || '').startsWith('Ban ') ? (row.keterangan || '-') : (row.no_seri || '-')}</td>
          `,
          vendor: () => `
            <td>${idx + 1}</td>
            <td>${utils.formatDate(row.tanggal)}</td>
            <td style="text-align: left;">${row.nama_vendor || '-'}</td>
            <td style="text-align: left;">${row.nama_sparepart || row.nama_barang || ''}</td>
            <td>${qty}</td>
            <td>${row.satuan || ''}</td>
            <td style="text-align: right;">${utils.formatCurrency(price)}</td>
            <td style="text-align: right;">${utils.formatCurrency(total)}</td>
          `,
          pemakaian_vendor: () => `
            <td>${idx + 1}</td>
            <td>${utils.formatDate(row.tanggal_masuk)}</td>
            <td>${row.no_seri || '-'}</td>
            <td style="text-align: left;">${row.nama_sparepart || row.nama_barang || ''}</td>
            <td>${qty}</td>
            <td>${row.satuan || ''}</td>
            <td style="text-align: right;">${utils.formatCurrency(price)}</td>
            <td style="text-align: right;">${utils.formatCurrency(total)}</td>
            <td style="text-align: left;">${row.nama_vendor || '-'}</td>
            <td style="text-align: left;">${row.kendaraan || '-'}</td>
            <td>${utils.formatDate(row.tanggal_pemakaian)}</td>
          `
        };

        return templates[tipe]();
      },

      calculateSummary() {
        const satuanData = {};
        let totalQty = 0;
        let grandTotal = 0;

        state.currentData.forEach(row => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;
          const satuan = row.satuan || 'unknown';

          if (!satuanData[satuan]) {
            satuanData[satuan] = { qty: 0, value: 0 };
          }

          satuanData[satuan].qty += qty;
          satuanData[satuan].value += total;
          totalQty += qty;
          grandTotal += total;
        });

        return { satuanData, totalQty, grandTotal };
      },

      updateSummary() {
        const summary = this.calculateSummary();
        let html = '';

        // Show all satuan totals
        Object.keys(summary.satuanData).sort().forEach(satuan => {
          const data = summary.satuanData[satuan];
          if (data.qty > 0) {
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
              <span>Total Barang (${utils.capitalize(satuan)}): ${data.qty}</span>
              <span>${utils.formatCurrency(data.value)}</span>
            </div>`;
          }
        });

        // Separator between satuan totals and overall totals
        if (html) {
          html += `<div style="border-top: 2px solid #dee2e6; margin: 15px 0; position: relative;">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; color: #6c757d; font-size: 12px; font-weight: 500;">TOTAL KESELURUHAN</div>
          </div>`;
        }

        // Overall totals
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; background: #f8f9fa; border-radius: 4px;">
          <span style="font-weight: 600; font-size: 15px;">Total Barang (Keseluruhan): ${summary.totalQty}</span>
          <span style="font-weight: 600; font-size: 15px; color: #28a745;">Grand Total: ${utils.formatCurrency(summary.grandTotal)}</span>
        </div>`;

        $('summary').innerHTML = html;
      }
    };

    // Export Functions
    const exporter = {
      buildFilterInfo() {
        const tipe = $('tipeLaporan').value;
        const filters = [];

        if (tipe === 'stok') {
          if (state.currentFilter.vendorNama) filters.push(['Vendor', state.currentFilter.vendorNama]);
          if (state.currentFilter.barang) filters.push(['Nama Barang', state.currentFilter.barang]);
          if (state.currentFilter.stokFilter === 'habis') filters.push(['Filter Stok', 'Stok = 0 Item']);
          if (state.currentFilter.satuanFilter !== 'semua') filters.push(['Satuan', utils.capitalize(state.currentFilter.satuanFilter)]);
          if (state.currentFilter.filterType !== 'hari') {
            filters.push(['Periode', CONFIG.filterLabels[state.currentFilter.filterType]]);
            if (state.currentFilter.startDate && state.currentFilter.endDate) {
              filters.push(['Tanggal', state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`]);
            }
          }
        } else if (tipe === 'kendaraan') {
          if (state.currentFilter.kendaraanLabel) filters.push(['Kendaraan', state.currentFilter.kendaraanLabel]);
          if (state.currentFilter.jenisBarang !== 'semua') filters.push(['Jenis Barang', state.currentFilter.jenisBarang === 'sparepart' ? 'Sparepart' : 'Ban']);
          if (state.currentFilter.vendorNama) filters.push(['Vendor', state.currentFilter.vendorNama]);
          filters.push(['Periode', CONFIG.filterLabels[state.currentFilter.filterType]]);
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            filters.push(['Tanggal', state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`]);
          }
        } else if (tipe === 'vendor') {
          if (state.currentFilter.vendorNama) filters.push(['Vendor', state.currentFilter.vendorNama]);
          if (state.currentFilter.satuanFilter !== 'semua') filters.push(['Satuan', utils.capitalize(state.currentFilter.satuanFilter)]);
          filters.push(['Periode', CONFIG.filterLabels[state.currentFilter.filterType]]);
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            filters.push(['Tanggal', state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`]);
          }
        } else if (tipe === 'pemakaian_vendor') {
          if (state.currentFilter.vendorNama) filters.push(['Vendor', state.currentFilter.vendorNama]);
          if (state.currentFilter.barang) filters.push(['Nama Barang', state.currentFilter.barang]);
          if (state.currentFilter.kendaraanLabel) filters.push(['Kendaraan', state.currentFilter.kendaraanLabel]);
          filters.push(['Periode', CONFIG.filterLabels[state.currentFilter.filterType]]);
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            filters.push(['Tanggal', state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`]);
          }
        }

        return filters;
      },

      generateFileName(ext) {
        const tipe = $('tipeLaporan').value;
        const date = new Date().toISOString().split('T')[0];
        const parts = ['Rekap'];

        if (tipe === 'stok') {
          parts.push('StokGudang');
          if (state.currentFilter.vendorNama) parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.barang) parts.push(state.currentFilter.barang.replace(/\s+/g, '_'));
          if (state.currentFilter.stokFilter === 'habis') parts.push('StokHabis');
          if (state.currentFilter.satuanFilter !== 'semua') parts.push(state.currentFilter.satuanFilter);
        } else if (tipe === 'kendaraan') {
          parts.push('PemakaianKendaraan');
          if (state.currentFilter.kendaraanLabel) {
            parts.push(state.currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          }
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            parts.push(state.currentFilter.startDate === state.currentFilter.endDate 
              ? state.currentFilter.startDate 
              : `${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
          }
        } else if (tipe === 'vendor') {
          parts.push('Vendor');
          if (state.currentFilter.vendorNama) parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.satuanFilter !== 'semua') parts.push(state.currentFilter.satuanFilter);
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            parts.push(state.currentFilter.startDate === state.currentFilter.endDate 
              ? state.currentFilter.startDate 
              : `${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
          }
        } else if (tipe === 'pemakaian_vendor') {
          parts.push('PemakaianVendor');
          if (state.currentFilter.vendorNama) parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.barang) parts.push(state.currentFilter.barang.replace(/\s+/g, '_'));
          if (state.currentFilter.kendaraanLabel) {
            parts.push(state.currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          }
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            parts.push(state.currentFilter.startDate === state.currentFilter.endDate 
              ? state.currentFilter.startDate 
              : `${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
          }
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
        
        wsData.push([CONFIG.titles[tipe]]);
        wsData.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
        wsData.push([]);
        wsData.push(['FILTER YANG DITERAPKAN:']);
        
        this.buildFilterInfo().forEach(([label, value]) => {
          wsData.push([`${label}: ${value}`]);
        });

        wsData.push([]);
        wsData.push(CONFIG.headers[tipe]);

        state.currentData.forEach((row, idx) => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;

          if (tipe === 'stok') {
            wsData.push([
              idx + 1,
              row.no_seri || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              price,
              total,
              row.nama_vendor || '-',
              utils.formatDate(row.tanggal)
            ]);
          } else if (tipe === 'kendaraan') {
            wsData.push([
              idx + 1,
              utils.formatDate(row.tanggal),
              row.kendaraan || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              price,
              total,
              row.nama_vendor || '-',
              row.penanggung_jawab || '-',
              row.keterangan || '-'
            ]);
          } else if (tipe === 'vendor') {
            wsData.push([
              idx + 1,
              utils.formatDate(row.tanggal),
              row.nama_vendor || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              price,
              total
            ]);
          } else if (tipe === 'pemakaian_vendor') {
            wsData.push([
              idx + 1,
              utils.formatDate(row.tanggal_masuk),
              row.no_seri || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              price,
              total,
              row.nama_vendor || '-',
              row.kendaraan || '-',
              utils.formatDate(row.tanggal_pemakaian)
            ]);
          }
        });

        const summary = dataHandler.calculateSummary();
        wsData.push([]);
        wsData.push(['RINGKASAN:']);
        wsData.push([]);

        // Satuan totals
        Object.keys(summary.satuanData).sort().forEach(satuan => {
          const data = summary.satuanData[satuan];
          if (data.qty > 0) {
            wsData.push([`Total Barang (${utils.capitalize(satuan)}): ${data.qty}`, `Total Harga (${utils.capitalize(satuan)}): Rp ${data.value.toLocaleString('id-ID')}`]);
          }
        });

        // Separator
        wsData.push(['', '']);
        wsData.push(['=====================================', '=====================================']);

        // Overall totals
        wsData.push([`Total Barang (Keseluruhan): ${summary.totalQty}`, `Grand Total: Rp ${summary.grandTotal.toLocaleString('id-ID')}`]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [
          { wch: 5 },
          { wch: 15 },
          { wch: 15 },
          { wch: 30 },
          { wch: 10 },
          { wch: 10 },
          { wch: 15 },
          { wch: 15 },
          { wch: 20 },
          { wch: 20 },
          { wch: 15 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
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

        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.text(CONFIG.titles[tipe], 14, 15);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('FILTER YANG DITERAPKAN:', 14, 30);

        let yPos = 35;
        this.buildFilterInfo().forEach(([label, value]) => {
          doc.text(`${label}: ${value}`, 14, yPos);
          yPos += 5;
        });

        const tableData = state.currentData.map((row, idx) => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;

          if (tipe === 'stok') {
            return [
              idx + 1,
              row.no_seri || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              utils.formatCurrency(price),
              utils.formatCurrency(total),
              row.nama_vendor || '-',
              utils.formatDate(row.tanggal)
            ];
          } else if (tipe === 'kendaraan') {
            return [
              idx + 1,
              utils.formatDate(row.tanggal),
              row.kendaraan || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              utils.formatCurrency(price),
              utils.formatCurrency(total),
              row.nama_vendor || '-',
              row.penanggung_jawab || '-',
              row.keterangan || '-'
            ];
          } else if (tipe === 'vendor') {
            return [
              idx + 1,
              utils.formatDate(row.tanggal),
              row.nama_vendor || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              utils.formatCurrency(price),
              utils.formatCurrency(total)
            ];
          } else if (tipe === 'pemakaian_vendor') {
            return [
              idx + 1,
              utils.formatDate(row.tanggal_masuk),
              row.no_seri || '-',
              row.nama_sparepart || row.nama_barang,
              qty,
              row.satuan,
              utils.formatCurrency(price),
              utils.formatCurrency(total),
              row.nama_vendor || '-',
              row.kendaraan || '-',
              utils.formatDate(row.tanggal_pemakaian)
            ];
          }
        });

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
            fontSize: 7
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
        });

        const summary = dataHandler.calculateSummary();
        const satuanFilter = $('satuanFilter').value;

        // Calculate summary height
        let summaryLineCount = 1;
        if ((tipe === 'stok' || tipe === 'vendor') && satuanFilter !== 'semua') {
          const data = summary.satuanData[satuanFilter];
          if (data && data.qty > 0) {
            summaryLineCount += 1;
          }
        } else {
          summaryLineCount += Object.keys(summary.satuanData).filter(satuan => summary.satuanData[satuan].qty > 0).length;
        }
        summaryLineCount += 1;
        summaryLineCount += 2;
        const summaryHeight = summaryLineCount * 5 + 20;

        let finalY = doc.lastAutoTable.finalY + 15;
        const pageHeight = 210;
        const bottomMargin = 25;
        const minSpace = 50;

        const remainingSpace = pageHeight - bottomMargin - finalY;
        if (finalY + summaryHeight + bottomMargin > pageHeight || remainingSpace < minSpace) {
          doc.addPage();
          finalY = 25;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('RINGKASAN:', 14, finalY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        let summaryY = finalY + 7;

        if ((tipe === 'stok' || tipe === 'vendor') && satuanFilter !== 'semua') {
          const data = summary.satuanData[satuanFilter];
          if (data && data.qty > 0) {
            const leftText = `Total Barang (${utils.capitalize(satuanFilter)}): ${data.qty}`;
            const rightText = `Total Harga (${utils.capitalize(satuanFilter)}): Rp ${data.value.toLocaleString('id-ID')}`;
            const leftHeight = doc.getTextDimensions(leftText, { maxWidth: 180 }).h;
            const rightHeight = doc.getTextDimensions(rightText, { maxWidth: 80 }).h;
            const lineHeight = Math.max(leftHeight, rightHeight);
            doc.text(leftText, 14, summaryY, { maxWidth: 180 });
            doc.text(rightText, 200, summaryY, { maxWidth: 80 });
            summaryY += lineHeight + 2;
          }
        } else {
          Object.keys(summary.satuanData).sort().forEach(satuan => {
            const data = summary.satuanData[satuan];
            if (data.qty > 0) {
              const leftText = `Total Barang (${utils.capitalize(satuan)}): ${data.qty}`;
              const rightText = `Total Harga (${utils.capitalize(satuan)}): Rp ${data.value.toLocaleString('id-ID')}`;
              const leftHeight = doc.getTextDimensions(leftText, { maxWidth: 180 }).h;
              const rightHeight = doc.getTextDimensions(rightText, { maxWidth: 80 }).h;
              const lineHeight = Math.max(leftHeight, rightHeight);
              doc.text(leftText, 14, summaryY, { maxWidth: 180 });
              doc.text(rightText, 200, summaryY, { maxWidth: 80 });
              summaryY += lineHeight + 2;
            }
          });
        }

        if (Object.keys(summary.satuanData).some(satuan => summary.satuanData[satuan].qty > 0)) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(14, summaryY, 280, summaryY);
          doc.setLineWidth(0.2);
        }
        summaryY += 8;
        doc.setFont(undefined, 'bold');
        doc.text(`Total Barang (Keseluruhan): ${summary.totalQty}`, 14, summaryY);
        doc.text(`Grand Total: Rp ${summary.grandTotal.toLocaleString('id-ID')}`, 200, summaryY);
        doc.setFont(undefined, 'normal');

        doc.save(this.generateFileName('pdf'));
      }
    };

    // Event Listeners
    $('tipeLaporan').addEventListener('change', function() {
      const tipe = this.value;
      ui.toggleFilters(tipe);
      ui.updateHeaders(tipe);
      ui.resetSummary();
      $('resetFilter').click();
    });

    $('filterType').addEventListener('change', function() {
      const isManual = this.value === 'manual';
      $('filterStartGroup').classList.toggle('filter-hidden', !isManual);
      $('filterEndGroup').classList.toggle('filter-hidden', !isManual);
      $('filterStart').required = isManual;
      $('filterEnd').required = isManual;
    });

    $('barangFilter').addEventListener('input', function() {
      const tipe = $('tipeLaporan').value;
      if (tipe !== 'stok' && tipe !== 'pemakaian_vendor') return;
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(() => {
        dataHandler.renderTable(dataHandler.applyFilters(state.allData));
      }, 300);
    });

    $('filterForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipe = $('tipeLaporan').value;
      ui.resetSummary();
      ui.showLoading(tipe);
      await dataHandler.loadData(tipe);
    });

    $('resetFilter').addEventListener('click', async () => {
      const tipe = $('tipeLaporan').value;

      $('filterType').value = 'hari';
      $('filterStart').value = '';
      $('filterEnd').value = '';
      $('vendorFilter').value = '';
      $('kendaraanFilter').value = '';
      $('barangFilter').value = '';
      $('stokFilter').value = 'semua';
      $('satuanFilter').value = 'semua';
      $('jenisBarangFilter').value = 'semua';

      $('filterStartGroup').classList.add('filter-hidden');
      $('filterEndGroup').classList.add('filter-hidden');

      ui.resetSummary();
      ui.showLoading(tipe);

      const today = new Date().toISOString().split('T')[0];

      if (tipe === 'stok') {
        state.currentFilter = {
          vendor: '', barang: '', vendorNama: '',
          stokFilter: 'semua', satuanFilter: 'semua',
          startDate: today, endDate: today,
          filterType: 'hari', tipe: 'stok'
        };

        try {
          const data = await api.fetch('/rekap?type=stok');
          state.allData = data;
          dataHandler.renderTable(dataHandler.applyFilters(data));
          ui.showLowStockAlert(dataHandler.applyFilters(data));
        } catch (error) {
          console.error('Error:', error);
          ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
        }
      } else if (tipe === 'kendaraan' || tipe === 'pemakaian_vendor') {
        ui.showEmpty(tipe, 'Silakan pilih filter dan klik Terapkan Filter');
        $('lowStockAlert').classList.add('filter-hidden');
      } else if (tipe === 'vendor') {
        state.currentFilter = {
          vendor: '', vendorNama: '',
          startDate: today, endDate: today,
          filterType: 'hari', satuanFilter: 'semua', tipe: 'vendor'
        };

        try {
          const data = await api.fetch(`/rekap?type=vendor&start=${today}&end=${today}&satuan=semua`);
          state.allData = data;
          dataHandler.renderTable(dataHandler.applyFilters(data));
        } catch (error) {
          console.error('Error:', error);
          ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
        }
      }
    });

    $('exportExcel').addEventListener('click', () => exporter.toExcel());
    $('exportPDF').addEventListener('click', () => exporter.toPDF());

    // Initialize
    (async function init() {
      await Promise.all([api.loadBarangList(), api.loadFilters()]);
      $('filterType').dispatchEvent(new Event('change'));
      $('resetFilter').click();
    })();