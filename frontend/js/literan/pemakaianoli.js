    let reviewData = [];
    let editIndex = -1;
    let oliMap = {};
    let oliKeyToIdOliMasuk = {};
    let oliKeyToData = {};
    let originalStockMap = {};
    let kendaraanMap = {};
    let kendaraanLabelToId = {};
    let allOli = [];

    const oliInput = document.getElementById("oli_input");
    const jumlahPakaiInput = document.getElementById("jumlah_pakai");
    const stokInfoEl = document.getElementById("stokInfo");

    document.getElementById("tanggal_pakai").valueAsDate = new Date();

    // Format tanggal
    function formatTanggal(dateStr) {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // ===== LOAD DATA =====
    async function loadDatalistData() {
      try {
        const oliRes = await fetch("http://localhost:3000/stok_oli");
        const oliData = await oliRes.json();
        allOli = oliData.filter(o => parseFloat(o.total_stok || 0) > 0);

        const oliList = document.getElementById("oliList");
        oliList.innerHTML = "";
        oliKeyToIdOliMasuk = {};
        oliKeyToData = {};
        oliMap = {};
        originalStockMap = {};

        allOli.forEach(o => {
          const tglFormatted = formatTanggal(o.tanggal_masuk);
          const key = `${o.id} - ${tglFormatted} - ${o.nama_oli}`;
          
          let option = document.createElement("option");
          option.value = key;
          option.textContent = `${tglFormatted} - ${o.nama_oli} - Stok: ${parseFloat(o.total_stok).toFixed(2)}L`;
          oliList.appendChild(option);

          oliKeyToIdOliMasuk[key] = o.id_oli_masuk;
          oliKeyToData[key] = {
            nama_oli: o.nama_oli,
            no_seri: o.no_seri,
            stok: parseFloat(o.total_stok).toFixed(2),
            harga: o.harga || 0
          };
          oliMap[o.id] = `${o.nama_oli} (${o.no_seri})`;
          originalStockMap[key] = parseFloat(o.total_stok) || 0;
        });

        const kendaraanRes = await fetch("http://localhost:3000/kendaraan");
        const kendaraans = await kendaraanRes.json();
        const kendaraanList = document.getElementById("kendaraanList");
        kendaraanList.innerHTML = "";
        kendaraanLabelToId = {};
        kendaraanMap = {};
        
        kendaraans.forEach(k => {
          let label = `${k.dt_mobil} - ${k.plat}`;
          let option = document.createElement("option");
          option.value = label;
          kendaraanList.appendChild(option);
          kendaraanLabelToId[label] = k.id;
          kendaraanMap[k.id] = label;
        });
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Gagal memuat data. Cek koneksi server.");
      }
    }

    // ===== HITUNG STOK TERSEDIA =====
    function getAvailableStock(key, excludeIndex = -1) {
      if (!key || !originalStockMap.hasOwnProperty(key)) return null;
      let used = 0;
      reviewData.forEach((it, idx) => {
        if (it.oli_key === key && idx !== excludeIndex) {
          used += parseFloat(it.jumlah_pakai) || 0;
        }
      });
      return (originalStockMap[key] || 0) - used;
    }

    // ===== EVENT: INPUT OLI =====
    oliInput.addEventListener("change", function() {
      const key = this.value;
      const oliData = oliKeyToData[key];
      
      if (oliData) {
        const available = getAvailableStock(key, editIndex);
        if (available !== null) {
          const availNonNeg = Math.max(0, available);
          jumlahPakaiInput.max = availNonNeg;
          stokInfoEl.textContent = `Stok: ${availNonNeg.toFixed(2)}L`;
        }
      } else {
        stokInfoEl.textContent = "Stok: -";
        jumlahPakaiInput.removeAttribute("max");
      }
    });

    oliInput.addEventListener("dblclick", function() {
      this.value = "";
      stokInfoEl.textContent = "Stok: -";
      jumlahPakaiInput.value = "";
      jumlahPakaiInput.removeAttribute("max");
    });

    // ===== EVENT: KENDARAAN DOUBLE CLICK =====
    const kendaraanInput = document.getElementById("kendaraan_input");
    kendaraanInput.addEventListener("dblclick", function() {
      this.value = "";
      this.focus();
    });

    // ===== EVENT: INPUT JUMLAH =====
    jumlahPakaiInput.addEventListener("input", function() {
      const key = oliInput.value;
      const available = getAvailableStock(key, editIndex);
      
      if (available === null) {
        stokInfoEl.textContent = "Stok: -";
        return;
      }
      
      const availNonNeg = Math.max(0, available);
      let val = parseFloat(this.value) || 0;
      
      if (val > availNonNeg) {
        alert(`Jumlah tidak boleh melebihi stok (${availNonNeg.toFixed(2)}L)!`);
        this.value = availNonNeg.toFixed(2);
        val = availNonNeg;
      } else if (val < 0) {
        this.value = 0;
        val = 0;
      }
      
      const remaining = Math.max(0, availNonNeg - val);
      stokInfoEl.textContent = `Stok: ${remaining.toFixed(2)}L`;
    });

    // ===== SUBMIT FORM =====
    document.getElementById("oliForm").addEventListener("submit", (e) => {
      e.preventDefault();
      
      const key = oliInput.value;
      const idOliMasuk = oliKeyToIdOliMasuk[key] || "";
      const oliData = oliKeyToData[key];
      const namaOli = oliData ? oliData.nama_oli : "";
      const kendaraanLabel = document.getElementById("kendaraan_input").value;
      const idKendaraan = kendaraanLabelToId[kendaraanLabel] || "";

      if (!idOliMasuk || !idKendaraan) {
        alert("Pilih oli dan kendaraan dari daftar!");
        return;
      }

      const jumlahPakaiVal = parseFloat(jumlahPakaiInput.value) || 0;
      const exclude = editIndex === -1 ? -1 : editIndex;
      const available = getAvailableStock(key, exclude);
      const availNonNeg = available === null ? null : Math.max(0, available);

      if (availNonNeg === null) {
        alert("Stok oli tidak diketahui. Pilih oli yang valid.");
        return;
      }
      if (jumlahPakaiVal <= 0) {
        alert("Masukkan jumlah yang valid (lebih dari 0).");
        return;
      }
      if (jumlahPakaiVal > availNonNeg) {
        alert(`Jumlah tidak boleh melebihi stok (${availNonNeg.toFixed(2)}L)!`);
        return;
      }

      const data = {
        id_oli_masuk: idOliMasuk,
        oli_key: key,
        nama_oli: namaOli,
        id_kendaraan: idKendaraan,
        jumlah_pakai: jumlahPakaiVal,
        tanggal_pakai: document.getElementById("tanggal_pakai").value,
        keterangan: document.getElementById("keterangan").value || null
      };

      if (editIndex === -1) {
        reviewData.push(data);
      } else {
        reviewData[editIndex] = data;
        editIndex = -1;
      }

      renderTable();
      e.target.reset();
      document.getElementById("tanggal_pakai").valueAsDate = new Date();
      stokInfoEl.textContent = "Stok: -";
      jumlahPakaiInput.removeAttribute("max");
    });

    // ===== RENDER TABLE =====
    function renderTable() {
      const tbody = document.querySelector("#reviewTable tbody");
      tbody.innerHTML = "";
      let totalLiter = 0;

      reviewData.forEach((d, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${d.tanggal_pakai}</td>
          <td>${d.nama_oli}</td>
          <td>${kendaraanMap[d.id_kendaraan] || d.id_kendaraan}</td>
          <td>${parseFloat(d.jumlah_pakai).toFixed(2)}</td>
          <td>${d.keterangan || '-'}</td>
          <td>
            <button class="btn-sm btn-edit" onclick="editData(${i})">Edit</button>
            <button class="btn-sm btn-delete" onclick="hapusData(${i})">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
        totalLiter += parseFloat(d.jumlah_pakai) || 0;
      });

      document.getElementById("reviewSummary").innerHTML = 
        `<strong>Total Pemakaian Oli:</strong> ${totalLiter.toFixed(2)} Liter`;
    }

    // ===== EDIT DATA =====
    function editData(i) {
      const d = reviewData[i];
      editIndex = i;
      
      oliInput.value = d.oli_key;
      jumlahPakaiInput.value = parseFloat(d.jumlah_pakai).toFixed(2);
      document.getElementById("kendaraan_input").value = kendaraanMap[d.id_kendaraan] || "";
      document.getElementById("tanggal_pakai").value = d.tanggal_pakai;
      document.getElementById("keterangan").value = d.keterangan || "";

      const available = getAvailableStock(d.oli_key, editIndex);
      const availNonNeg = available === null ? null : Math.max(0, available);
      
      if (availNonNeg !== null) {
        const cur = parseFloat(d.jumlah_pakai) || 0;
        const remaining = Math.max(0, availNonNeg - cur);
        stokInfoEl.textContent = `Stok: ${remaining.toFixed(2)}L`;
        jumlahPakaiInput.max = availNonNeg;
      }
    }

    // ===== HAPUS DATA =====
    function hapusData(i) {
      if (!confirm('Apakah Anda yakin ingin menghapus data review ini?')) return;
      reviewData.splice(i, 1);
      if (editIndex === i) editIndex = -1;
      renderTable();
    }

    // ===== SIMPAN FINAL =====
    document.getElementById("finalSave").addEventListener("click", async () => {
      if (reviewData.length === 0) {
        alert("Tidak ada data untuk disimpan!");
        return;
      }
      if (!confirm('Simpan semua data ke database?')) return;

      try {
        for (let d of reviewData) {
          await fetch("http://localhost:3000/pemakaian_oli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tanggal_pakai: d.tanggal_pakai,
              id_oli_masuk: d.id_oli_masuk,
              id_kendaraan: d.id_kendaraan,
              jumlah_pakai: d.jumlah_pakai,
              keterangan: d.keterangan
            })
          });
        }
        alert("Data berhasil disimpan!");
        reviewData = [];
        renderTable();
        await loadDatalistData();
        stokInfoEl.textContent = "Stok: -";
      } catch (err) {
        console.error(err);
        alert("Gagal menyimpan. Cek koneksi / server.");
      }
    });

    window.editData = editData;
    window.hapusData = hapusData;

    loadDatalistData();