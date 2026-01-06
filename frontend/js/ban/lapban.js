    // ============================================
    // GLOBAL VARIABLES
    // ============================================
    let vendorMap = {};
    let kendaraanMap = {};
    let vendorNameToId = {};
    let kendaraanLabelToId = {};
    let currentData = [];
    let currentFilter = {};

    // ============================================
    // MASTER DATA LOADERS
    // ============================================
    async function loadVendors() {
      try {
        const res = await fetch("http://localhost:3000/vendor");
        const vendors = await res.json();
        
        // Populate datalists untuk semua vendor filter
        const vendorList1 = document.getElementById("vendorList");
        const vendorList2 = document.getElementById("vendorListStok");
        const vendorList3 = document.getElementById("vendorListPemakaianPerMasuk");
        
        vendorList1.innerHTML = '';
        vendorList2.innerHTML = '';
        vendorList3.innerHTML = '';
        
        vendors.forEach(v => {
          // Simpan mapping
          vendorNameToId[v.nama_vendor] = v.id;
          vendorMap[v.id] = v.nama_vendor;
          
          // Tambahkan ke datalist 1
          const option1 = document.createElement("option");
          option1.value = v.nama_vendor;
          vendorList1.appendChild(option1);
          
          // Tambahkan ke datalist 2
          const option2 = document.createElement("option");
          option2.value = v.nama_vendor;
          vendorList2.appendChild(option2);
          
          // Tambahkan ke datalist 3
          const option3 = document.createElement("option");
          option3.value = v.nama_vendor;
          vendorList3.appendChild(option3);
        });
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    }

    async function loadKendaraan() {
      try {
        const res = await fetch("http://localhost:3000/kendaraan");
        const kendaraans = await res.json();
        const kendaraanList = document.getElementById("kendaraanFilterList");
        const kendaraanListData = document.getElementById("kendaraanFilterListData");
        
        kendaraanList.innerHTML = "";
        kendaraanListData.innerHTML = "";
        
        kendaraans.forEach(k => {
          const label = `${k.dt_mobil} - ${k.plat}`;
          
          const option1 = document.createElement("option");
          option1.value = label;
          kendaraanList.appendChild(option1);
          
          const option2 = document.createElement("option");
          option2.value = label;
          kendaraanListData.appendChild(option2);
          
          kendaraanLabelToId[label] = k.id;
          kendaraanMap[k.id] = label;
        });
      } catch (error) {
        console.error("Error loading kendaraan:", error);
      }
    }

    // ============================================
    // UI HELPER FUNCTIONS
    // ============================================
    function getColSpan(reportType) {
      if (reportType === 'stok' || reportType === 'ban_masuk') return 8;
      if (reportType === 'data_kendaraan') return 14;
      if (reportType === 'pemakaian_per_masuk') return 9;
      return 16;
    }

    function showLoading(reportType) {
      const tbody = document.querySelector("#rekapTable tbody");
      const colSpan = getColSpan(reportType);
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="loading">Memuat data...</td></tr>`;
    }

    function showEmpty(reportType, message = "Tidak ada data yang ditemukan") {
      const tbody = document.querySelector("#rekapTable tbody");
      const colSpan = getColSpan(reportType);
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">${message}</td></tr>`;
    }

    // ============================================
    // FORMATTING FUNCTIONS
    // ============================================
    function formatDate(dateString) {
      if (!dateString || dateString === '0000-00-00' || dateString === '') return '-';
      try {
        const raw = dateString.substring(0, 10); // YYYY-MM-DD
        const [year, month, day] = raw.split("-");
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
        const monthIndex = parseInt(month) - 1;
        const monthName = monthNames[monthIndex] || month;
        return `${day}-${monthName}-${year}`;
      } catch (e) {
        return '-';
      }
    }

    function formatKM(km) {
      if (!km) return "-";
      const num = parseInt(km.toString().replace(/\D/g, ""));
      if (isNaN(num)) return km;
      return num.toLocaleString("id-ID");
    }

    function formatJarakKM(value) {
      if (!value || value === '' || value === null || value === undefined) return '-';
      
      let strValue = String(value).trim();
      if (strValue === '' || strValue === '-') return '-';
      if (/[a-zA-Z]/.test(strValue)) return strValue;
      
      return formatKM(strValue);
    }

    function formatNumber(value) {
      const num = parseInt(value || 0);
      if (isNaN(num)) return '-';
      return num.toLocaleString("id-ID");
    }

    function formatCurrency(value) {
      return `Rp ${formatNumber(value)}`;
    }

    // ============================================
    // DATE RANGE CALCULATION
    // ============================================
    function getDateRange(filterType, startDate, endDate) {
      const today = new Date();

      if (filterType === "hari") {
        const date = today.toISOString().split("T")[0];
        return { startDate: date, endDate: date };
      } 
      
      if (filterType === "minggu") {
        endDate = today.toISOString().split("T")[0];
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 6);
        startDate = lastWeek.toISOString().split("T")[0];
        return { startDate, endDate };
      } 
      
      if (filterType === "bulan") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDate = firstDay.toISOString().split("T")[0];
        endDate = lastDay.toISOString().split("T")[0];
        return { startDate, endDate };
      }
      
      return { startDate, endDate };
    }

    // ============================================
    // TABLE RENDERING FUNCTIONS
    // ============================================
    function renderTablePenukaran(data) {
      currentData = data;
      const tbody = document.querySelector("#rekapTable tbody");
      tbody.innerHTML = "";
      
      let totalBan = 0;
      let grandTotal = 0;

      if (data.length === 0) {
        showEmpty('penukaran');
        document.getElementById("summary").innerHTML = `
          <strong>Total Ban:</strong> 0<br>
          <strong>Grand Total:</strong> Rp 0
        `;
        return;
      }

      data.forEach((row, index) => {
        totalBan += parseInt(row.jumlah) || 0;
        grandTotal += parseInt(row.harga) || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${row.seri_lama || '-'}</td>
          <td>${row.no_seri || '-'}</td>
          <td style="text-align: left;">${row.merk_ban || '-'}</td>
          <td>${row.jumlah || '-'}</td>
          <td>${row.satuan || '-'}</td>
          <td style="text-align: right;">${formatCurrency(row.harga)}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
          <td style="text-align: left;">${row.kendaraan || '-'}</td>
          <td style="text-align: left;">${row.supir || '-'}</td>
          <td>${formatDate(row.tgl_pasang_ban_baru)}</td>
          <td>${formatKM(row.km_awal)}</td>
          <td>${formatKM(row.km_akhir)}</td>
          <td>${formatJarakKM(row.jarak_km)}</td>
          <td>${formatKM(row.km_gps)}</td>
          <td>${row.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("summary").innerHTML = `
        <strong>Total Ban:</strong> ${totalBan}<br>
        <strong>Grand Total:</strong> ${formatCurrency(grandTotal)}
      `;
      
      currentFilter.totalBan = totalBan;
      currentFilter.grandTotal = grandTotal;
    }

    function renderTableDataKendaraan(data) {
      currentData = data;
      const tbody = document.querySelector("#rekapTable tbody");
      tbody.innerHTML = "";

      if (data.length === 0) {
        showEmpty('data_kendaraan');
        document.getElementById("summary").innerHTML = `<strong>Total Data:</strong> 0`;
        return;
      }

      data.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td style="text-align: left;">${row.kendaraan || '-'}</td>
          <td style="text-align: left;">${row.supir || '-'}</td>
          <td>${formatDate(row.tanggal_pasang_lama)}</td>
          <td style="text-align: left;">${row.merk_lama || '-'}</td>
          <td>${row.seri_lama || '-'}</td>
          <td>${formatKM(row.km_akhir)}</td>
          <td>${formatKM(row.km_awal)}</td>
          <td>${formatJarakKM(row.jarak_km)}</td>
          <td>${formatKM(row.km_gps)}</td>
          <td>${row.keterangan || '-'}</td>
          <td>${formatDate(row.tgl_pasang_ban_baru)}</td>
          <td style="text-align: left;">${row.merk_baru || '-'}</td>
          <td>${row.seri_ban_baru || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("summary").innerHTML = `<strong>Total Data:</strong> ${data.length}`;
      currentFilter.totalData = data.length;
    }

    function renderTableStok(data) {
      currentData = data;
      const tbody = document.querySelector("#rekapTable tbody");
      tbody.innerHTML = "";
      
      let totalBan = 0;
      let grandTotal = 0;

      if (data.length === 0) {
        showEmpty('stok');
        document.getElementById("summary").innerHTML = `
          <strong>Total Ban:</strong> 0<br>
          <strong>Grand Total:</strong> Rp 0
        `;
        return;
      }

      data.forEach((row, index) => {
        const jumlah = parseInt(row.jumlah) || 0;
        const harga = parseInt(row.harga) || 0;
        
        totalBan += jumlah;
        grandTotal += (harga * jumlah);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${formatDate(row.tgl_ban_masuk)}</td>
          <td style="text-align: left;">${row.merk_ban || '-'}</td>
          <td>${row.no_seri || '-'}</td>
          <td>${jumlah}</td>
          <td>${row.satuan || 'Unit'}</td>
          <td style="text-align: right;">${formatCurrency(harga)}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("summary").innerHTML = `
        <strong>Total Ban:</strong> ${totalBan}<br>
        <strong>Grand Total:</strong> ${formatCurrency(grandTotal)}
      `;
      
      currentFilter.totalBan = totalBan;
      currentFilter.grandTotal = grandTotal;
    }

    function renderTablePemakaianPerMasuk(data) {
      currentData = data;
      const tbody = document.querySelector("#rekapTable tbody");
      tbody.innerHTML = "";
      
      let totalBan = 0;
      let grandTotal = 0;

      if (data.length === 0) {
        showEmpty('pemakaian_per_masuk');
        document.getElementById("summary").innerHTML = `
          <strong>Total Ban:</strong> 0<br>
          <strong>Grand Total:</strong> Rp 0
        `;
        return;
      }

      data.forEach((row, index) => {
        const harga = parseInt(row.harga) || 0;
        
        totalBan += 1;
        grandTotal += harga;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${formatDate(row.tgl_ban_masuk)}</td>
          <td style="text-align: left;">${row.merk_ban || '-'}</td>
          <td>${row.no_seri || '-'}</td>
          <td style="text-align: right;">${formatCurrency(harga)}</td>
          <td style="text-align: left;">${row.nama_vendor || '-'}</td>
          <td style="text-align: left;">${row.kendaraan || '-'}</td>
          <td>${formatDate(row.tanggal_pemakaian)}</td>
          <td>${row.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("summary").innerHTML = `
        <strong>Total Ban:</strong> ${totalBan}<br>
        <strong>Grand Total:</strong> ${formatCurrency(grandTotal)}
      `;
      
      currentFilter.totalBan = totalBan;
      currentFilter.grandTotal = grandTotal;
    }

    // ============================================
    // FILTER APPLICATION FUNCTIONS
    // ============================================
    async function applyFilter() {
      const reportType = document.getElementById("reportType").value;
      showLoading(reportType);

      try {
        if (reportType === 'penukaran') {
          await applyFilterPenukaran();
        } else if (reportType === 'data_kendaraan') {
          await applyFilterDataKendaraan();
        } else if (reportType === 'pemakaian_per_masuk') {
          await applyFilterPemakaianPerMasuk();
        } else {
          await applyFilterStok(reportType);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showEmpty(reportType, "Terjadi kesalahan saat memuat data");
      }
    }

    async function applyFilterPenukaran() {
      const filterType = document.getElementById("filterType").value;
      let startDate = document.getElementById("filterStart").value;
      let endDate = document.getElementById("filterEnd").value;

      if (filterType === 'manual' && (!startDate || !endDate)) {
        alert("Harap isi tanggal mulai dan selesai untuk filter manual!");
        showEmpty('penukaran', "Silakan isi tanggal terlebih dahulu");
        return;
      }

      const dateRange = getDateRange(filterType, startDate, endDate);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;

      const vendorNama = document.getElementById("vendorFilter").value.trim(); 
      const vendorId = vendorNama ? vendorNameToId[vendorNama] : ''; 
      const kendaraanLabel = document.getElementById("kendaraanFilter").value;
      const kendaraanId = kendaraanLabelToId[kendaraanLabel] || "";

      currentFilter = {
        startDate,
        endDate,
        vendor: vendorId,
        kendaraan: kendaraanId,
        filterType,
        vendorNama: vendorNama,
        kendaraanLabel,
        reportType: 'penukaran'
      };

      const res = await fetch(`http://localhost:3000/rekap_ban?start=${startDate}&end=${endDate}&vendor=${vendorId}&kendaraan=${kendaraanId}`);
      const data = await res.json();
      renderTablePenukaran(data);
    }

async function applyFilterDataKendaraan() {
  const kendaraanLabel = document.getElementById("kendaraanFilterData").value;
  const kendaraanId = kendaraanLabelToId[kendaraanLabel];
  const kendaraanParam = kendaraanId || kendaraanLabel;

  currentFilter = {
    startDate: '',
    endDate: '',
    kendaraan: kendaraanParam,
    filterType: '',
    kendaraanLabel,
    reportType: 'data_kendaraan'
  };

  const res = await fetch(`http://localhost:3000/data_kendaraan?kendaraan=${encodeURIComponent(kendaraanParam)}`);
  const data = await res.json();
  renderTableDataKendaraan(data);
}

    async function applyFilterStok(reportType) {
      const vendorNama = document.getElementById("vendorFilterStok").value.trim();
      const vendorId = vendorNama ? vendorNameToId[vendorNama] : ''; 
      const merkBan = document.getElementById("merkBanFilter").value;

      let startDate = '';
      let endDate = '';
      let filterType = '';

      // Untuk ban_masuk tetap pakai filter waktu
      if (reportType === 'ban_masuk') {
        filterType = document.getElementById("filterType").value;
        startDate = document.getElementById("filterStart").value;
        endDate = document.getElementById("filterEnd").value;

        if (filterType === 'manual' && (!startDate || !endDate)) {
          alert("Harap isi tanggal mulai dan selesai untuk filter manual!");
          showEmpty(reportType, "Silakan isi tanggal terlebih dahulu");
          return;
        }

        const dateRange = getDateRange(filterType, startDate, endDate);
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      }

      currentFilter = {
        startDate,
        endDate,
        vendor: vendorId,
        merkBan,
        filterType,
        vendorNama: vendorNama,
        reportType
      };

      let endpoint = '';
      if (reportType === 'ban_masuk') {
        endpoint = 'ban_masuk';
      } else if (reportType === 'stok') {
        endpoint = 'ban/tersedia';
      } else {
        endpoint = 'stok_ban';
      }

      const res = await fetch(`http://localhost:3000/${endpoint}?start=${startDate}&end=${endDate}&vendor=${vendorId}&merkBan=${merkBan}`);
      const data = await res.json();
      renderTableStok(data);
    }

    async function applyFilterPemakaianPerMasuk() {
      const masukFilterType = document.getElementById("filterMasukTypePemakaian").value;
      let masukStart = document.getElementById("filterMasukStartPemakaian").value;
      let masukEnd = document.getElementById("filterMasukEndPemakaian").value;

      if (masukFilterType === 'manual' && (!masukStart || !masukEnd)) {
        alert("Harap isi tanggal mulai dan selesai untuk filter Tanggal Masuk (Manual)!");
        showEmpty('pemakaian_per_masuk', "Silakan isi tanggal Masuk terlebih dahulu");
        return;
      }

      const masukRange = getDateRange(masukFilterType, masukStart, masukEnd);
      masukStart = masukRange.startDate;
      masukEnd = masukRange.endDate;

      const pemakaianFilterType = document.getElementById("filterPemakaianTypePemakaian").value;
      let pemakaianStart = document.getElementById("filterPemakaianStartPemakaian").value;
      let pemakaianEnd = document.getElementById("filterPemakaianEndPemakaian").value;

      if (pemakaianFilterType === 'manual' && (!pemakaianStart || !pemakaianEnd)) {
        alert("Harap isi tanggal mulai dan selesai untuk filter Tanggal Pemakaian (Manual)!");
        showEmpty('pemakaian_per_masuk', "Silakan isi tanggal Pemakaian terlebih dahulu");
        return;
      }

      const pemakaianRange = getDateRange(pemakaianFilterType, pemakaianStart, pemakaianEnd);
      pemakaianStart = pemakaianRange.startDate;
      pemakaianEnd = pemakaianRange.endDate;

      const vendorNama = document.getElementById("vendorFilterPemakaianPerMasuk").value.trim();
      const vendorId = vendorNama ? vendorNameToId[vendorNama] : '';

      currentFilter = {
        masukStart,
        masukEnd,
        masukFilterType,
        pemakaianStart,
        pemakaianEnd,
        pemakaianFilterType,
        vendor: vendorId,
        vendorNama: vendorNama,
        reportType: 'pemakaian_per_masuk'
      };

      const params = new URLSearchParams();
      if (masukStart) params.append('masuk_start', masukStart);
      if (masukEnd) params.append('masuk_end', masukEnd);
      if (pemakaianStart) params.append('pemakaian_start', pemakaianStart);
      if (pemakaianEnd) params.append('pemakaian_end', pemakaianEnd);
      if (vendorId) params.append('vendor', vendorId);

      const res = await fetch(`http://localhost:3000/pemakaian_ban_per_masuk?${params.toString()}`);
      const data = await res.json();
      renderTablePemakaianPerMasuk(data);
    }
// ============================================
    // EXPORT FUNCTIONS (UPDATED)
    // ============================================
    
    const exportHelper = {
      // Build filter information for export
      buildFilterInfo() {
        const reportType = currentFilter.reportType;
        const filters = [];
        
        if (reportType === 'penukaran') {
          if (currentFilter.vendorNama) {
            filters.push(['Vendor', currentFilter.vendorNama]);
          }
          if (currentFilter.kendaraanLabel) {
            filters.push(['Kendaraan', currentFilter.kendaraanLabel]);
          }
          if (currentFilter.startDate && currentFilter.endDate) {
            const filterLabel = getFilterLabel(currentFilter.filterType);
            filters.push(['Periode', filterLabel]);
            filters.push(['Tanggal', currentFilter.startDate === currentFilter.endDate 
              ? currentFilter.startDate 
              : `${currentFilter.startDate} s/d ${currentFilter.endDate}`]);
          }
        } else if (reportType === 'data_kendaraan') {
          if (currentFilter.kendaraanLabel) {
            filters.push(['Kendaraan', currentFilter.kendaraanLabel]);
          }
        } else if (reportType === 'ban_masuk') {
          if (currentFilter.vendorNama) {
            filters.push(['Vendor', currentFilter.vendorNama]);
          }
          if (currentFilter.merkBan) {
            filters.push(['Merk Ban', currentFilter.merkBan]);
          }
          if (currentFilter.startDate && currentFilter.endDate) {
            const filterLabel = getFilterLabel(currentFilter.filterType);
            filters.push(['Periode', filterLabel]);
            filters.push(['Tanggal', currentFilter.startDate === currentFilter.endDate 
              ? currentFilter.startDate 
              : `${currentFilter.startDate} s/d ${currentFilter.endDate}`]);
          }
        } else if (reportType === 'stok') {
          if (currentFilter.vendorNama) {
            filters.push(['Vendor', currentFilter.vendorNama]);
          }
          if (currentFilter.merkBan) {
            filters.push(['Merk Ban', currentFilter.merkBan]);
          }
        } else if (reportType === 'pemakaian_per_masuk') {
          if (currentFilter.vendorNama) {
            filters.push(['Vendor', currentFilter.vendorNama]);
          }
          if (currentFilter.masukFilterType) {
            const masukLabel = getFilterLabel(currentFilter.masukFilterType);
            filters.push(['Periode Tanggal Masuk', masukLabel]);
            if (currentFilter.masukStart && currentFilter.masukEnd) {
              filters.push(['Tanggal Masuk', currentFilter.masukStart === currentFilter.masukEnd
                ? currentFilter.masukStart
                : `${currentFilter.masukStart} s/d ${currentFilter.masukEnd}`]);
            }
          }
          if (currentFilter.pemakaianFilterType) {
            const pakaiLabel = getFilterLabel(currentFilter.pemakaianFilterType);
            filters.push(['Periode Tanggal Pemakaian', pakaiLabel]);
            if (currentFilter.pemakaianStart && currentFilter.pemakaianEnd) {
              filters.push(['Tanggal Pemakaian', currentFilter.pemakaianStart === currentFilter.pemakaianEnd
                ? currentFilter.pemakaianStart
                : `${currentFilter.pemakaianStart} s/d ${currentFilter.pemakaianEnd}`]);
            }
          }
        }
        
        return filters;
      },
      
      // Generate filename based on filters
      generateFileName(ext) {
        const reportType = currentFilter.reportType;
        const date = new Date().toISOString().split('T')[0];
        const parts = ['Rekap'];
        
        if (reportType === 'penukaran') {
          parts.push('PenukaranBan');
          if (currentFilter.kendaraanLabel) {
            parts.push(currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          }
          if (currentFilter.vendorNama) {
            parts.push(currentFilter.vendorNama.replace(/\s+/g, '_'));
          }
          if (currentFilter.startDate && currentFilter.endDate) {
            parts.push(currentFilter.startDate === currentFilter.endDate 
              ? currentFilter.startDate 
              : `${currentFilter.startDate}_sd_${currentFilter.endDate}`);
          }
        } else if (reportType === 'data_kendaraan') {
          parts.push('DataKendaraan');
          if (currentFilter.kendaraanLabel) {
            parts.push(currentFilter.kendaraanLabel.replace(/\s+/g, '_').replace(/-/g, '_'));
          }
        } else if (reportType === 'ban_masuk') {
          parts.push('BanMasuk');
          if (currentFilter.vendorNama) {
            parts.push(currentFilter.vendorNama.replace(/\s+/g, '_'));
          }
          if (currentFilter.merkBan) {
            parts.push(currentFilter.merkBan.replace(/\s+/g, '_'));
          }
          if (currentFilter.startDate && currentFilter.endDate) {
            parts.push(currentFilter.startDate === currentFilter.endDate 
              ? currentFilter.startDate 
              : `${currentFilter.startDate}_sd_${currentFilter.endDate}`);
          }
        } else if (reportType === 'stok') {
          parts.push('StokBan');
          if (currentFilter.vendorNama) {
            parts.push(currentFilter.vendorNama.replace(/\s+/g, '_'));
          }
          if (currentFilter.merkBan) {
            parts.push(currentFilter.merkBan.replace(/\s+/g, '_'));
          }
        } else if (reportType === 'pemakaian_per_masuk') {
          parts.push('PemakaianBanPerMasuk');
          if (currentFilter.vendorNama) {
            parts.push(currentFilter.vendorNama.replace(/\s+/g, '_'));
          }
          if (currentFilter.masukStart && currentFilter.masukEnd) {
            parts.push(`Masuk_${currentFilter.masukStart === currentFilter.masukEnd ? currentFilter.masukStart : `${currentFilter.masukStart}_sd_${currentFilter.masukEnd}`}`);
          }
          if (currentFilter.pemakaianStart && currentFilter.pemakaianEnd) {
            parts.push(`Pemakaian_${currentFilter.pemakaianStart === currentFilter.pemakaianEnd ? currentFilter.pemakaianStart : `${currentFilter.pemakaianStart}_sd_${currentFilter.pemakaianEnd}`}`);
          }
        }
        
        parts.push(date);
        return `${parts.join('_')}.${ext}`;
      }
    };
    
    // Helper function to get filter label
    function getFilterLabel(filterType) {
      const labels = {
        'hari': 'Hari Ini',
        'minggu': '7 Hari Terakhir',
        'bulan': 'Bulan Ini',
        'manual': 'Tanggal Manual'
      };
      return labels[filterType] || filterType;
    }

    // ============================================
    // EXPORT TO EXCEL FUNCTION (UPDATED)
    // ============================================
    function exportExcel() {
      if (!currentData.length) {
        alert('Tidak ada data untuk diekspor!');
        return;
      }

      const reportType = currentFilter.reportType;
      const wsData = [];
      
      // Title
      let title = '';
      if (reportType === 'penukaran') {
        title = 'REKAP DATA PENUKARAN BAN';
      } else if (reportType === 'data_kendaraan') {
        title = 'REKAP DATA BAN KENDARAAN';
      } else if (reportType === 'ban_masuk') {
        title = 'REKAP DATA BAN MASUK';
      } else if (reportType === 'pemakaian_per_masuk') {
        title = 'REKAP PEMAKAIAN BAN PER MASUK';
      } else {
        title = 'REKAP DATA STOK BAN (BELUM DIPAKAI)';
      }
      
      wsData.push([title]);
      wsData.push([`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`]);
      wsData.push([]);
      wsData.push(['FILTER YANG DITERAPKAN:']);
      
      // Add filter information
      exportHelper.buildFilterInfo().forEach(([label, value]) => {
        wsData.push([`${label}: ${value}`]);
      });
      
      wsData.push([]);
      
      // Headers and Data
      if (reportType === 'penukaran') {
        wsData.push([
          'No', 'Seri Lama', 'Seri Baru', 'Merk Ban', 'Jumlah', 'Satuan', 
          'Harga', 'Vendor', 'Kendaraan', 'Supir', 'Tgl Pasang', 
          'KM Awal', 'KM Akhir', 'Jarak KM', 'KM GPS', 'Keterangan'
        ]);
        
        currentData.forEach((row, idx) => {
          wsData.push([
            idx + 1,
            row.seri_lama || '-',
            row.no_seri || '-',
            row.merk_ban || '-',
            parseInt(row.jumlah) || 0,
            row.satuan || '-',
            parseInt(row.harga) || 0,
            row.nama_vendor || '-',
            row.kendaraan || '-',
            row.supir || '-',
            formatDate(row.tgl_pasang_ban_baru),
            row.km_awal ? row.km_awal.toString().replace(/\D/g, '') : '-',
            row.km_akhir ? row.km_akhir.toString().replace(/\D/g, '') : '-',
            row.jarak_km || '-',
            row.km_gps ? row.km_gps.toString().replace(/\D/g, '') : '-',
            row.keterangan || '-'
          ]);
        });
        
      } else if (reportType === 'data_kendaraan') {
        wsData.push([
          'No', 'Kendaraan', 'Supir', 'Tgl Pasang (Lama)', 'Merk (Lama)', 
          'Seri Ban (Lama)', 'KM Awal', 'KM Akhir', 'Jarak KM', 'KM GPS', 
          'Keterangan', 'Tgl Pasang (Baru)', 'Merk (Baru)', 'Seri Ban (Baru)'
        ]);
        
        currentData.forEach((row, idx) => {
          wsData.push([
            idx + 1,
            row.kendaraan || '-',
            row.supir || '-',
            formatDate(row.tanggal_pasang_lama),
            row.merk_lama || '-',
            row.seri_lama || '-',
            row.km_akhir ? row.km_akhir.toString().replace(/\D/g, '') : '-',
            row.km_awal ? row.km_awal.toString().replace(/\D/g, '') : '-',
            row.jarak_km || '-',
            row.km_gps ? row.km_gps.toString().replace(/\D/g, '') : '-',
            row.keterangan || '-',
            formatDate(row.tgl_pasang_ban_baru),
            row.merk_baru || '-',
            row.seri_ban_baru || '-'
          ]);
        });
        
      } else if (reportType === 'pemakaian_per_masuk') {
        wsData.push([
          'No', 'Tanggal Ban Masuk', 'Merk Ban', 'Seri Ban', 
          'Harga', 'Vendor', 'Kendaraan', 'Tanggal Pemakaian', 'Keterangan'
        ]);
        
        currentData.forEach((row, idx) => {
          const harga = parseInt(row.harga) || 0;
          
          wsData.push([
            idx + 1,
            formatDate(row.tgl_ban_masuk),
            row.merk_ban || '-',
            row.no_seri || '-',
            harga,
            row.nama_vendor || '-',
            row.kendaraan || '-',
            formatDate(row.tanggal_pemakaian),
            row.keterangan || '-'
        ]);
      });
        
      } else if (reportType === 'pemakaian_per_masuk') {
        tableHead = [[
          'No', 'Tgl Ban Masuk', 'Merk Ban', 'Seri Ban', 
          'Harga', 'Vendor', 'Kendaraan', 'Tgl Pemakaian', 'Ket'
        ]];
        
        tableData = currentData.map((row, idx) => [
          idx + 1,
          formatDate(row.tgl_ban_masuk),
          row.merk_ban || '-',
          row.no_seri || '-',
          formatCurrency(row.harga),
          row.nama_vendor || '-',
          row.kendaraan || '-',
          formatDate(row.tanggal_pemakaian),
          row.keterangan || '-'
        ]);
        
      } else {
        wsData.push([
          'No', 'Tanggal Ban Masuk', 'Merk Ban', 'No. Seri', 
          'Jumlah', 'Satuan', 'Harga', 'Vendor'
        ]);
        
        currentData.forEach((row, idx) => {
          const jumlah = parseInt(row.jumlah) || 0;
          const harga = parseInt(row.harga) || 0;
          
          wsData.push([
            idx + 1,
            formatDate(row.tgl_ban_masuk),
            row.merk_ban || '-',
            row.no_seri || '-',
            jumlah,
            row.satuan || 'Unit',
            harga,
            row.nama_vendor || '-'
          ]);
        });
      }
      
      // Summary (skip for data_kendaraan)
      if (reportType !== 'data_kendaraan') {
        wsData.push([]);
        wsData.push(['RINGKASAN:']);
        wsData.push([]);
        wsData.push([`Total Ban: ${currentFilter.totalBan}`, `Grand Total: Rp ${currentFilter.grandTotal.toLocaleString('id-ID')}`]);
      }
      
      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Ban');
      XLSX.writeFile(wb, exportHelper.generateFileName('xlsx'));
    }

    // ============================================
    // EXPORT TO PDF FUNCTION (UPDATED)
    // ============================================
    function exportPDF() {
      if (!currentData.length) {
        alert('Tidak ada data untuk diekspor!');
        return;
      }

      const { jsPDF } = window.jspdf;
      const reportType = currentFilter.reportType;
      const orientation = 'l';
      const doc = new jsPDF(orientation, 'mm', 'a4');

      // Title
      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      let title = '';
      if (reportType === 'penukaran') {
        title = 'REKAP DATA PENUKARAN BAN';
      } else if (reportType === 'data_kendaraan') {
        title = 'REKAP DATA BAN KENDARAAN';
      } else if (reportType === 'ban_masuk') {
        title = 'REKAP DATA BAN MASUK';
      } else if (reportType === 'pemakaian_per_masuk') {
        title = 'REKAP PEMAKAIAN BAN PER MASUK';
      } else {
        title = 'REKAP DATA STOK BAN (BELUM DIPAKAI)';
      }
      doc.text(title, 14, 15);

      // Export date
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

      // Filter information
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('FILTER YANG DITERAPKAN:', 14, 30);

      let yPos = 35;
      exportHelper.buildFilterInfo().forEach(([label, value]) => {
        // For data_kendaraan, make kendaraan filter value bold
        if (reportType === 'data_kendaraan' && label === 'Kendaraan') {
          doc.setFont(undefined, 'normal');
          doc.text(`${label}: `, 14, yPos);
          const labelWidth = doc.getTextWidth(`${label}: `);
          doc.setFont(undefined, 'bold');
          doc.text(value, 14 + labelWidth, yPos);
          doc.setFont(undefined, 'normal');
        } else {
          doc.text(`${label}: ${value}`, 14, yPos);
        }
        yPos += 5;
      });

      // Table data
      let tableHead = [];
      let tableData = [];

      if (reportType === 'penukaran') {
        tableHead = [[
          'No', 'Seri Lama', 'Seri Baru', 'Merk Ban', 'Jml', 'Satuan', 
          'Harga', 'Vendor', 'Kendaraan', 'Supir', 'Tgl Pasang', 
          'KM Awal', 'KM Akhir', 'Jarak KM', 'KM GPS', 'Ket'
        ]];
        
        tableData = currentData.map((row, idx) => [
          idx + 1,
          row.seri_lama || '-',
          row.no_seri || '-',
          row.merk_ban || '-',
          row.jumlah || '-',
          row.satuan || '-',
          formatCurrency(row.harga),
          row.nama_vendor || '-',
          row.kendaraan || '-',
          row.supir || '-',
          formatDate(row.tgl_pasang_ban_baru),
          formatKM(row.km_awal),
          formatKM(row.km_akhir),
          formatJarakKM(row.jarak_km),
          formatKM(row.km_gps),
          row.keterangan || '-'
        ]);
        
      } else if (reportType === 'data_kendaraan') {
        tableHead = [[
          'No', 'Kendaraan', 'Supir', 'Tgl (Lama)', 'Merk (Lama)', 'Seri (Lama)', 
          'KM Awal', 'KM Akhir', 'Jarak', 'KM GPS', 'Ket', 
          'Tgl (Baru)', 'Merk (Baru)', 'Seri (Baru)'
        ]];
        
        tableData = currentData.map((row, idx) => [
          idx + 1,
          row.kendaraan || '-',
          row.supir || '-',
          formatDate(row.tanggal_pasang_lama),
          row.merk_lama || '-',
          row.seri_lama || '-',
          formatKM(row.km_akhir),
          formatKM(row.km_awal),
          formatJarakKM(row.jarak_km),
          formatKM(row.km_gps),
          row.keterangan || '-',
          formatDate(row.tgl_pasang_ban_baru),
          row.merk_baru || '-',
          row.seri_ban_baru || '-'
        ]);
        
      } else if (reportType === 'pemakaian_per_masuk') {
        tableHead = [[
          'No', 'Tgl Ban Masuk', 'Merk Ban', 'Seri Ban', 
          'Harga', 'Vendor', 'Kendaraan', 'Tgl Pemakaian', 'Ket'
        ]];
        
        tableData = currentData.map((row, idx) => [
          idx + 1,
          formatDate(row.tgl_ban_masuk),
          row.merk_ban || '-',
          row.no_seri || '-',
          formatCurrency(row.harga),
          row.nama_vendor || '-',
          row.kendaraan || '-',
          formatDate(row.tanggal_pemakaian),
          row.keterangan || '-'
        ]);
        
      } else {
        tableHead = [[
          'No', 'Tgl Ban Masuk', 'Merk Ban', 'No. Seri', 
          'Jumlah', 'Satuan', 'Harga', 'Vendor'
        ]];
        
        tableData = currentData.map((row, idx) => [
          idx + 1,
          formatDate(row.tgl_ban_masuk),
          row.merk_ban || '-',
          row.no_seri || '-',
          parseInt(row.jumlah) || 0,
          row.satuan || 'Unit',
          formatCurrency(row.harga),
          row.nama_vendor || '-'
        ]);
      }

      // Generate table
      doc.autoTable({
        head: tableHead,
        body: tableData,
        startY: yPos + 8,
        styles: {
          fontSize: reportType === 'penukaran' || reportType === 'data_kendaraan' ? 8 : 9,
          cellPadding: 2,
          overflow: 'linebreak',
          textColor: 0,
          fontStyle: 'normal'
        },
        headStyles: {
          fillColor: [52, 58, 64],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: reportType === 'penukaran' || reportType === 'data_kendaraan' ? 7 : 9
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: reportType === 'stok' || reportType === 'ban_masuk' ? {
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          6: { halign: 'right' }
        } : (reportType === 'penukaran' ? {
          6: { halign: 'right' }
        } : (reportType === 'pemakaian_per_masuk' ? {
          4: { halign: 'right' },
          1: { cellWidth: 25 },
          7: { cellWidth: 25 }
        } : {}))
      });

      // Summary (skip for data_kendaraan)
      if (reportType !== 'data_kendaraan') {
        const summaryHeight = 30;
        let finalY = doc.lastAutoTable.finalY + 15;
        const pageHeight = orientation === 'l' ? 210 : 297;
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

        const summaryY = finalY + 7;
        doc.text(`Total Ban: ${currentFilter.totalBan}`, 14, summaryY);
        const rightX = orientation === 'l' ? 200 : 140;
        doc.text(`Grand Total: Rp ${currentFilter.grandTotal.toLocaleString('id-ID')}`, rightX, summaryY);
      }

      doc.save(exportHelper.generateFileName('pdf'));
    }

    // ============================================
    // FILE NAME GENERATOR
    // ============================================
    function generateFileName(extension) {
      const reportType = currentFilter.reportType;
      let fileName = "";

      if (reportType === 'penukaran') {
        fileName = `Rekap_Penukaran_Ban_${currentFilter.startDate}_sd_${currentFilter.endDate}`;
      } else if (reportType === 'stok') {
        fileName = `Rekap_Stok_Ban`;
      } else if (reportType === 'ban_masuk') {
        fileName = `Rekap_Ban_Masuk_${currentFilter.startDate}_sd_${currentFilter.endDate}`;
      } else if (reportType === 'data_kendaraan') {
        const kendaraan = (currentFilter.kendaraanLabel || 'Semua').replace(/[^a-zA-Z0-9]/g, '_');
        fileName = `Rekap_Data_Kendaraan_${kendaraan}`;
      }

      return `${fileName}.${extension}`;
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Report Type Change Handler
    document.getElementById('reportType').addEventListener('change', function() {
      const reportType = this.value;
      const filterTypeGroup = document.getElementById('filterTypeGroup');
      const startDateGroup = document.getElementById('filterStartGroup');
      const endDateGroup = document.getElementById('filterEndGroup');

      // Show/Hide Filter Rows
      document.getElementById('filterRowPenukaran').style.display = 
        reportType === 'penukaran' ? 'flex' : 'none';
      document.getElementById('filterRowStok').style.display = 
        (reportType === 'stok' || reportType === 'ban_masuk') ? 'flex' : 'none';
      document.getElementById('filterRowDataKendaraan').style.display = 
        reportType === 'data_kendaraan' ? 'flex' : 'none';
      document.getElementById('filterRowPemakaianPerMasuk').style.display = 
        reportType === 'pemakaian_per_masuk' ? 'flex' : 'none';

      // Show/Hide Table Headers
      document.getElementById('tableHeaderPenukaran').style.display = 
        reportType === 'penukaran' ? '' : 'none';
      document.getElementById('tableHeaderDataKendaraan').style.display = 
        reportType === 'data_kendaraan' ? '' : 'none';
      document.getElementById('tableHeaderStok').style.display = 
        (reportType === 'stok' || reportType === 'ban_masuk') ? '' : 'none';
      document.getElementById('tableHeaderPemakaianPerMasuk').style.display = 
        reportType === 'pemakaian_per_masuk' ? '' : 'none';

      // Show/Hide Date Filters
      if (reportType === 'data_kendaraan' || reportType === 'stok' || reportType === 'pemakaian_per_masuk') {
        // For pemakaian per masuk we use the dedicated Masuk/Pemakaian filters instead
        filterTypeGroup.style.display = 'none';
        startDateGroup.style.display = 'none';
        endDateGroup.style.display = 'none';
      } else {
        filterTypeGroup.style.display = 'flex';
        if (document.getElementById('filterType').value === 'manual') {
          startDateGroup.style.display = 'flex';
          endDateGroup.style.display = 'flex';
        }
      }

      resetFilters();
      applyFilter();
    });

    // Filter Type Change Handler
    document.getElementById('filterType').addEventListener('change', function() {
      const filterType = this.value;
      const startGroup = document.getElementById('filterStartGroup');
      const endGroup = document.getElementById('filterEndGroup');
      const startInput = document.getElementById('filterStart');
      const endInput = document.getElementById('filterEnd');
      
      if (filterType === 'manual') {
        startGroup.style.display = 'flex';
        endGroup.style.display = 'flex';
        startInput.required = true;
        endInput.required = true;
      } else {
        startGroup.style.display = 'none';
        endGroup.style.display = 'none';
        startInput.required = false;
        endInput.required = false;
      }
    });

    // Masuk filter type change (Pemakaian per Masuk)
    const masukTypeEl = document.getElementById('filterMasukTypePemakaian');
    if (masukTypeEl) {
      masukTypeEl.addEventListener('change', function() {
        const val = this.value;
        const startGroup = document.getElementById('filterMasukStartGroupPemakaian');
        const endGroup = document.getElementById('filterMasukEndGroupPemakaian');
        if (val === 'manual') {
          startGroup.style.display = 'flex';
          endGroup.style.display = 'flex';
        } else {
          startGroup.style.display = 'none';
          endGroup.style.display = 'none';
        }
      });
    }

    // Pemakaian filter type change (Pemakaian per Masuk)
    const pakaiTypeEl = document.getElementById('filterPemakaianTypePemakaian');
    if (pakaiTypeEl) {
      pakaiTypeEl.addEventListener('change', function() {
        const val = this.value;
        const startGroup = document.getElementById('filterPemakaianStartGroupPemakaian');
        const endGroup = document.getElementById('filterPemakaianEndGroupPemakaian');
        if (val === 'manual') {
          startGroup.style.display = 'flex';
          endGroup.style.display = 'flex';
        } else {
          startGroup.style.display = 'none';
          endGroup.style.display = 'none';
        }
      });
    }

    // Form Submit Handler
    document.getElementById("filterForm").addEventListener("submit", (e) => {
      e.preventDefault();
      applyFilter();
    });

    // Reset Filter Handlers
    document.getElementById("resetFilterPenukaran").addEventListener("click", () => {
      document.getElementById("vendorFilter").value = "";
      document.getElementById("kendaraanFilter").value = "";
      resetDateFilters();
      applyFilter();
    });

    document.getElementById("resetFilterStok").addEventListener("click", () => {
      document.getElementById("vendorFilterStok").value = "";
      document.getElementById("merkBanFilter").value = "";
      resetDateFilters();
      applyFilter();
    });

    document.getElementById("resetFilterDataKendaraan").addEventListener("click", () => {
      document.getElementById("kendaraanFilterData").value = "";
      applyFilter();
    });

    document.getElementById("resetFilterPemakaianPerMasuk").addEventListener("click", () => {
      document.getElementById("vendorFilterPemakaianPerMasuk").value = "";
      // reset pemakaian per masuk specific filters
      if (document.getElementById('filterMasukTypePemakaian')) {
        document.getElementById('filterMasukTypePemakaian').value = 'hari';
        document.getElementById('filterMasukStartPemakaian').value = '';
        document.getElementById('filterMasukEndPemakaian').value = '';
        document.getElementById('filterMasukStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterMasukEndGroupPemakaian').style.display = 'none';
      }
      if (document.getElementById('filterPemakaianTypePemakaian')) {
        document.getElementById('filterPemakaianTypePemakaian').value = 'hari';
        document.getElementById('filterPemakaianStartPemakaian').value = '';
        document.getElementById('filterPemakaianEndPemakaian').value = '';
        document.getElementById('filterPemakaianStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterPemakaianEndGroupPemakaian').style.display = 'none';
      }
      applyFilter();
    });

    // Real-time Merk Ban Filter
    document.getElementById('merkBanFilter').addEventListener('input', function() {
      const reportType = document.getElementById('reportType').value;
      if (reportType === 'stok' || reportType === 'ban_masuk') {
        applyFilter();
      }
    });

    // Export Handlers
    document.getElementById("exportExcel").addEventListener("click", exportExcel);
    document.getElementById("exportPDF").addEventListener("click", exportPDF);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function resetDateFilters() {
      document.getElementById("filterType").value = "hari";
      document.getElementById("filterStart").value = "";
      document.getElementById("filterEnd").value = "";
      document.getElementById('filterStartGroup').style.display = 'none';
      document.getElementById('filterEndGroup').style.display = 'none';
    }

    function resetFilters() {
      resetDateFilters();
      document.getElementById("vendorFilter").value = "";
      document.getElementById("kendaraanFilter").value = "";
      document.getElementById("vendorFilterStok").value = "";
      document.getElementById("merkBanFilter").value = "";
      document.getElementById("kendaraanFilterData").value = "";
      document.getElementById("vendorFilterPemakaianPerMasuk").value = "";

      // Reset Pemakaian Per Masuk specific filters
      if (document.getElementById('filterMasukTypePemakaian')) {
        document.getElementById('filterMasukTypePemakaian').value = 'hari';
        document.getElementById('filterMasukStartPemakaian').value = '';
        document.getElementById('filterMasukEndPemakaian').value = '';
        document.getElementById('filterMasukStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterMasukEndGroupPemakaian').style.display = 'none';
      }
      if (document.getElementById('filterPemakaianTypePemakaian')) {
        document.getElementById('filterPemakaianTypePemakaian').value = 'hari';
        document.getElementById('filterPemakaianStartPemakaian').value = '';
        document.getElementById('filterPemakaianEndPemakaian').value = '';
        document.getElementById('filterPemakaianStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterPemakaianEndGroupPemakaian').style.display = 'none';
      }
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    window.addEventListener('load', function() {
      loadVendors();
      loadKendaraan();
      
      // Set Initial State
      document.getElementById("reportType").value = "penukaran";
      document.getElementById("filterType").value = "hari";
      document.getElementById('filterStartGroup').style.display = 'none';
      document.getElementById('filterEndGroup').style.display = 'none';

      // Initialize pemakaian per masuk filters (if present)
      if (document.getElementById('filterMasukTypePemakaian')) {
        document.getElementById('filterMasukTypePemakaian').value = 'hari';
        document.getElementById('filterMasukStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterMasukEndGroupPemakaian').style.display = 'none';
      }
      if (document.getElementById('filterPemakaianTypePemakaian')) {
        document.getElementById('filterPemakaianTypePemakaian').value = 'hari';
        document.getElementById('filterPemakaianStartGroupPemakaian').style.display = 'none';
        document.getElementById('filterPemakaianEndGroupPemakaian').style.display = 'none';
      }

      // Load Initial Data
      applyFilter();
    });