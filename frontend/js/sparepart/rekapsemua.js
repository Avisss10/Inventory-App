const API_BASE_URL = '/api';
    
    const CONFIG = {
      columnCounts: { stok: 8, kendaraan: 11, vendor: 9, pemakaian_vendor: 11, sisa_stok: 11 },
      headers: {
        stok: ['No', 'No Seri', 'Nama Barang', 'Jumlah', 'Harga Satuan', 'Total', 'Vendor', 'Tanggal'],
        kendaraan: ['No', 'Tanggal', 'Kendaraan', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total', 'Vendor', 'Penanggung Jawab', 'No Seri / Keterangan'],
        vendor: ['No', 'Tanggal', 'Vendor', 'No Seri', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total'],
        pemakaian_vendor: ['No', 'Tanggal Masuk', 'No Seri', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total', 'Vendor', 'Kendaraan', 'Tanggal Pemakaian'],
        sisa_stok: ['No', 'Tgl Masuk', 'No Seri', 'Nama Barang', 'Jenis', 'Satuan', 'Harga Satuan', 'Jml Masuk', 'Jml Dipakai', 'Sisa Stok', 'Vendor']
      },
      titles: {
        stok: 'REKAP STOK GUDANG',
        kendaraan: 'REKAP PEMAKAIAN KENDARAAN',
        vendor: 'REKAP TRANSAKSI VENDOR',
        pemakaian_vendor: 'REKAP PEMAKAIAN PER BON',
        sisa_stok: 'REKAP SISA STOK'
      },
      filterLabels: {
        semua: 'Semua Data',
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
          case 'semua':
            start = '';
            end = '';
            break;
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

          vendors.forEach(v => {
            state.vendorNameToId[v.nama_vendor] = v.id;
            state.vendorMap[v.id] = v.nama_vendor;
          });

          $('vendorList').innerHTML = vendors.map(v => 
            `<option value="${v.nama_vendor}">`
          ).join('');

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
        $$('.filter-stok, .filter-kendaraan, .filter-vendor, .filter-pemakaian_vendor, .filter-sisa_stok').forEach(el => el.classList.add('filter-hidden'));
        // Show filters for the selected type
        $$(`.filter-${tipe}`).forEach(el => el.classList.remove('filter-hidden'));
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
        if (tipe === 'vendor') {
          document.getElementById('tableContainer').style.display = 'none';
          const acc = $('vendorAccordion');
          acc.style.display = 'block';
          acc.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;font-size:14px;">Memuat data...</div>';
          return;
        }
        document.getElementById('tableContainer').style.display = '';
        $('vendorAccordion').style.display = 'none';
        $('rekapTable').querySelector('tbody').innerHTML =
          `<tr><td colspan="${CONFIG.columnCounts[tipe]}" class="loading">Memuat data...</td></tr>`;
      },

      showEmpty(tipe, msg = 'Tidak ada data yang ditemukan') {
        if (tipe === 'vendor') {
          document.getElementById('tableContainer').style.display = 'none';
          const acc = $('vendorAccordion');
          acc.style.display = 'block';
          acc.innerHTML = `<div style="text-align:center;padding:40px;color:#6c757d;font-size:14px;">${msg}</div>`;
          return;
        }
        document.getElementById('tableContainer').style.display = '';
        $('vendorAccordion').style.display = 'none';
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

        if ((tipe === 'stok' || tipe === 'pemakaian_vendor') && searchTerm) {
          filtered = filtered.filter(item =>
            (item.nama_sparepart || item.nama_barang || '').toLowerCase().includes(searchTerm)
          );
        }

        // Untuk sisa_stok, filter nama barang dari field nama_barang
        if (tipe === 'sisa_stok' && searchTerm) {
          filtered = filtered.filter(item =>
            (item.nama_barang || '').toLowerCase().includes(searchTerm)
          );
        }

        if (tipe === 'stok' && stokFilter === 'habis') {
          filtered = filtered.filter(item => utils.parseQty(item.jumlah) === 0);
        }

        // Filter sisa = 0 menggunakan stokFilter
        if (tipe === 'sisa_stok' && stokFilter === 'habis') {
          filtered = filtered.filter(item => {
            const sisa = (parseFloat(item.jumlah_masuk) || 0) - (parseFloat(item.jumlah_pakai) || 0);
            return sisa <= 0;
          });
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
            const vendorNama = $('vendorFilter').value.trim();
            const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
            const barang = $('barangFilter').value;
            const satuan = $('satuanFilter').value;
            const jenisStok = $('jenisStokFilter').value;
            const dateParams = $('filterType').value !== 'hari' ? `&start=${dateRange.start}&end=${dateRange.end}` : '';

            url = `/rekap?type=stok&vendor=${vendorId}&barang=${barang}&satuan=${satuan}&jenis_barang=${jenisStok}${dateParams}`;
            state.currentFilter = {
              vendor: vendorId,
              barang,
              vendorNama: vendorNama,
              jenisStok,
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
            const vendorNama = $('vendorFilter').value.trim();
            const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
            
            url = `/rekap?type=kendaraan&start=${dateRange.start}&end=${dateRange.end}${kendaraanId ? `&kendaraan=${kendaraanId}` : ''}${jenisBarang !== 'semua' ? `&jenis_barang=${jenisBarang}` : ''}${vendorId ? `&vendor=${vendorId}` : ''}`;
            
            state.currentFilter = {
              kendaraan: kendaraanId,
              kendaraanLabel: $('kendaraanFilter').value,
              jenisBarang,
              vendor: vendorId,
              vendorNama: vendorNama,
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

            const vendorNama = $('vendorFilter').value.trim();
            const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
            const satuan = $('satuanFilter').value;
            
            url = `/rekap?type=vendor&vendor=${vendorId}&start=${dateRange.start}&end=${dateRange.end}&satuan=${satuan}`;
            
            state.currentFilter = {
              vendor: vendorId,
              vendorNama: vendorNama,
              startDate: dateRange.start,
              endDate: dateRange.end,
              filterType: $('filterType').value,
              satuanFilter: satuan,
              tipe: 'vendor'
            };
          } else if (tipe === 'pemakaian_vendor') {
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

            const vendorNama = $('vendorFilter').value.trim();
            const vendorId = vendorNama ? state.vendorNameToId[vendorNama] : '';
            const barang = $('barangFilter').value.trim();
            const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
            const noSeri = $('noSeriFilter').value.trim();

            const masukParams = (masukType && masukType !== 'semua' && masukRange.start && masukRange.end) ? `&masuk_start=${masukRange.start}&masuk_end=${masukRange.end}` : '';
            const pemakaianParams = (pemakaianType && pemakaianType !== 'semua' && pemakaianRange.start && pemakaianRange.end) ? `&pemakaian_start=${pemakaianRange.start}&pemakaian_end=${pemakaianRange.end}` : '';
            const noSeriParam = noSeri ? `&no_seri=${encodeURIComponent(noSeri)}` : '';
            const vendorParam = vendorId ? `&vendor=${vendorId}` : '';
            const kendaraanParam = kendaraanId ? `&kendaraan=${kendaraanId}` : '';
            const barangParam = barang ? `&barang=${encodeURIComponent(barang)}` : '';
            const namaOliParam = barang ? `&nama_oli=${encodeURIComponent(barang)}` : '';
            const merkBanParam = barang ? `&merkBan=${encodeURIComponent(barang)}` : '';

            const sparepartUrl = `/pemakaian_vendor?${vendorParam}${barangParam}${kendaraanParam}${masukParams}${pemakaianParams}${noSeriParam}`;
            const oliUrl = `/rekap/pemakaian_per_bon?${vendorParam}${namaOliParam}${kendaraanParam}${masukParams}${pemakaianParams}${noSeriParam}`;
            const banUrl = `/pemakaian_ban_per_masuk?${vendorParam}${merkBanParam}${kendaraanParam}${masukParams}${pemakaianParams}`;

            const [sparepartData, oliData, banData] = await Promise.all([
              api.fetch(sparepartUrl),
              api.fetch(oliUrl),
              api.fetch(banUrl)
            ]);

            const normalized = [
              ...sparepartData.map(row => ({ ...row, source: 'sparepart' })),
              ...oliData.map(row => ({
                ...row,
                nama_sparepart: row.nama_oli || row.nama_sparepart || '',
                jumlah: row.jumlah_pakai || row.jumlah || 0,
                tanggal_masuk: row.tanggal_masuk || row.tanggal_masuk,
                tanggal_pemakaian: row.tanggal_pemakaian || row.tanggal_pakai || row.tanggal || '',
                satuan: row.satuan || 'liter',
                source: 'oli'
              })),
              ...banData.map(row => ({
                ...row,
                nama_sparepart: row.merk_ban ? `Ban ${row.merk_ban}` : row.nama_sparepart || '',
                jumlah: row.jumlah || 1,
                satuan: row.satuan || 'pcs',
                tanggal_masuk: row.tgl_ban_masuk || row.tanggal_masuk || '',
                tanggal_pemakaian: row.tanggal_pemakaian || '',
                source: 'ban'
              }))
            ];

            state.currentFilter = {
              vendor: vendorId, vendorNama, barang,
              kendaraan: kendaraanId, kendaraanLabel: $('kendaraanFilter').value,
              noSeri,
              masukStart: masukRange.start || '', masukEnd: masukRange.end || '',
              masukFilterType: masukType,
              pemakaianStart: pemakaianRange.start || '', pemakaianEnd: pemakaianRange.end || '',
              pemakaianFilterType: pemakaianType,
              filterType: `${masukType}|${pemakaianType}`,
              tipe: 'pemakaian_vendor'
            };

            state.allData = normalized;
            this.renderTable(this.applyFilters(normalized));
            $('lowStockAlert').classList.add('filter-hidden');
            return;

          } else if (tipe === 'sisa_stok') {
            // ── SISA STOK ──────────────────────────────────────────────
            const masukType     = $('filterMasukType').value;
            const pemakaianType = $('filterPemakaianType').value;

            const masukRange     = utils.getDateRange(masukType,     $('filterMasukStart').value,    $('filterMasukEnd').value);
            const pemakaianRange = utils.getDateRange(pemakaianType, $('filterPemakaianStart').value, $('filterPemakaianEnd').value);

            if (masukType === 'manual' && (!masukRange.start || !masukRange.end)) {
              alert('Harap isi tanggal untuk filter Tanggal Masuk!');
              return;
            }
            if (pemakaianType === 'manual' && (!pemakaianRange.start || !pemakaianRange.end)) {
              alert('Harap isi tanggal untuk filter Tanggal Pemakaian!');
              return;
            }

            const vendorNama  = $('vendorFilter').value.trim();
            const vendorId    = vendorNama ? state.vendorNameToId[vendorNama] : '';
            const barang      = $('barangFilter').value.trim();
            const kendaraanId = state.kendaraanLabelToId[$('kendaraanFilter').value] || '';
            const noSeri      = $('noSeriFilter').value.trim();
            const satuan      = $('satuanFilter').value;

            const masukParams     = (masukType !== 'semua' && masukRange.start && masukRange.end)
              ? `&masuk_start=${masukRange.start}&masuk_end=${masukRange.end}` : '';
            const pemakaianParams = (pemakaianType !== 'semua' && pemakaianRange.start && pemakaianRange.end)
              ? `&pemakaian_start=${pemakaianRange.start}&pemakaian_end=${pemakaianRange.end}` : '';
            const vendorParam     = vendorId    ? `&vendor=${vendorId}`                    : '';
            const kendaraanParam  = kendaraanId ? `&kendaraan=${kendaraanId}`              : '';
            const barangParam     = barang      ? `&barang=${encodeURIComponent(barang)}`  : '';
            const noSeriParam     = noSeri      ? `&no_seri=${encodeURIComponent(noSeri)}` : '';
            const satuanParam     = satuan && satuan !== 'semua' ? `&satuan=${satuan}`     : '';

            url = `/rekap/sisa_stok?${vendorParam}${barangParam}${kendaraanParam}${masukParams}${pemakaianParams}${noSeriParam}${satuanParam}`;

            state.currentFilter = {
              vendor: vendorId, vendorNama, barang,
              kendaraan: kendaraanId, kendaraanLabel: $('kendaraanFilter').value,
              noSeri,
              satuanFilter: satuan,
              masukStart:  masukRange.start  || '', masukEnd:  masukRange.end  || '',
              masukFilterType: masukType,
              pemakaianStart: pemakaianRange.start || '', pemakaianEnd: pemakaianRange.end || '',
              pemakaianFilterType: pemakaianType,
              filterType: `${masukType}|${pemakaianType}`,
              tipe: 'sisa_stok'
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
          ui.showEmpty($('tipeLaporan').value, 'Terjadi kesalahan saat memuat data');
        }
      },

      renderTable(data) {
        state.currentData = data;
        const tipe = $('tipeLaporan').value;

        if (tipe === 'vendor') {
          this.renderVendorAccordion(data);
          return;
        }

        document.getElementById('tableContainer').style.display = '';
        $('vendorAccordion').style.display = 'none';

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
          if (tipe === 'sisa_stok') {
            const sisa = (parseFloat(row.jumlah_masuk) || 0) - (parseFloat(row.jumlah_pakai) || 0);
            if (sisa <= 0)      tr.style.backgroundColor = '#ffe0e0';
            else if (sisa < 3) tr.style.backgroundColor = '#fff3cd';
          }
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
            <td>${row.no_seri || '-'}</td>
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
          `,
          sisa_stok: () => {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            const sisa  = masuk - pakai;
            const sisaStyle = sisa <= 0
              ? 'color:#dc3545;font-weight:700;'
              : sisa < 3
                ? 'color:#fd7e14;font-weight:700;'
                : 'color:#28a745;font-weight:700;';
            const jenisLower = (row.jenis || '').toLowerCase();
            return `
              <td>${idx + 1}</td>
              <td>${utils.formatDate(row.tanggal_masuk)}</td>
              <td>${row.no_seri || '-'}</td>
              <td style="text-align: left;">${row.nama_barang || ''}</td>
              <td><span class="badge-jenis badge-${jenisLower}">${row.jenis || '-'}</span></td>
              <td>${row.satuan || ''}</td>
              <td style="text-align: right;">${utils.formatCurrency(parseInt(row.harga) || 0)}</td>
              <td style="text-align: center;">${masuk}</td>
              <td style="text-align: center;">${pakai}</td>
              <td style="text-align: center; ${sisaStyle}">${sisa}</td>
              <td style="text-align: left;">${row.nama_vendor || '-'}</td>
            `;
          }
        };

        return templates[tipe]();
      },

      calculateSummary() {
        const satuanData = {};
        let totalQty = 0;
        let grandTotal = 0;

        state.currentData.forEach(row => {
          const qty = utils.parseQty(row.jumlah);
          const satuan = row.satuan || 'unknown';
          const price = parseInt(row.harga) || 0;
          const value = qty * price;

          if (!satuanData[satuan]) satuanData[satuan] = { qty: 0, value: 0 };
          satuanData[satuan].qty += qty;
          satuanData[satuan].value += value;
          totalQty += qty;
          grandTotal += value;
        });

        return { satuanData, totalQty, grandTotal };
      },

      updateSummary() {
        const tipe = $('tipeLaporan').value;

        // ── Summary khusus Sisa Stok ──────────────────────────────────
        if (tipe === 'sisa_stok') {
          let totalMasuk = 0, totalPakai = 0, totalSisa = 0, nilaiSisa = 0;
          const satuanMap = {};

          state.currentData.forEach(row => {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            const sisa  = masuk - pakai;
            const harga = parseInt(row.harga) || 0;
            const satuan = row.satuan || 'unknown';

            totalMasuk += masuk;
            totalPakai += pakai;
            totalSisa  += sisa;
            nilaiSisa  += sisa * harga;

            if (!satuanMap[satuan]) satuanMap[satuan] = { masuk: 0, pakai: 0, sisa: 0, nilai: 0 };
            satuanMap[satuan].masuk  += masuk;
            satuanMap[satuan].pakai  += pakai;
            satuanMap[satuan].sisa   += sisa;
            satuanMap[satuan].nilai  += sisa * harga;
          });

          let html = '';

          Object.keys(satuanMap).sort().forEach(satuan => {
            const d = satuanMap[satuan];
            html += `
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;padding:4px 0;font-size:13px;">
                <span>Masuk (${utils.capitalize(satuan)}): <strong>${d.masuk}</strong>
                  &nbsp;|&nbsp; Dipakai: <strong>${d.pakai}</strong>
                  &nbsp;|&nbsp; Sisa: <strong>${d.sisa}</strong>
                </span>
                <span>Nilai Sisa: ${utils.formatCurrency(d.nilai)}</span>
              </div>`;
          });

          html += `<div style="border-top:2px solid #dee2e6;margin:12px 0;position:relative;">
            <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;padding:0 10px;color:#6c757d;font-size:12px;font-weight:500;">TOTAL KESELURUHAN</div>
          </div>`;

          html += `
            <div style="display:flex;justify-content:space-between;padding:8px 0;background:#f8f9fa;border-radius:4px;">
              <span style="font-weight:600;font-size:14px;">
                Masuk: ${totalMasuk} &nbsp;|&nbsp; Dipakai: ${totalPakai} &nbsp;|&nbsp; Sisa: ${totalSisa}
              </span>
              <span style="font-weight:700;font-size:15px;color:#28a745;">
                Nilai Sisa: ${utils.formatCurrency(nilaiSisa)}
              </span>
            </div>`;

          $('summary').innerHTML = html;
          return;
        }

        // ── Summary default untuk tipe lainnya ───────────────────────
        const summary = this.calculateSummary();
        let html = '';

        Object.keys(summary.satuanData).sort().forEach(satuan => {
          const data = summary.satuanData[satuan];
          if (data.qty > 0) {
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;">
              <span>Total Barang (${utils.capitalize(satuan)}): ${data.qty}</span>
              <span>${utils.formatCurrency(data.value)}</span>
            </div>`;
          }
        });

        if (html) {
          html += `<div style="border-top: 2px solid #dee2e6; margin: 15px 0; position: relative;">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; color: #6c757d; font-size: 12px; font-weight: 500;">TOTAL KESELURUHAN</div>
          </div>`;
        }

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; background: #f8f9fa; border-radius: 4px;">
          <span style="font-weight: 600; font-size: 15px;">Total Barang (Keseluruhan): ${summary.totalQty}</span>
          <span style="font-weight: 600; font-size: 15px; color: #28a745;">Grand Total: ${utils.formatCurrency(summary.grandTotal)}</span>
        </div>`;

        $('summary').innerHTML = html;
      },

      renderVendorAccordion(data) {
        document.getElementById('tableContainer').style.display = 'none';
        const container = $('vendorAccordion');
        container.style.display = 'block';
        container.innerHTML = '';

        if (!data.length) {
          container.innerHTML = '<div style="text-align:center;padding:40px;color:#6c757d;font-size:14px;">Tidak ada data vendor ditemukan</div>';
          this.updateSummary();
          return;
        }

        const groups = {};
        data.forEach(row => {
          const vendor = row.nama_vendor || '(Tanpa Vendor)';
          if (!groups[vendor]) groups[vendor] = [];
          groups[vendor].push(row);
        });

        Object.keys(groups).sort().forEach(vendorName => {
          const rows = groups[vendorName];
          let grandTotal = 0;
          const satuanMap = {};

          rows.forEach(row => {
            const qty = utils.parseQty(row.jumlah);
            const price = parseInt(row.harga) || 0;
            const total = qty * price;
            grandTotal += total;
            const satuan = row.satuan || '';
            if (!satuanMap[satuan]) satuanMap[satuan] = { qty: 0, total: 0 };
            satuanMap[satuan].qty += qty;
            satuanMap[satuan].total += total;
          });

          const rowsHTML = rows.map((row, idx) => {
            const qty = utils.parseQty(row.jumlah);
            const price = parseInt(row.harga) || 0;
            const total = qty * price;
            return `<tr>
              <td>${idx + 1}</td>
              <td>${utils.formatDate(row.tanggal)}</td>
              <td>${row.no_seri || '-'}</td>
              <td style="text-align:left;">${row.nama_sparepart || row.nama_barang || ''}</td>
              <td>${qty}</td>
              <td>${row.satuan || ''}</td>
              <td style="text-align:right;">${utils.formatCurrency(price)}</td>
              <td style="text-align:right;">${utils.formatCurrency(total)}</td>
            </tr>`;
          }).join('');

          const satuanSummary = Object.keys(satuanMap).filter(s => s).map(s =>
            `<span>${utils.capitalize(s)}: <strong>${satuanMap[s].qty}</strong></span>`
          ).join(' &nbsp;|&nbsp; ');

          const group = document.createElement('div');
          group.className = 'vendor-group';
          group.innerHTML = `
            <button type="button" class="vendor-group-header" onclick="toggleVendorGroup(this)">
              <div class="vendor-header-left">
                <span class="vendor-toggle-icon">▶</span>
                <span class="vendor-name">${vendorName}</span>
                <span class="vendor-item-count">${rows.length} item</span>
              </div>
              <div class="vendor-total-badge">Total: ${utils.formatCurrency(grandTotal)}</div>
            </button>
            <div class="vendor-group-body">
              <table class="vendor-detail-table">
                <thead>
                  <tr>
                    <th>No</th><th>Tanggal</th><th>No Seri</th>
                    <th>Nama Barang</th><th>Jumlah</th><th>Satuan</th>
                    <th>Harga Satuan</th><th>Total</th>
                  </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
              </table>
              <div class="vendor-mini-summary">
                <div class="vendor-mini-summary-items">${satuanSummary}</div>
                <div class="vendor-mini-summary-total">Grand Total: ${utils.formatCurrency(grandTotal)}</div>
              </div>
            </div>`;
          container.appendChild(group);
        });

        this.updateSummary();
      }
    };

    function toggleVendorGroup(btn) {
      btn.classList.toggle('is-open');
      btn.nextElementSibling.classList.toggle('is-open');
    }

    // Export Functions
    const exporter = {
      buildFilterInfo() {
        const tipe = $('tipeLaporan').value;
        const filters = [];

        if (tipe === 'stok') {
          if (state.currentFilter.jenisStok && state.currentFilter.jenisStok !== 'semua') filters.push(['Jenis Barang', utils.capitalize(state.currentFilter.jenisStok)]);
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
          if (state.currentFilter.jenisBarang !== 'semua') {
            const jenisLabel = state.currentFilter.jenisBarang === 'sparepart' ? 'Sparepart' : state.currentFilter.jenisBarang === 'ban' ? 'Ban' : 'Literan';
            filters.push(['Jenis Barang', jenisLabel]);
          }
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
          if (state.currentFilter.noSeri) filters.push(['No Seri', state.currentFilter.noSeri]);
          if (state.currentFilter.masukFilterType) {
            filters.push(['Periode Tanggal Masuk', CONFIG.filterLabels[state.currentFilter.masukFilterType]]);
            if (state.currentFilter.masukStart && state.currentFilter.masukEnd)
              filters.push(['Tanggal Masuk', state.currentFilter.masukStart === state.currentFilter.masukEnd ? state.currentFilter.masukStart : `${state.currentFilter.masukStart} s/d ${state.currentFilter.masukEnd}`]);
          }
          if (state.currentFilter.pemakaianFilterType) {
            filters.push(['Periode Tanggal Pemakaian', CONFIG.filterLabels[state.currentFilter.pemakaianFilterType]]);
            if (state.currentFilter.pemakaianFilterType !== 'semua' && state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd)
              filters.push(['Tanggal Pemakaian', state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? state.currentFilter.pemakaianStart : `${state.currentFilter.pemakaianStart} s/d ${state.currentFilter.pemakaianEnd}`]);
          }
        } else if (tipe === 'sisa_stok') {
          if (state.currentFilter.vendorNama)     filters.push(['Vendor',      state.currentFilter.vendorNama]);
          if (state.currentFilter.barang)         filters.push(['Nama Barang', state.currentFilter.barang]);
          if (state.currentFilter.kendaraanLabel) filters.push(['Kendaraan',   state.currentFilter.kendaraanLabel]);
          if (state.currentFilter.noSeri)         filters.push(['No Seri',     state.currentFilter.noSeri]);
          if (state.currentFilter.satuanFilter && state.currentFilter.satuanFilter !== 'semua')
            filters.push(['Satuan', utils.capitalize(state.currentFilter.satuanFilter)]);
          if (state.currentFilter.masukFilterType) {
            filters.push(['Periode Tanggal Masuk', CONFIG.filterLabels[state.currentFilter.masukFilterType]]);
            if (state.currentFilter.masukStart && state.currentFilter.masukEnd)
              filters.push(['Tanggal Masuk', state.currentFilter.masukStart === state.currentFilter.masukEnd ? state.currentFilter.masukStart : `${state.currentFilter.masukStart} s/d ${state.currentFilter.masukEnd}`]);
          }
          if (state.currentFilter.pemakaianFilterType) {
            filters.push(['Periode Tanggal Pemakaian', CONFIG.filterLabels[state.currentFilter.pemakaianFilterType]]);
            if (state.currentFilter.pemakaianFilterType !== 'semua' && state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd)
              filters.push(['Tanggal Pemakaian', state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? state.currentFilter.pemakaianStart : `${state.currentFilter.pemakaianStart} s/d ${state.currentFilter.pemakaianEnd}`]);
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
          if (state.currentFilter.kendaraanLabel)
            parts.push(state.currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          if (state.currentFilter.startDate && state.currentFilter.endDate)
            parts.push(state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
        } else if (tipe === 'vendor') {
          parts.push('Vendor');
          if (state.currentFilter.vendorNama) parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.satuanFilter !== 'semua') parts.push(state.currentFilter.satuanFilter);
          if (state.currentFilter.startDate && state.currentFilter.endDate)
            parts.push(state.currentFilter.startDate === state.currentFilter.endDate ? state.currentFilter.startDate : `${state.currentFilter.startDate}_sd_${state.currentFilter.endDate}`);
        } else if (tipe === 'pemakaian_vendor') {
          parts.push('PemakaianPerBon');
          if (state.currentFilter.vendorNama) parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.barang) parts.push(state.currentFilter.barang.replace(/\s+/g, '_'));
          if (state.currentFilter.noSeri) parts.push(state.currentFilter.noSeri.replace(/\s+/g, '_'));
          if (state.currentFilter.kendaraanLabel)
            parts.push(state.currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          if (state.currentFilter.masukStart && state.currentFilter.masukEnd)
            parts.push(state.currentFilter.masukStart === state.currentFilter.masukEnd ? `Masuk_${state.currentFilter.masukStart}` : `Masuk_${state.currentFilter.masukStart}_sd_${state.currentFilter.masukEnd}`);
          if (state.currentFilter.pemakaianFilterType !== 'semua' && state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd)
            parts.push(state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? `Pemakaian_${state.currentFilter.pemakaianStart}` : `Pemakaian_${state.currentFilter.pemakaianStart}_sd_${state.currentFilter.pemakaianEnd}`);
        } else if (tipe === 'sisa_stok') {
          parts.push('SisaStok');
          if (state.currentFilter.vendorNama)     parts.push(state.currentFilter.vendorNama.replace(/\s+/g, '_'));
          if (state.currentFilter.barang)         parts.push(state.currentFilter.barang.replace(/\s+/g, '_'));
          if (state.currentFilter.noSeri)         parts.push(state.currentFilter.noSeri.replace(/\s+/g, '_'));
          if (state.currentFilter.kendaraanLabel) parts.push(state.currentFilter.kendaraanLabel.replace(/[\s-]+/g, '_'));
          if (state.currentFilter.masukStart && state.currentFilter.masukEnd)
            parts.push(state.currentFilter.masukStart === state.currentFilter.masukEnd ? `Masuk_${state.currentFilter.masukStart}` : `Masuk_${state.currentFilter.masukStart}_sd_${state.currentFilter.masukEnd}`);
          if (state.currentFilter.pemakaianFilterType !== 'semua' && state.currentFilter.pemakaianStart && state.currentFilter.pemakaianEnd)
            parts.push(state.currentFilter.pemakaianStart === state.currentFilter.pemakaianEnd ? `Pakai_${state.currentFilter.pemakaianStart}` : `Pakai_${state.currentFilter.pemakaianStart}_sd_${state.currentFilter.pemakaianEnd}`);
        }

        parts.push(date);
        return `${parts.join('_')}.${ext}`;
      },

      toExcel() {
        if (!state.currentData.length) { alert('Tidak ada data untuk diekspor!'); return; }

        const tipe = $('tipeLaporan').value;
        const wsData = [];
        
        wsData.push([CONFIG.titles[tipe]]);
        wsData.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
        wsData.push([]);
        wsData.push(['FILTER YANG DITERAPKAN:']);
        this.buildFilterInfo().forEach(([label, value]) => wsData.push([`${label}: ${value}`]));
        wsData.push([]);

        if (tipe === 'vendor') {
          const groups = {};
          state.currentData.forEach(row => {
            const v = row.nama_vendor || '(Tanpa Vendor)';
            if (!groups[v]) groups[v] = [];
            groups[v].push(row);
          });
          let overallQty = 0, overallTotal = 0;
          Object.keys(groups).sort().forEach(vendorName => {
            const rows = groups[vendorName];
            wsData.push([`VENDOR: ${vendorName}`]);
            wsData.push(['No', 'Tanggal', 'No Seri', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total']);
            let vQty = 0, vTotal = 0;
            rows.forEach((row, idx) => {
              const qty = utils.parseQty(row.jumlah);
              const price = parseInt(row.harga) || 0;
              const total = qty * price;
              vQty += qty; vTotal += total;
              wsData.push([idx+1, utils.formatDate(row.tanggal), row.no_seri||'-', row.nama_sparepart||row.nama_barang||'', qty, row.satuan||'', price, total]);
            });
            overallQty += vQty; overallTotal += vTotal;
            wsData.push(['', '', '', 'Subtotal:', vQty, '', '', `Rp ${vTotal.toLocaleString('id-ID')}`]);
            wsData.push([]);
          });
          wsData.push(['RINGKASAN KESELURUHAN:']);
          wsData.push([`Total Item: ${overallQty}`, '', '', '', '', '', '', `Grand Total: Rp ${overallTotal.toLocaleString('id-ID')}`]);

          const ws = XLSX.utils.aoa_to_sheet(wsData);
          ws['!cols'] = [{wch:5},{wch:12},{wch:15},{wch:30},{wch:8},{wch:8},{wch:14},{wch:18}];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
          XLSX.writeFile(wb, this.generateFileName('xlsx'));
          return;
        }

        wsData.push(CONFIG.headers[tipe]);

        state.currentData.forEach((row, idx) => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;

          if (tipe === 'stok') {
            wsData.push([idx+1, row.no_seri||'-', row.nama_sparepart||row.nama_barang, qty, price, total, row.nama_vendor||'-', utils.formatDate(row.tanggal)]);
          } else if (tipe === 'kendaraan') {
            wsData.push([idx+1, utils.formatDate(row.tanggal), row.kendaraan||'-', row.nama_sparepart||row.nama_barang, qty, row.satuan, price, total, row.nama_vendor||'-', row.penanggung_jawab||'-', (row.nama_sparepart||'').startsWith('Ban ') ? (row.keterangan||'-') : (row.no_seri||'-')]);
          } else if (tipe === 'pemakaian_vendor') {
            wsData.push([idx+1, utils.formatDate(row.tanggal_masuk), row.no_seri||'-', row.nama_sparepart||row.nama_barang, qty, row.satuan, price, total, row.nama_vendor||'-', row.kendaraan||'-', utils.formatDate(row.tanggal_pemakaian)]);
          } else if (tipe === 'sisa_stok') {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            wsData.push([idx+1, utils.formatDate(row.tanggal_masuk), row.no_seri||'-', row.nama_barang||'', row.jenis||'-', row.satuan||'', parseInt(row.harga)||0, masuk, pakai, masuk-pakai, row.nama_vendor||'-']);
          }
        });

        // Summary
        wsData.push([]);
        wsData.push(['RINGKASAN:']);
        wsData.push([]);

        if (tipe === 'sisa_stok') {
          let totalMasuk = 0, totalPakai = 0, totalSisa = 0, nilaiSisa = 0;
          state.currentData.forEach(row => {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            totalMasuk += masuk; totalPakai += pakai; totalSisa += (masuk-pakai);
            nilaiSisa  += (masuk-pakai) * (parseInt(row.harga) || 0);
          });
          wsData.push([`Total Masuk: ${totalMasuk}`, `Total Dipakai: ${totalPakai}`, `Total Sisa: ${totalSisa}`]);
          wsData.push(['=====================================', '=====================================', '=====================================']);
          wsData.push([`Total Sisa Stok: ${totalSisa}`, `Nilai Sisa: Rp ${nilaiSisa.toLocaleString('id-ID')}`]);
        } else {
          const summary = dataHandler.calculateSummary();
          const satuanFilter = $('satuanFilter').value;
          if ((tipe === 'stok' || tipe === 'vendor') && satuanFilter !== 'semua') {
            const data = summary.satuanData[satuanFilter];
            if (data && data.qty > 0)
              wsData.push([`Total Barang (${utils.capitalize(satuanFilter)}): ${data.qty}`, `Total: Rp ${data.value.toLocaleString('id-ID')}`]);
          } else {
            Object.keys(summary.satuanData).sort().forEach(satuan => {
              const data = summary.satuanData[satuan];
              if (data.qty > 0)
                wsData.push([`Total Barang (${utils.capitalize(satuan)}): ${data.qty}`, `Total Harga (${utils.capitalize(satuan)}): Rp ${data.value.toLocaleString('id-ID')}`]);
            });
          }
          wsData.push(['', '', '']);
          wsData.push(['=====================================', '=====================================', '=====================================']);
          wsData.push([`Total Barang (Keseluruhan): ${summary.totalQty}`, `Grand Total: Rp ${summary.grandTotal.toLocaleString('id-ID')}`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const colWidths = tipe === 'sisa_stok' ? [
          {wch:5},{wch:12},{wch:15},{wch:30},{wch:10},{wch:8},{wch:14},{wch:12},{wch:12},{wch:12},{wch:20}
        ] : tipe === 'stok' ? [
          {wch:5},{wch:15},{wch:30},{wch:8},{wch:12},{wch:12},{wch:8},{wch:12},{wch:15},{wch:15},{wch:12}
        ] : tipe === 'vendor' ? [
          {wch:5},{wch:12},{wch:15},{wch:15},{wch:30},{wch:8},{wch:8},{wch:12},{wch:12},{wch:8},{wch:12},{wch:15}
        ] : [
          {wch:5},{wch:15},{wch:15},{wch:30},{wch:10},{wch:10},{wch:15},{wch:15},{wch:20},{wch:20},{wch:15}
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
        XLSX.writeFile(wb, this.generateFileName('xlsx'));
      },

      toPDF() {
        if (!state.currentData.length) { alert('Tidak ada data untuk diekspor!'); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const tipe = $('tipeLaporan').value;

        doc.setFontSize(16);
        doc.text(CONFIG.titles[tipe], 14, 15);
        doc.setFontSize(9);
        doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
        doc.text('FILTER YANG DITERAPKAN:', 14, 30);

        let yPos = 35;
        this.buildFilterInfo().forEach(([label, value]) => {
          doc.text(`${label}: ${value}`, 14, yPos);
          yPos += 5;
        });

        if (tipe === 'vendor') {
          const groups = {};
          state.currentData.forEach(row => {
            const v = row.nama_vendor || '(Tanpa Vendor)';
            if (!groups[v]) groups[v] = [];
            groups[v].push(row);
          });
          const vendorHead = [['No', 'Tanggal', 'No Seri', 'Nama Barang', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total']];
          let curY = yPos + 8;
          let overallQty = 0, overallTotal = 0;

          Object.keys(groups).sort().forEach(vendorName => {
            const rows = groups[vendorName];
            let vQty = 0, vTotal = 0;
            const vendorBody = rows.map((row, idx) => {
              const qty = utils.parseQty(row.jumlah);
              const price = parseInt(row.harga) || 0;
              const total = qty * price;
              vQty += qty; vTotal += total;
              return [idx+1, utils.formatDate(row.tanggal), row.no_seri||'-', row.nama_sparepart||row.nama_barang||'', qty, row.satuan||'', utils.formatCurrency(price), utils.formatCurrency(total)];
            });
            overallQty += vQty; overallTotal += vTotal;
            vendorBody.push(['', '', '', 'Subtotal:', vQty, '', '', utils.formatCurrency(vTotal)]);

            if (curY > 175) { doc.addPage(); curY = 20; }
            doc.setFontSize(9); doc.setFont(undefined, 'bold');
            doc.setTextColor(52, 58, 64);
            doc.text(`VENDOR: ${vendorName}`, 14, curY);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            curY += 4;

            doc.autoTable({
              head: vendorHead,
              body: vendorBody,
              startY: curY,
              styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: 0 },
              headStyles: { fillColor: [52, 58, 64], textColor: 255, fontStyle: 'bold', fontSize: 7 },
              alternateRowStyles: { fillColor: [245, 245, 245] },
              didParseCell: (data) => {
                if (data.section === 'body' && data.row.index === vendorBody.length - 1) {
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.fillColor = [230, 230, 230];
                }
              },
              margin: { left: 14, right: 14 }
            });
            curY = doc.lastAutoTable.finalY + 8;
          });

          if (curY + 20 > 200) { doc.addPage(); curY = 20; }
          doc.setFontSize(10); doc.setFont(undefined, 'bold');
          doc.text('RINGKASAN KESELURUHAN:', 14, curY);
          doc.setFont(undefined, 'normal'); doc.setFontSize(9);
          doc.text(`Total Item: ${overallQty}`, 14, curY + 6);
          doc.text(`Grand Total: ${utils.formatCurrency(overallTotal)}`, 160, curY + 6);
          doc.save(this.generateFileName('pdf'));
          return;
        }

        const tableData = state.currentData.map((row, idx) => {
          const qty = utils.parseQty(row.jumlah);
          const price = parseInt(row.harga) || 0;
          const total = qty * price;

          if (tipe === 'stok') {
            return [idx+1, row.no_seri||'-', row.nama_sparepart||row.nama_barang, qty, utils.formatCurrency(price), utils.formatCurrency(total), row.nama_vendor||'-', utils.formatDate(row.tanggal)];
          } else if (tipe === 'kendaraan') {
            return [idx+1, utils.formatDate(row.tanggal), row.kendaraan||'-', row.nama_sparepart||row.nama_barang, qty, row.satuan, utils.formatCurrency(price), utils.formatCurrency(total), row.nama_vendor||'-', row.penanggung_jawab||'-', (row.nama_sparepart||'').startsWith('Ban ') ? (row.keterangan||'-') : (row.no_seri||'-')];
          } else if (tipe === 'pemakaian_vendor') {
            return [idx+1, utils.formatDate(row.tanggal_masuk), row.no_seri||'-', row.nama_sparepart||row.nama_barang, qty, row.satuan, utils.formatCurrency(price), utils.formatCurrency(total), row.nama_vendor||'-', row.kendaraan||'-', utils.formatDate(row.tanggal_pemakaian)];
          } else if (tipe === 'sisa_stok') {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            return [idx+1, utils.formatDate(row.tanggal_masuk), row.no_seri||'-', row.nama_barang||'', row.jenis||'-', row.satuan||'', utils.formatCurrency(parseInt(row.harga)||0), masuk, pakai, masuk-pakai, row.nama_vendor||'-'];
          }
        });

        doc.autoTable({
          head: [CONFIG.headers[tipe]],
          body: tableData,
          startY: yPos + 8,
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: 0, fontStyle: 'normal' },
          headStyles: { fillColor: [52, 58, 64], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didParseCell: tipe === 'sisa_stok' ? (data) => {
            if (data.section === 'body' && data.column.index === 9) {
              const val = parseFloat(data.cell.raw);
              if (val <= 0) data.cell.styles.textColor = [220, 53, 69];
              else if (val < 3) data.cell.styles.textColor = [253, 126, 20];
              else data.cell.styles.textColor = [40, 167, 69];
              data.cell.styles.fontStyle = 'bold';
            }
          } : undefined
        });

        // ── Summary PDF ──────────────────────────────────────────────
        let finalY = doc.lastAutoTable.finalY + 15;
        const pageHeight = 210;
        const bottomMargin = 25;
        if (finalY + 40 + bottomMargin > pageHeight) { doc.addPage(); finalY = 25; }

        doc.setFontSize(10); doc.setFont(undefined, 'bold');
        doc.text('RINGKASAN:', 14, finalY);
        doc.setFont(undefined, 'normal'); doc.setFontSize(9);
        let summaryY = finalY + 7;

        if (tipe === 'sisa_stok') {
          let totalMasuk = 0, totalPakai = 0, totalSisa = 0, nilaiSisa = 0;
          state.currentData.forEach(row => {
            const masuk = parseFloat(row.jumlah_masuk) || 0;
            const pakai = parseFloat(row.jumlah_pakai) || 0;
            totalMasuk += masuk; totalPakai += pakai; totalSisa += (masuk-pakai);
            nilaiSisa  += (masuk-pakai) * (parseInt(row.harga)||0);
          });
          doc.text(`Total Masuk: ${totalMasuk}  |  Total Dipakai: ${totalPakai}  |  Total Sisa: ${totalSisa}`, 14, summaryY);
          summaryY += 6;
          doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
          doc.line(14, summaryY, 280, summaryY); doc.setLineWidth(0.2);
          summaryY += 6;
          doc.setFont(undefined, 'bold');
          doc.text(`Total Sisa Stok: ${totalSisa}`, 14, summaryY);
          doc.text(`Nilai Sisa: Rp ${nilaiSisa.toLocaleString('id-ID')}`, 200, summaryY);
          doc.setFont(undefined, 'normal');
        } else {
          const summary = dataHandler.calculateSummary();
          const satuanFilter = $('satuanFilter').value;

          if ((tipe === 'stok' || tipe === 'vendor') && satuanFilter !== 'semua') {
            const data = summary.satuanData[satuanFilter];
            if (data && data.qty > 0) {
              doc.text(`Total Barang (${utils.capitalize(satuanFilter)}): ${data.qty}`, 14, summaryY);
              doc.text(`Total Harga: Rp ${data.value.toLocaleString('id-ID')}`, 200, summaryY);
              summaryY += 7;
            }
          } else {
            Object.keys(summary.satuanData).sort().forEach(satuan => {
              const data = summary.satuanData[satuan];
              if (data.qty > 0) {
                doc.text(`Total Barang (${utils.capitalize(satuan)}): ${data.qty}`, 14, summaryY);
                doc.text(`Total Harga (${utils.capitalize(satuan)}): Rp ${data.value.toLocaleString('id-ID')}`, 200, summaryY);
                summaryY += 7;
              }
            });
          }

          if (Object.keys(summary.satuanData).some(s => summary.satuanData[s].qty > 0)) {
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
            doc.line(14, summaryY, 280, summaryY); doc.setLineWidth(0.2);
          }
          summaryY += 8;
          doc.setFont(undefined, 'bold');
          doc.text(`Total Barang (Keseluruhan): ${summary.totalQty}`, 14, summaryY);
          doc.text(`Grand Total: Rp ${summary.grandTotal.toLocaleString('id-ID')}`, 200, summaryY);
          doc.setFont(undefined, 'normal');
        }

        doc.save(this.generateFileName('pdf'));
      }
    };

    // ── Event Listeners ───────────────────────────────────────────────
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

    $('filterMasukType').addEventListener('change', function() {
      const isManual = this.value === 'manual';
      $('filterMasukStartGroup').classList.toggle('filter-hidden', !isManual);
      $('filterMasukEndGroup').classList.toggle('filter-hidden', !isManual);
      $('filterMasukStart').required = isManual;
      $('filterMasukEnd').required = isManual;
    });

    $('filterPemakaianType').addEventListener('change', function() {
      const isManual = this.value === 'manual';
      const isSemua  = this.value === 'semua';
      $('filterPemakaianStartGroup').classList.toggle('filter-hidden', !isManual || isSemua);
      $('filterPemakaianEndGroup').classList.toggle('filter-hidden', !isManual || isSemua);
      $('filterPemakaianStart').required = isManual && !isSemua;
      $('filterPemakaianEnd').required   = isManual && !isSemua;
    });

    $('barangFilter').addEventListener('input', function() {
      const tipe = $('tipeLaporan').value;
      if (tipe !== 'stok' && tipe !== 'pemakaian_vendor' && tipe !== 'sisa_stok') return;
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

      $('filterType').value      = 'hari';
      $('filterStart').value     = '';
      $('filterEnd').value       = '';
      $('vendorFilter').value    = '';
      $('kendaraanFilter').value = '';
      $('barangFilter').value    = '';
      $('stokFilter').value      = 'semua';
      $('satuanFilter').value    = 'semua';
      $('jenisStokFilter').value   = 'semua';
      $('jenisBarangFilter').value = 'semua';

      $('filterStartGroup').classList.add('filter-hidden');
      $('filterEndGroup').classList.add('filter-hidden');

      ui.resetSummary();
      ui.showLoading(tipe);

      const today = new Date().toISOString().split('T')[0];

      if (tipe === 'stok') {
        state.currentFilter = {
          vendor: '', barang: '', vendorNama: '',
          jenisStok: 'semua',
          stokFilter: 'semua', satuanFilter: 'semua',
          startDate: today, endDate: today,
          filterType: 'hari', tipe: 'stok'
        };
        try {
          const data = await api.fetch('/rekap?type=stok&jenis_barang=semua');
          state.allData = data;
          dataHandler.renderTable(dataHandler.applyFilters(data));
          ui.showLowStockAlert(dataHandler.applyFilters(data));
        } catch (error) {
          ui.showEmpty(tipe, 'Terjadi kesalahan saat memuat data');
        }
      } else if (tipe === 'kendaraan' || tipe === 'pemakaian_vendor' || tipe === 'sisa_stok') {
        if (tipe === 'pemakaian_vendor' || tipe === 'sisa_stok') {
          $('filterMasukType').value    = 'semua';
          $('filterMasukStart').value   = '';
          $('filterMasukEnd').value     = '';
          $('filterMasukStartGroup').classList.add('filter-hidden');
          $('filterMasukEndGroup').classList.add('filter-hidden');

          $('filterPemakaianType').value  = 'semua';
          $('filterPemakaianStart').value = '';
          $('filterPemakaianEnd').value   = '';
          $('filterPemakaianStartGroup').classList.add('filter-hidden');
          $('filterPemakaianEndGroup').classList.add('filter-hidden');

          $('noSeriFilter').value = '';
        }
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
      $('filterMasukType').dispatchEvent(new Event('change'));
      $('filterPemakaianType').dispatchEvent(new Event('change'));
      $('resetFilter').click();
    })();