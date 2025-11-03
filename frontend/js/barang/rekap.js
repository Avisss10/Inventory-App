      let vendorMap = {};
      let kendaraanMap = {};
      let kendaraanLabelToId = {};
      let currentData = [];
      let currentFilter = {};

      function formatQuantity(qty) {
        const num = parseFloat(qty);
        return num % 1 === 0 ? num.toString() : num.toString();
      }

      // Ambil daftar barang untuk autocomplete
      async function loadBarangList() {
        try {
          const res = await fetch("http://localhost:3000/barang");
          const barangs = await res.json();
          const barangList = document.getElementById("barangList");
          barangList.innerHTML = "";
          barangs.forEach(b => {
            let option = document.createElement("option");
            option.value = b.nama_barang;
            barangList.appendChild(option);
          });
        } catch (error) {
          console.error("Error loading barang list:", error);
        }
      }
      loadBarangList();

      // Ambil data vendor & kendaraan
      async function loadFilters() {
        try {
          const vendorRes = await fetch("http://localhost:3000/vendor");
          const vendors = await vendorRes.json();
          const vendorSelect = document.getElementById("vendorFilter");
          vendorSelect.innerHTML = '<option value="">Semua Vendor</option>';
          vendors.forEach(v => {
            let option = document.createElement("option");
            option.value = v.id;
            option.textContent = v.nama_vendor;
            vendorSelect.appendChild(option);
            vendorMap[v.id] = v.nama_vendor;
          });

          const kendaraanRes = await fetch("http://localhost:3000/kendaraan");
          const kendaraans = await kendaraanRes.json();
          const kendaraanList = document.getElementById("kendaraanFilterList");
          kendaraanList.innerHTML = "";
          kendaraans.forEach(k => {
            let label = `${k.dt_mobil} - ${k.plat}`;
            let option = document.createElement("option");
            option.value = label;
            kendaraanList.appendChild(option);
            kendaraanLabelToId[label] = k.id;
            kendaraanMap[k.id] = label;
          });
        } catch (error) {
          console.error("Error loading filters:", error);
        }
      }
      loadFilters();

      // Auto-load today's data on page load
      window.addEventListener('load', function() {
        document.getElementById('resetFilter').click();
      });

      // Handle filter type change
      document.getElementById('filterType').addEventListener('change', function() {
        const filterType = this.value;
        const startGroup = document.getElementById('filterStart').parentElement;
        const endGroup = document.getElementById('filterEnd').parentElement;
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

      // Apply filter
      document.getElementById("filterForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const tbody = document.querySelector("#rekapTable tbody");
        tbody.innerHTML = '<tr><td colspan="12" class="loading">Memuat data...</td></tr>';
        
        const filterType = document.getElementById("filterType").value;
        const vendorId = document.getElementById("vendorFilter").value;
        const kendaraanLabel = document.getElementById("kendaraanFilter").value;
        const barang = document.getElementById("barangFilter").value;

        // Convert nama to ID for API call
        const kendaraanId = kendaraanLabelToId[kendaraanLabel] || "";

        let today = new Date();
        let startDate, endDate;

        if (filterType === "hari") {
          startDate = today.toISOString().split("T")[0];
          endDate = startDate;
        } else if (filterType === "minggu") {
          endDate = today.toISOString().split("T")[0];
          let lastWeek = new Date();
          lastWeek.setDate(today.getDate() - 6);
          startDate = lastWeek.toISOString().split("T")[0];
        } else if (filterType === "bulan") {
          let firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          let lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = firstDay.toISOString().split("T")[0];
          endDate = lastDay.toISOString().split("T")[0];
        } else {
          startDate = document.getElementById("filterStart").value;
          endDate = document.getElementById("filterEnd").value;
          
          if (!startDate || !endDate) {
            alert("Harap isi tanggal mulai dan selesai untuk filter manual!");
            return;
          }
        }

        currentFilter = { 
          startDate, 
          endDate, 
          vendor: vendorId, 
          vendorNama: vendorId ? vendorMap[vendorId] : "",
          kendaraan: kendaraanId, 
          barang, 
          filterType, 
          kendaraanLabel 
        };

        try {
          const res = await fetch(`http://localhost:3000/rekap_lama?start=${startDate}&end=${endDate}&vendor=${vendorId}&kendaraan=${kendaraanId}&barang=${barang}`);
          const data = await res.json();
          renderTable(data);
        } catch (error) {
          console.error("Error fetching data:", error);
          tbody.innerHTML = '<tr><td colspan="12" class="empty-state">Terjadi kesalahan saat memuat data</td></tr>';
        }
      });

      // Reset
      document.getElementById("resetFilter").addEventListener("click", async () => {
        document.getElementById("filterType").value = "hari";
        document.getElementById("filterStart").value = "";
        document.getElementById("filterEnd").value = "";
        document.getElementById("filterStart").parentElement.style.display = "none";
        document.getElementById("filterEnd").parentElement.style.display = "none";
        document.getElementById("vendorFilter").value = "";
        document.getElementById("kendaraanFilter").value = "";
        document.getElementById("barangFilter").value = "";

        const tbody = document.querySelector("#rekapTable tbody");
        tbody.innerHTML = '<tr><td colspan="12" class="loading">Memuat data...</td></tr>';

        let today = new Date();
        let startDate = today.toISOString().split("T")[0];
        let endDate = startDate;
        currentFilter = { startDate, endDate, vendor:"", kendaraan:"", barang:"", filterType:"hari", vendorNama:"", kendaraanLabel:"" };

        try {
          const res = await fetch(`http://localhost:3000/rekap_lama?start=${startDate}&end=${endDate}`);
          const data = await res.json();
          renderTable(data);
        } catch (error) {
          console.error("Error fetching data:", error);
          tbody.innerHTML = '<tr><td colspan="12" class="empty-state">Terjadi kesalahan saat memuat data</td></tr>';
        }
      });

      // Render tabel
      function renderTable(data) {
        currentData = data;
        const tbody = document.querySelector("#rekapTable tbody");
        tbody.innerHTML = "";
        let totalsByUnit = {};
        let grandTotalBarang = 0;
        let grandTotalHarga = 0;

        if (data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="12" class="empty-state">Tidak ada data yang ditemukan</td></tr>';
        } else {
          data.forEach((row, index) => {
            const qty = parseFloat(row.jumlah) || 0;
            const total = parseFloat(row.total) || 0;
            const unit = row.satuan;

            grandTotalBarang += qty;
            grandTotalHarga += total;

            if (!totalsByUnit[unit]) {
              totalsByUnit[unit] = { jumlah: 0, total: 0 };
            }
            totalsByUnit[unit].jumlah += qty;
            totalsByUnit[unit].total += total;

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${index + 1}</td>
              <td>${row.no_seri}</td>
              <td style="text-align: left;">${row.nama_barang}</td>
              <td style="text-align: left;">${row.merk}</td>
              <td>${formatQuantity(row.jumlah)}</td>
              <td>${row.satuan}</td>
              <td style="text-align: right;">Rp ${parseFloat(row.harga).toLocaleString("id-ID")}</td>
              <td style="text-align: right;">Rp ${parseFloat(row.total).toLocaleString("id-ID")}</td>
              <td style="text-align: left;">${row.nama_vendor || '-'}</td>
              <td style="text-align: left;">${row.kendaraan || '-'}</td>
              <td style="text-align: left;">${row.penanggung_jawab || '-'}</td>
              <td>${new Date(row.tanggal).toLocaleDateString("id-ID")}</td>
            `;
            tbody.appendChild(tr);
          });
        }

        const units = ['Pcs', 'Liter', 'Set', 'Lembar', 'Meter'];
        let summaryHTML = '';
        units.forEach(unit => {
          const unitData = totalsByUnit[unit] || { jumlah: 0, total: 0 };
          summaryHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Total Barang (${unit}): ${unitData.jumlah}</span><span>Rp ${unitData.total.toLocaleString("id-ID")}</span></div>`;
        });
        summaryHTML += `<div style="font-weight: bold; border-top: 2px solid #dee2e6; padding-top: 10px;">GRAND TOTAL: Rp ${grandTotalHarga.toLocaleString("id-ID")}</div>`;

        document.getElementById("summary").innerHTML = summaryHTML;

        currentFilter.totalsByUnit = totalsByUnit;
        currentFilter.grandTotalBarang = grandTotalBarang;
        currentFilter.grandTotalHarga = grandTotalHarga;
      }

      // Export Excel
      document.getElementById("exportExcel").addEventListener("click", () => {
        if (!currentData.length) {
          alert("Tidak ada data untuk diekspor!");
          return;
        }

        const wsData = [];
        wsData.push(["Rekap Data Pemakaian Barang"]);
        wsData.push([`Barang: ${currentFilter.barang || "Semua"}`]);
        wsData.push([`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`]);
        wsData.push([`Vendor: ${currentFilter.vendorNama || "Semua"}`]);
        wsData.push([`Periode: ${currentFilter.startDate} s/d ${currentFilter.endDate}`]);
        wsData.push([]);

        wsData.push(["No", "No Seri","Nama Barang","Merk","Jumlah","Satuan","Harga Satuan","Total","Vendor","Kendaraan","Penanggung Jawab","Tanggal"]);

        currentData.forEach((row, index) => {
          wsData.push([
            index + 1,
            row.no_seri,
            row.nama_barang,
            row.merk,
            formatQuantity(row.jumlah),
            row.satuan,
            row.harga,
            row.total,
            row.nama_vendor || "-",
            row.kendaraan || "-",
            row.penanggung_jawab || "-",
            new Date(row.tanggal).toLocaleDateString("id-ID")
          ]);
        });

        wsData.push([]);
        wsData.push([`Total Barang: ${currentFilter.totalBarang}`]);
        wsData.push([`Grand Total: Rp ${currentFilter.grandTotal.toLocaleString("id-ID")}`]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap");

        // Generate filename based on active filters
        const barangFilter = currentFilter.barang ? currentFilter.barang.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua';
        const vendorFilter = currentFilter.vendorNama ? currentFilter.vendorNama.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua';
        const kendaraanFilter = currentFilter.kendaraanLabel ? currentFilter.kendaraanLabel.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_') : 'Semua';

        const fileName = `Rekap_Barang_${barangFilter}_${vendorFilter}_${kendaraanFilter}_${currentFilter.startDate}_sd_${currentFilter.endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
      });

      // Export PDF
      document.getElementById("exportPDF").addEventListener("click", () => {
        if (!currentData.length) {
          alert("Tidak ada data untuk diekspor!");
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Rekap Data Barang", 14, 15);

        doc.setFontSize(10);
        doc.text(`Periode: ${currentFilter.startDate} s/d ${currentFilter.endDate}`, 14, 25);
        doc.text(`Vendor: ${currentFilter.vendorNama || "Semua"}`, 14, 31);
        doc.text(`Kendaraan: ${currentFilter.kendaraanLabel || "Semua"}`, 14, 37);
        doc.text(`Barang: ${currentFilter.barang || "Semua"}`, 14, 43);

        const tableData = currentData.map((row, index) => [
          index + 1,
          row.no_seri,
          row.nama_barang,
          row.merk,
          formatQuantity(row.jumlah),
          row.satuan,
          `Rp ${parseInt(row.harga).toLocaleString("id-ID")}`,
          `Rp ${parseInt(row.total).toLocaleString("id-ID")}`,
          row.nama_vendor || "-",
          row.kendaraan || "-",
          row.penanggung_jawab || "-",
          new Date(row.tanggal).toLocaleDateString("id-ID")
        ]);

        doc.autoTable({
          head: [["No","No Seri","Nama Barang","Merk","Jumlah","Satuan","Harga Satuan","Total","Vendor","Kendaraan","Penanggung Jawab","Tanggal"]],
          body: tableData,
          startY: 50,
          styles: { fontSize: 7 },
          columnStyles: {
            2: {cellWidth: 25}, // Nama Barang
            3: {cellWidth: 20}, // Merk
            6: {halign: 'right'}, // Harga Satuan
            7: {halign: 'right'}, // Total
          }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Total Barang: ${currentFilter.totalBarang}`, 14, finalY);
        doc.text(`Grand Total: Rp ${currentFilter.grandTotal.toLocaleString("id-ID")}`, 14, finalY + 6);

        // Generate filename based on active filters
        const barangFilter = currentFilter.barang ? currentFilter.barang.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua';
        const vendorFilter = currentFilter.vendorNama ? currentFilter.vendorNama.replace(/[^a-zA-Z0-9]/g, '_') : 'Semua';
        const kendaraanFilter = currentFilter.kendaraanLabel ? currentFilter.kendaraanLabel.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_') : 'Semua';

        const fileName = `Rekap_Barang_${barangFilter}_${vendorFilter}_${kendaraanFilter}_${currentFilter.startDate}_sd_${currentFilter.endDate}.pdf`;
        doc.save(fileName);
      });

      // Initialize filter type display
      document.getElementById('filterType').dispatchEvent(new Event('change'));