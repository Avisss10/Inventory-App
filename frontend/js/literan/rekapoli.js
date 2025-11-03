    // ========================================
    // KONFIGURASI & KONSTANTA
    // ========================================
    const API_BASE_URL = 'http://localhost:3000';
    
    const CONFIG = {
      columnCounts: {
        oli_masuk: 8,
        oli_tersedia: 12,
        pemakaian_oli: 9
      },
      headers: {
        oli_masuk: ['No', 'Tanggal', 'Nama Literan', 'No Seri', 'Jumlah Masuk (L)', 'Harga Satuan', 'Total', 'Vendor'],
        oli_tersedia: ['No', 'Nama Literan', 'No Seri', 'Sisa Lama (L)', 'Baru Masuk (L)', 'Total (L)', 'Dipakai (L)', 'Sisa Akhir (L)', 'Harga Satuan', 'Total', 'Status', 'Vendor'],
        pemakaian_oli: ['No', 'Tanggal', 'Nama Literan', 'Kendaraan', 'Jumlah (L)', 'Harga Satuan', 'Total', 'Keterangan', 'Vendor']
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
      pemakaianTotals: {}
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);

    const utils = {
      parseQty: qty => parseFloat((qty || '').toString().replace(',', '.')) || 0,
      
      formatCurrency: val => `Rp ${val.toLocaleString('id-ID')}`,
      
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

          const vendorOptions = vendors.map(v => {
            state.vendorNameToId[v.nama_vendor] = v.id;
            state.vendorMap[v.id] = v.nama_vendor;
            return `<option value="${v.id}" data-name="${v.nama_vendor}">${v.nama_vendor}</option>`;
          });

          $('vendorFilter').innerHTML = `
            <option value="">Semua Vendor</option>
            ${vendorOptions.join('')}
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
        
        if (tipe === 'oli_tersedia') {
          $('filterWaktuGroup').classList.add('filter-hidden');
          $('filterStartGroup').classList.add('filter-hidden');
          $('filterEndGroup').classList.add('filter-hidden');
        } else {
          $('filterWaktuGroup').classList.remove('filter-hidden');
        }
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

        if (namaOli) {
          filtered = filtered.filter(item => 
            (item.nama_oli || '').toLowerCase().includes(namaOli)
          );
        }
        
        if (vendorId) {
          filtered = filtered.filter(item => 
            item.id_vendor === parseInt(vendorId)
          );
        }

        state.currentFilter.namaOli = $('namaOliFilter').value || '';
        state.currentFilter.vendor = vendorId;
        state.currentFilter.vendorNama = vendorId ? 
          $('vendorFilter').options[$('vendorFilter').selectedIndex].text : '';

        return filtered;
      },

      async loadData(tipe) {
        try {
          let url = '';
          
          if (tipe === 'oli_masuk') {
            const filterType = $('filterType').value;
            const dateRange = utils.getDateRange(
              filterType, 
              $('filterStart').value, 
              $('filterEnd').value
            );
            
            if (!dateRange.start || !dateRange.end) {
              alert('Harap isi tanggal untuk filter!');
              return;
            }

            const params = new URLSearchParams();
            params.append('start', dateRange.start);
            params.append('end', dateRange.end);

            const vendorId = $('vendorFilter').value;
            const namaOli = $('namaOliFilter').value || '';

            if (vendorId) params.append('vendor', vendorId);
            if (namaOli) params.append('nama_oli', namaOli);

            state.currentFilter = {
              vendor: vendorId,
              vendorNama: vendorId ? 
                $('vendorFilter').options[$('vendorFilter').selectedIndex].text : '',
              namaOli: namaOli,
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: filterType,
              tipe: 'oli_masuk'
            };

            url = `/rekap/oli_masuk?${params.toString()}`;
          } 
          else if (tipe === 'oli_tersedia') {
            const params = new URLSearchParams();
            const vendorId = $('vendorFilter').value;
            const namaOli = $('namaOliFilter').value || '';
            
            if (vendorId) params.append('vendor', vendorId);
            if (namaOli) params.append('nama_oli', namaOli);

            state.currentFilter = {
              vendor: vendorId,
              vendorNama: vendorId ? 
                $('vendorFilter').options[$('vendorFilter').selectedIndex].text : '',
              namaOli: namaOli,
              tipe: 'oli_tersedia'
            };

            url = `/rekap/oli_tersedia${params.toString() ? '?' + params.toString() : ''}`;
          }
          else if (tipe === 'pemakaian_oli') {
            const filterType = $('filterType').value;
            const dateRange = utils.getDateRange(
              filterType, 
              $('filterStart').value, 
              $('filterEnd').value
            );
            
            if (!dateRange.start || !dateRange.end) {
              alert('Harap isi tanggal untuk filter!');
              return;
            }

            const params = new URLSearchParams();
            params.append('start', dateRange.start);
            params.append('end', dateRange.end);

            const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
            const namaOli = $('namaOliFilter').value || '';
            const vendorId = $('vendorFilter').value;

            if (kendaraanId) params.append('kendaraan', kendaraanId);
            if (namaOli) params.append('nama_oli', namaOli);
            if (vendorId) params.append('vendor', vendorId);

            state.currentFilter = {
              kendaraan: kendaraanId,
              kendaraanLabel: $('kendaraanFilter').value || '',
              namaOli: namaOli,
              vendor: vendorId,
              vendorNama: vendorId ? 
                $('vendorFilter').options[$('vendorFilter').selectedIndex].text : '',
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: filterType,
              tipe: 'pemakaian_oli'
            };

            url = `/rekap/pemakaian_oli?${params.toString()}`;
          }

          ui.showLoading(tipe);
          const data = await api.fetch(url);
          state.allData = data;

          if (tipe === 'oli_tersedia') {
            try {
              const params = new URLSearchParams();
              if (state.currentFilter && state.currentFilter.namaOli) {
                params.append('nama_oli', state.currentFilter.namaOli);
              }
              const pemakaianList = await api.fetchPemakaian(params.toString());
              const totals = {};
              (pemakaianList || []).forEach(p => {
                const namaRaw = (p.nama_oli || '').toString();
                const namaKey = namaRaw.toLowerCase().trim();
                const qty = parseFloat((p.jumlah_pakai || 0).toString().replace(',', '.')) || 0;
                totals[namaKey] = (totals[namaKey] || 0) + qty;
              });
              state.pemakaianTotals = totals;
            } catch (err) {
              console.warn('Gagal ambil pemakaian, lanjut tanpa totals:', err);
              state.pemakaianTotals = {};
            }
          }

          this.renderTable(data);
        } catch (error) {
          console.error('Error fetching data:', error);
          ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
        }
      },

      renderTable(data) {
        const tipe = $('tipeLaporan').value;
        let filtered = data;

        if (tipe === 'oli_tersedia') {
          filtered = this.applyClientFilters(data);
        } else {
          state.currentFilter.namaOli = $('namaOliFilter').value || '';
          state.currentFilter.vendorNama = $('vendorFilter').value || '';
        }

        state.currentData = filtered;
        const tbody = $('rekapTable').querySelector('tbody');
        tbody.innerHTML = '';

        if (!filtered || filtered.length === 0) {
          ui.showEmpty(tipe);
          this.updateSummary();
          return;
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach((row, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = this.getRowHTML(tipe, row, idx);
          fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);
        this.updateSummary();
      },

      getRowHTML(tipe, row, idx) {
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
            const sisaLama = utils.parseQty(row.sisa_lama || 0);
            const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
            const total = sisaLama + baruMasuk;
            const dipakai = utils.parseQty(row.total_dipakai || 0);
            const sisaAkhir = total - dipakai;
            const hargaSatuan = utils.parseQty(row.harga || 0);
            const totalHarga = sisaAkhir * hargaSatuan;
            const status = sisaLama > 0 ?
              `<span class="badge badge-gabungan">Gabungan dari ${row.no_seri_lama || 'Literan lama'}</span>` :
              `<span class="badge badge-murni">Literan Baru Murni</span>`;

            return `
              <td>${idx + 1}</td>
              <td style="text-align: left;">${row.nama_oli || ''}</td>
              <td>${row.no_seri || '-'}</td>
              <td>${sisaLama.toFixed(2)}</td>
              <td>${baruMasuk.toFixed(2)}</td>
              <td><strong>${total.toFixed(2)}</strong></td>
              <td style="color: #dc3545;">${dipakai.toFixed(2)}</td>
              <td style="color: #28a745;"><strong>${sisaAkhir.toFixed(2)}</strong></td>
              <td>${utils.formatCurrency(hargaSatuan)}</td>
              <td>${utils.formatCurrency(totalHarga)}</td>
              <td>${status}</td>
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
          } else if (tipe === 'oli_tersedia') {
            const sisaLama = utils.parseQty(row.sisa_lama || 0);
            const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
            const total = sisaLama + baruMasuk;
            const dipakai = utils.parseQty(row.total_dipakai || 0);
            const sisaAkhir = total - dipakai;
            const hargaSatuan = utils.parseQty(row.harga || 0);
            totalLiter += (sisaLama + baruMasuk);
            totalCost += sisaAkhir * hargaSatuan;
          } else if (tipe === 'pemakaian_oli') {
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
          <strong>Total Literan:</strong> ${summary.totalLiter.toFixed(2)} L<br>
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
        let url = '';
        const todayISO = utils.formatDateISO(new Date());

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
        } else if (tipe === 'oli_tersedia') {
          url = '/rekap/oli_tersedia';
          state.currentFilter = {
            vendor: '',
            vendorNama: '',
            namaOli: '',
            tipe: 'oli_tersedia'
          };
        } else if (tipe === 'pemakaian_oli') {
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
          filters.push(['Periode', CONFIG.filterLabels[state.currentFilter.filterType] || 
            state.currentFilter.filterType || '']);
          if (state.currentFilter.startDate && state.currentFilter.endDate) {
            filters.push(['Tanggal', state.currentFilter.startDate === state.currentFilter.endDate ? 
              state.currentFilter.startDate : 
              `${state.currentFilter.startDate} s/d ${state.currentFilter.endDate}`]);
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

        if (tipe === 'oli_masuk') {
          parts.push('LiteranMasuk');
        } else if (tipe === 'oli_tersedia') {
          parts.push('LiteranTersedia');
        } else if (tipe === 'pemakaian_oli') {
          parts.push('PemakaianLiteran');
        }

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
          } else if (tipe === 'oli_tersedia') {
            const sisaLama = utils.parseQty(row.sisa_lama || 0);
            const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
            const total = sisaLama + baruMasuk;
            const dipakai = utils.parseQty(row.total_dipakai || 0);
            const sisaAkhir = total - dipakai;
            const hargaSatuan = utils.parseQty(row.harga || 0);
            const totalHarga = sisaAkhir * hargaSatuan;
            const status = sisaLama > 0 ? 
              `Gabungan dari ${row.no_seri_lama || 'oli lama'}` : 'Oli Baru Murni';

            wsData.push([
              idx + 1,
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
              row.nama_vendor || '-'
            ]);
          } else if (tipe === 'pemakaian_oli') {
            const jumlah = utils.parseQty(row.jumlah_pakai);
            const hargaSatuan = utils.parseQty(row.harga || 0);
            const total = jumlah * hargaSatuan;
            wsData.push([
              idx + 1,
              utils.formatDate(row.tanggal_pakai),
              row.nama_oli,
              row.kendaraan || '-',
              jumlah.toFixed(2),
              hargaSatuan,
              total,
              row.keterangan || '-',
              row.nama_vendor || '-'
            ]);
          }
        });

        const summary = dataHandler.calculateSummary();
        wsData.push([]);
        wsData.push(['RINGKASAN:']);
        wsData.push([]);
        
        if (tipe === 'oli_masuk') {
          wsData.push([`Total Literan Masuk: ${summary.totalLiter.toFixed(2)} Liter`]);
          wsData.push([`Grand Total: ${utils.formatCurrency(summary.totalCost)}`]);
        } else if (tipe === 'oli_tersedia') {
          wsData.push([`Total Stok Tersedia: ${summary.totalLiter.toFixed(2)} Liter`]);
          wsData.push([`Grand Total: ${utils.formatCurrency(summary.totalCost)}`]);
        } else if (tipe === 'pemakaian_oli') {
          wsData.push([`Total Literan Terpakai: ${summary.totalLiter.toFixed(2)} Liter`]);
          wsData.push([`Grand Total: ${utils.formatCurrency(summary.totalCost)}`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        const columnWidths = {
          oli_masuk: [5, 15, 25, 15, 15, 18, 18, 30],
          oli_tersedia: [5, 25, 15, 12, 12, 12, 12, 12, 18, 18, 30, 30],
          pemakaian_oli: [5, 15, 25, 20, 15, 18, 18, 30, 30]
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

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(CONFIG.titles[tipe], 14, 15);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('FILTER YANG DITERAPKAN:', 14, 30);

        let yPos = 35;
        doc.setFont(undefined, 'normal');
        this.buildFilterInfo().forEach(([label, value]) => {
          doc.text(`${label}: ${value}`, 14, yPos);
          yPos += 5;
        });

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
          } else if (tipe === 'oli_tersedia') {
            const sisaLama = utils.parseQty(row.sisa_lama || 0);
            const baruMasuk = utils.parseQty(row.jumlah_baru || row.total_stok || 0);
            const total = sisaLama + baruMasuk;
            const dipakai = utils.parseQty(row.total_dipakai || 0);
            const sisaAkhir = total - dipakai;
            const hargaSatuan = utils.parseQty(row.harga || 0);
            const totalHarga = sisaAkhir * hargaSatuan;
            const status = sisaLama > 0 ? 
              `Gabungan dari ${row.no_seri_lama || 'oli lama'}` : 'Oli Baru Murni';

            return [
              idx + 1,
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
              row.nama_vendor || '-'
            ];
          } else if (tipe === 'pemakaian_oli') {
            const jumlah = utils.parseQty(row.jumlah_pakai);
            const hargaSatuan = utils.parseQty(row.harga || 0);
            const total = jumlah * hargaSatuan;
            return [
              idx + 1,
              utils.formatDate(row.tanggal_pakai),
              row.nama_oli || '',
              row.kendaraan || '-',
              jumlah.toFixed(2) + ' L',
              utils.formatCurrency(hargaSatuan),
              utils.formatCurrency(total),
              row.keterangan || '-',
              row.nama_vendor || '-'
            ];
          }
        });

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
            1: { halign: 'left', cellWidth: 40 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 18 },
            4: { halign: 'right', cellWidth: 18 },
            5: { halign: 'right', cellWidth: 18 },
            6: { halign: 'right', cellWidth: 18 },
            7: { halign: 'right', cellWidth: 18 },
            8: { halign: 'right', cellWidth: 25 },
            9: { halign: 'right', cellWidth: 30 },
            10: { halign: 'center', cellWidth: 35 },
            11: { halign: 'left', cellWidth: 30 }
          },
          pemakaian_oli: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left', cellWidth: 40 },
            3: { halign: 'left', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 30 },
            6: { halign: 'right', cellWidth: 35 },
            7: { halign: 'left', cellWidth: 40 },
            8: { halign: 'left', cellWidth: 35 }
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

        const summary = dataHandler.calculateSummary();
        let finalY = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('RINGKASAN:', 14, finalY);
        
        finalY += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        if (tipe === 'oli_masuk') {
          doc.text(`Total Literan Masuk: ${summary.totalLiter.toFixed(2)} Liter`, 14, finalY);
          finalY += 6;
          doc.text(`Grand Total: ${utils.formatCurrency(summary.totalCost)}`, 14, finalY);
        } else if (tipe === 'oli_tersedia') {
          doc.text(`Total Stok Tersedia: ${summary.totalLiter.toFixed(2)} Liter`, 14, finalY);
          finalY += 6;
          doc.text(`Grand Total: ${utils.formatCurrency(summary.totalCost)}`, 14, finalY);
        } else if (tipe === 'pemakaian_oli') {
          doc.text(`Total Literan Terpakai: ${summary.totalLiter.toFixed(2)} Liter`, 14, finalY);
          finalY += 6;
          doc.text(`Grand Total: ${utils.formatCurrency(summary.totalCost)}`, 14, finalY);
        }

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
      
      $('filterType').value = 'hari';
      $('filterStart').value = '';
      $('filterEnd').value = '';
      $('vendorFilter').value = '';
      $('kendaraanFilter').value = '';
      $('namaOliFilter').value = '';
      
      loadInitialData(tipe);
    });

    $('filterType').addEventListener('change', function() {
      const isManual = this.value === 'manual';
      $('filterStartGroup').classList.toggle('filter-hidden', !isManual);
      $('filterEndGroup').classList.toggle('filter-hidden', !isManual);
      $('filterStart').required = isManual;
      $('filterEnd').required = isManual;
    });

    $('namaOliFilter').addEventListener('input', function() {
      const tipe = $('tipeLaporan').value;
      if (tipe === 'oli_tersedia') {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(() => {
          dataHandler.renderTable(state.allData);
        }, 250);
      }
    });

    $('vendorFilter').addEventListener('input', function() {
      const tipe = $('tipeLaporan').value;
      if (tipe === 'oli_tersedia') {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = setTimeout(() => {
          dataHandler.renderTable(state.allData);
        }, 250);
      }
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
      await Promise.all([api.loadOliList(), api.loadFilters()]);
      $('filterType').dispatchEvent(new Event('change'));
      const initialTipe = $('tipeLaporan').value;
      $('filterType').value = 'hari';
      await loadInitialData(initialTipe);
    })();