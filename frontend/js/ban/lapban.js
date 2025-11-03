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
        // Ganti isi vendorFilter dan vendorFilterStok menjadi dropdown
        const vendorSelect1 = document.getElementById("vendorFilter");
        const vendorSelect2 = document.getElementById("vendorFilterStok");
        vendorSelect1.innerHTML = '<option value="">Semua Vendor</option>';
        vendorSelect2.innerHTML = '<option value="">Semua Vendor</option>';
        vendors.forEach(v => {
          const option1 = document.createElement("option");
          option1.value = v.id;
          option1.textContent = v.nama_vendor;
          vendorSelect1.appendChild(option1);

          const option2 = document.createElement("option");
          option2.value = v.id;
          option2.textContent = v.nama_vendor;
          vendorSelect2.appendChild(option2);

          vendorNameToId[v.nama_vendor] = v.id;
          vendorMap[v.id] = v.nama_vendor;
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
      if (!dateString || dateString === '0000-00-00') return '-';
      return new Date(dateString).toLocaleDateString("id-ID");
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

      const vendorId = document.getElementById("vendorFilter").value;
      const kendaraanLabel = document.getElementById("kendaraanFilter").value;
      const kendaraanId = kendaraanLabelToId[kendaraanLabel] || "";

      currentFilter = {
        startDate,
        endDate,
        vendor: vendorId,
        kendaraan: kendaraanId,
        filterType,
        vendorNama: vendorMap[vendorId] || "",
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
      const vendorId = document.getElementById("vendorFilterStok").value;
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
        vendorNama: vendorMap[vendorId] || "",
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

    // ============================================
    // EXPORT TO EXCEL FUNCTION
    // ============================================
    function exportExcel() {
      if (!currentData.length) {
        alert("Tidak ada data untuk diekspor!");
        return;
      }

      const wsData = [];
      const reportType = currentFilter.reportType;

      if (reportType === 'penukaran') {
        wsData.push(["Rekap Data Penukaran Ban"]);
        wsData.push([`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`]);
        wsData.push([`Vendor: ${currentFilter.vendorNama || "Semua"}`]);
        wsData.push([`Periode: ${currentFilter.startDate} s/d ${currentFilter.endDate}`]);
        wsData.push([]);
        wsData.push([
          "No", "Seri Lama", "Seri Baru", "Merk Ban", "Jml", "Satuan", 
          "Harga", "Vendor", "Kendaraan", "Supir", "Tgl Pasang", 
          "KM Awal", "KM Akhir", "Jarak KM", "KM GPS", "Keterangan"
        ]);

        currentData.forEach((row, index) => {
          wsData.push([
            index + 1,
            row.seri_lama || "-",
            row.no_seri || "-",
            row.merk_ban || "-",
            row.jumlah || "-",
            row.satuan || "-",
            parseInt(row.harga || 0),
            row.nama_vendor || "-",
            row.kendaraan || "-",
            row.supir || "-",
            formatDate(row.tgl_pasang_ban_baru),
            formatKM(row.km_awal),
            formatKM(row.km_akhir),
            formatJarakKM(row.jarak_km),
            formatKM(row.km_gps),
            row.keterangan || "-"
          ]);
        });

        wsData.push([]);
        wsData.push([`Total Ban: ${currentFilter.totalBan}`]);
        wsData.push([`Grand Total: Rp ${currentFilter.grandTotal.toLocaleString("id-ID")}`]);

      } else if (reportType === 'data_kendaraan') {
        wsData.push(["Rekap Data Kendaraan"]);
        wsData.push([`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`]);
        wsData.push([]);
        wsData.push([
          "No", "Kendaraan", "Supir", "Tgl Pasang (Ban Lama)", "Merk (Lama)", 
          "Seri Ban (Lama)", "KM Awal", "KM Akhir", "Jarak KM", "KM GPS", 
          "Keterangan", "Tgl Pasang (Ban Baru)", "Merk (Baru)", "Seri Ban (Baru)"
        ]);

        currentData.forEach((row, index) => {
          wsData.push([
            index + 1,
            row.kendaraan || "-",
            row.supir || "-",
            formatDate(row.tanggal_pasang_lama),
            row.merk_lama || "-",
            row.seri_lama || "-",
            formatKM(row.km_akhir),
            formatKM(row.km_awal),
            formatJarakKM(row.jarak_km),
            formatKM(row.km_gps),
            row.keterangan || "-",
            formatDate(row.tgl_pasang_ban_baru),
            row.merk_baru || "-",
            row.seri_ban_baru || "-"
          ]);
        });

        wsData.push([]);
        wsData.push([`Total Data: ${currentFilter.totalData}`]);

      } else {
        const title = reportType === 'ban_masuk' 
          ? "Rekap Data Ban Masuk" 
          : "Rekap Data Stok Ban (Belum Dipakai)";
        
        wsData.push([title]);
        wsData.push([`Merk Ban: ${currentFilter.merkBan || "Semua"}`]);
        wsData.push([`Vendor: ${currentFilter.vendorNama || "Semua"}`]);
        
        if (reportType === 'ban_masuk') {
          wsData.push([`Periode: ${currentFilter.startDate} s/d ${currentFilter.endDate}`]);
        }
        
        wsData.push([]);
        wsData.push([
          "No", "Tanggal Ban Masuk", "Merk Ban", "No. Seri", 
          "Jumlah", "Satuan", "Harga", "Vendor"
        ]);

        currentData.forEach((row, index) => {
          const jumlah = parseInt(row.jumlah) || 0;
          const harga = parseInt(row.harga) || 0;
          
          wsData.push([
            index + 1,
            formatDate(row.tgl_ban_masuk),
            row.merk_ban || "-",
            row.no_seri || "-",
            jumlah,
            row.satuan || "Unit",
            harga,
            row.nama_vendor || "-"
          ]);
        });

        wsData.push([]);
        wsData.push([`Total Ban: ${currentFilter.totalBan}`]);
        wsData.push([`Grand Total: Rp ${currentFilter.grandTotal.toLocaleString("id-ID")}`]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Ban");

      const fileName = generateFileName('xlsx');
      XLSX.writeFile(wb, fileName);
    }

    // ============================================
    // EXPORT TO PDF FUNCTION
    // ============================================
    function exportPDF() {
      if (!currentData.length) {
        alert("Tidak ada data untuk diekspor!");
        return;
      }

      const { jsPDF } = window.jspdf;
      const reportType = currentFilter.reportType;
      const orientation = (reportType === 'penukaran' || reportType === 'data_kendaraan') 
        ? 'landscape' 
        : 'portrait';
      const doc = new jsPDF(orientation);

      // Document Title
      doc.setFontSize(16);
      let title = "";
      if (reportType === 'penukaran') {
        title = "Rekap Data Penukaran Ban";
      } else if (reportType === 'data_kendaraan') {
        title = "Rekap Data Kendaraan";
      } else if (reportType === 'ban_masuk') {
        title = "Rekap Data Ban Masuk";
      } else {
        title = "Rekap Data Stok Ban (Belum Dipakai)";
      }
      doc.text(title, 14, 15);

      // Document Header Info
      doc.setFontSize(10);
      let startY = 25;

      if (reportType === 'data_kendaraan') {
        doc.text(`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`, 14, startY);
        startY = 35;
      } else if (reportType === 'stok') {
        doc.text(`Vendor: ${currentFilter.vendorNama || "Semua"}`, 14, startY);
        startY += 6;
        doc.text(`Merk Ban: ${currentFilter.merkBan || "Semua"}`, 14, startY);
        startY += 10;
      } else {
        doc.text(`Periode: ${currentFilter.startDate} s/d ${currentFilter.endDate}`, 14, startY);
        startY += 6;

        if (reportType === 'penukaran') {
          doc.text(`Vendor: ${currentFilter.vendorNama || "Semua"}`, 14, startY);
          startY += 6;
          doc.text(`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`, 14, startY);
          startY += 10;
        } else {
          doc.text(`Vendor: ${currentFilter.vendorNama || "Semua"}`, 14, startY);
          startY += 6;
          doc.text(`Merk Ban: ${currentFilter.merkBan || "Semua"}`, 14, startY);
          startY += 10;
        }
      }

      // Table Data Preparation
      let tableData = [];
      let tableHead = [];

      if (reportType === 'penukaran') {
        tableHead = [[
          "No", "Seri Lama", "Seri Baru", "Merk Ban", "Jml", "Satuan", 
          "Harga", "Vendor", "Kendaraan", "Supir", "Tgl Pasang", 
          "KM Awal", "KM Akhir", "Jarak KM", "KM GPS", "Ket"
        ]];
        
        tableData = currentData.map((row, index) => [
          index + 1,
          row.seri_lama || "-",
          row.no_seri || "-",
          row.merk_ban || "-",
          row.jumlah || "-",
          row.satuan || "-",
          formatCurrency(row.harga),
          row.nama_vendor || "-",
          row.kendaraan || "-",
          row.supir || "-",
          formatDate(row.tgl_pasang_ban_baru),
          formatKM(row.km_awal),
          formatKM(row.km_akhir),
          formatJarakKM(row.jarak_km),
          formatKM(row.km_gps),
          row.keterangan || "-"
        ]);

        doc.autoTable({
          head: tableHead,
          body: tableData,
          startY: startY,
          styles: { fontSize: 6 },
          columnStyles: {
            6: { halign: 'right' }
          }
        });

      } else if (reportType === 'data_kendaraan') {
        tableHead = [[
          "No", "Kendaraan", "Supir", "Tgl (Lama)", "Merk (Lama)", "Seri (Lama)", 
          "KM Awal", "KM Akhir", "Jarak", "KM GPS", "Ket", 
          "Tgl (Baru)", "Merk (Baru)", "Seri (Baru)"
        ]];
        
        tableData = currentData.map((row, index) => [
          index + 1,
          row.kendaraan || "-",
          row.supir || "-",
          formatDate(row.tanggal_pasang_lama),
          row.merk_lama || "-",
          row.seri_lama || "-",
          formatKM(row.km_akhir),
          formatKM(row.km_awal),
          formatJarakKM(row.jarak_km),
          formatKM(row.km_gps),
          row.keterangan || "-",
          formatDate(row.tgl_pasang_ban_baru),
          row.merk_baru || "-",
          row.seri_ban_baru || "-"
        ]);

        doc.autoTable({
          head: tableHead,
          body: tableData,
          startY: startY,
          styles: { fontSize: 6 }
        });

      } else {
        tableHead = [[
          "No", "Tgl Ban Masuk", "Merk Ban", "No. Seri", 
          "Jumlah", "Satuan", "Harga", "Vendor"
        ]];
        
        tableData = currentData.map((row, index) => [
          index + 1,
          formatDate(row.tgl_ban_masuk),
          row.merk_ban || "-",
          row.no_seri || "-",
          parseInt(row.jumlah) || 0,
          row.satuan || "Unit",
          formatCurrency(row.harga),
          row.nama_vendor || "-"
        ]);

        doc.autoTable({
          head: tableHead,
          body: tableData,
          startY: startY,
          styles: { fontSize: 9 },
          columnStyles: {
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            6: { halign: 'right' }
          }
        });
      }

      // Summary Footer
      const finalY = doc.lastAutoTable.finalY + 10;
      if (reportType === 'data_kendaraan') {
        doc.text(`Total Data: ${currentFilter.totalData}`, 14, finalY);
      } else {
        doc.text(`Total Ban: ${currentFilter.totalBan}`, 14, finalY);
        doc.text(`Grand Total: ${formatCurrency(currentFilter.grandTotal)}`, 14, finalY + 6);
      }

      const fileName = generateFileName('pdf');
      doc.save(fileName);
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

      // Show/Hide Table Headers
      document.getElementById('tableHeaderPenukaran').style.display = 
        reportType === 'penukaran' ? '' : 'none';
      document.getElementById('tableHeaderDataKendaraan').style.display = 
        reportType === 'data_kendaraan' ? '' : 'none';
      document.getElementById('tableHeaderStok').style.display = 
        (reportType === 'stok' || reportType === 'ban_masuk') ? '' : 'none';

      // Show/Hide Date Filters
      if (reportType === 'data_kendaraan' || reportType === 'stok') {
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
      
      // Load Initial Data
      applyFilter();
    });