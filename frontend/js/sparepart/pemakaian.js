    let reviewData = [];
    let editIndex = -1;
    let sparepartMap = {};
    let sparepartKeyToId = {};
    let satuanMap = {};
    let originalStockMap = {}; // stok asli dari server (tidak dimodifikasi)
    let kendaraanMap = {};
    let kendaraanLabelToId = {};
    let allSpareparts = [];
    let hargaMap = {};

    function getQuantityValue(val, unit) {
      if (unit.toLowerCase() === "liter") {
        return parseFloat(val) || 0;
      } else {
        return parseInt(val) || 0;
      }
    }

    const sparepartInput = document.getElementById("sparepart_input");
    const jumlahInput = document.getElementById("jumlah");
    const stokInfoEl = document.getElementById("stokInfo");

    document.getElementById("tanggal").valueAsDate = new Date();

    async function loadDatalistData() {
      try {
        // ambil sparepart
        const sparepartRes = await fetch("http://localhost:3000/stok_sparepart");
        const spareparts = await sparepartRes.json();
        allSpareparts = spareparts.filter(s => parseFloat(s.jumlah || 0) > 0);

        const sparepartList = document.getElementById("sparepartList");
        sparepartList.innerHTML = "";
        sparepartKeyToId = {};
        sparepartMap = {};
        satuanMap = {};
        originalStockMap = {};
        hargaMap = {};

        allSpareparts.forEach(s => {
          // asumsikan response memiliki fields: id, nama_sparepart, satuan, jumlah (stok), harga, tgl_sparepart_masuk
          const formattedDate = s.tgl_sparepart_masuk ? new Date(s.tgl_sparepart_masuk).toLocaleDateString('id-ID') : '-';
          const key = `${s.id} - ${formattedDate} - ${s.nama_sparepart}`;
          let option = document.createElement("option");
          option.value = key;
          option.textContent = `${s.id} - ${formattedDate} - ${s.nama_sparepart} - Stok: ${s.jumlah} - Rp ${s.harga}`;
          sparepartList.appendChild(option);

          sparepartKeyToId[key] = s.id;
          sparepartMap[s.id] = s.nama_sparepart;
          satuanMap[key] = s.satuan;
          originalStockMap[key] = parseFloat(s.jumlah) || 0;
          hargaMap[key] = s.harga;
        });

        // ambil kendaraan
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
      }
    }

    // hitung stok tersedia (original - sum dipakai di review).
    // excludeIndex berguna saat edit: jangan hitung quantity di index yang sedang diedit.
    function getAvailableStock(key, excludeIndex = -1) {
      if (!key || !originalStockMap.hasOwnProperty(key)) return null;
      let used = 0;
      reviewData.forEach((it, idx) => {
        if (it.sparepart_key === key && idx !== excludeIndex) {
          used += getQuantityValue(it.jumlah, it.satuan);
        }
      });
      return (originalStockMap[key] || 0) - used;
    }

    // filter datalist sparepart dan tampilkan stok + satuan otomatis
    sparepartInput.addEventListener("input", function() {
      const keyword = this.value.toLowerCase();
      const filtered = allSpareparts.filter(s => {
        const formattedDate = s.tgl_sparepart_masuk ? new Date(s.tgl_sparepart_masuk).toLocaleDateString('id-ID') : '-';
        const key = `${s.id} - ${formattedDate} - ${s.nama_sparepart}`;
        return key.toLowerCase().includes(keyword);
      });
      const sparepartList = document.getElementById("sparepartList");
      sparepartList.innerHTML = "";
      filtered.forEach(s => {
        const formattedDate = s.tgl_sparepart_masuk ? new Date(s.tgl_sparepart_masuk).toLocaleDateString('id-ID') : '-';
        const key = `${s.id} - ${formattedDate} - ${s.nama_sparepart}`;
        let option = document.createElement("option");
        option.value = key;
        option.textContent = `${s.id} - ${formattedDate} - ${s.nama_sparepart} - Stok: ${s.jumlah} - Rp ${s.harga}`;
        sparepartList.appendChild(option);
      });

      const key = this.value;

      // Set satuan input box with satuan from db or empty string
      if (satuanMap.hasOwnProperty(key)) {
        document.getElementById("satuan").value = satuanMap[key];
      } else {
        document.getElementById("satuan").value = "";
      }

      const unit = document.getElementById("satuan").value.toLowerCase();
      if (unit === "liter") {
        jumlahInput.step = "0.01";
      } else {
        jumlahInput.step = "1";
      }
      // Removed harga_sparepart input box usage, so no price set here
      // document.getElementById("harga_sparepart").value = hargaMap[key] !== undefined ? `Rp ${hargaMap[key]}` : "";

      const available = getAvailableStock(key, editIndex);
      if (available === null) {
        stokInfoEl.textContent = "Stok: -";
        jumlahInput.removeAttribute("max");
      } else {
        const availNonNeg = Math.max(0, available);
        // jika nilai jumlah sekarang melebihi available, sesuaikan
        let cur = getQuantityValue(jumlahInput.value, unit);
        if (cur > availNonNeg) {
          cur = availNonNeg;
          jumlahInput.value = cur;
        }
        jumlahInput.max = availNonNeg;
        const remaining = Math.max(0, availNonNeg - cur);
        stokInfoEl.textContent = `Stok: ${remaining}`;
      }
    });

    // saat mengetik jumlah => realtime kurangi display stok
    jumlahInput.addEventListener("input", function() {
      const key = sparepartInput.value;
      const available = getAvailableStock(key, editIndex);
      if (available === null) {
        stokInfoEl.textContent = "Stok: -";
        return;
      }
      const availNonNeg = Math.max(0, available);
      let val = getQuantityValue(this.value, document.getElementById("satuan").value);
      if (val > availNonNeg) {
        alert(`Jumlah tidak boleh melebihi stok (${availNonNeg})!`);
        this.value = availNonNeg;
        val = availNonNeg;
      } else if (val < 0) {
        this.value = 0;
        val = 0;
      }
      const remaining = Math.max(0, availNonNeg - val);
      stokInfoEl.textContent = `Stok: ${remaining}`;
    });

    document.getElementById("sparepartForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const key = sparepartInput.value;
      const sparepartId = sparepartKeyToId[key] || "";
      const nama = sparepartMap[sparepartId];
      const kendaraanLabel = document.getElementById("kendaraan_input").value;
      const kendaraanId = kendaraanLabelToId[kendaraanLabel] || "";

      if (!sparepartId || !kendaraanId) {
        alert("Pilih sparepart dan kendaraan dari daftar!");
        return;
      }

      const jumlahVal = getQuantityValue(document.getElementById("jumlah").value, document.getElementById("satuan").value);
      const exclude = editIndex === -1 ? -1 : editIndex;
      const available = getAvailableStock(key, exclude);
      const availNonNeg = available === null ? null : Math.max(0, available);

      if (availNonNeg === null) {
        alert("Stok sparepart tidak diketahui. Pilih sparepart yang valid.");
        return;
      }
      if (jumlahVal <= 0) {
        alert("Masukkan jumlah yang valid.");
        return;
      }
      if (jumlahVal > availNonNeg) {
        alert(`Jumlah tidak boleh melebihi stok (${availNonNeg})!`);
        return;
      }

      const data = {
        sparepart_id: sparepartId,
        sparepart_key: key,
        nama_sparepart: nama,
        jumlah: jumlahVal,
        satuan: document.getElementById("satuan").value,
        kendaraan_id: kendaraanId,
        penanggung_jawab: document.getElementById("penanggung_jawab").value,
        tanggal: document.getElementById("tanggal").value
      };

      if (editIndex === -1) {
        reviewData.push(data);
      } else {
        reviewData[editIndex] = data;
        editIndex = -1;
      }

      renderTable();
      e.target.reset();
      document.getElementById("tanggal").valueAsDate = new Date();
      stokInfoEl.textContent = "Stok: -";
      jumlahInput.removeAttribute("max");
    });

    function renderTable() {
      const tbody = document.querySelector("#reviewTable tbody");
      tbody.innerHTML = "";
      let totalBarang = 0;

      reviewData.forEach((d, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${d.nama_sparepart}</td>
          <td>${d.jumlah}</td>
          <td>${d.satuan}</td>
          <td>${kendaraanMap[d.kendaraan_id] || d.kendaraan_id}</td>
          <td>${d.penanggung_jawab}</td>
          <td>${d.tanggal}</td>
          <td>
            <button class="btn-sm btn-edit" onclick="editData(${i})">Edit</button>
            <button class="btn-sm btn-delete" onclick="hapusData(${i})">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
        totalBarang += parseFloat(d.jumlah) || 0;
      });

      document.getElementById("reviewSummary").innerHTML = `<strong>Total Sparepart Dipakai:</strong> ${totalBarang}`;
    }

    function editData(i) {
      const d = reviewData[i];
      editIndex = i; // penting: set dulu supaya getAvailableStock bisa exclude index ini
      // Set the sparepart key for the input
      sparepartInput.value = d.sparepart_key;
      jumlahInput.value = d.jumlah;
      // Set satuan from db value
      document.getElementById("satuan").value = satuanMap[d.sparepart_key] || d.satuan;
      document.getElementById("kendaraan_input").value = kendaraanMap[d.kendaraan_id] || "";
      document.getElementById("penanggung_jawab").value = d.penanggung_jawab;
      document.getElementById("tanggal").value = d.tanggal;
      // Removed harga_sparepart input box usage, so no price set here
      // document.getElementById("harga_sparepart").value = hargaMap[d.sparepart_key] !== undefined ? `Rp ${hargaMap[d.sparepart_key]}` : "";

      const available = getAvailableStock(d.sparepart_key, editIndex);
      const availNonNeg = available === null ? null : Math.max(0, available);
      if (availNonNeg === null) {
        stokInfoEl.textContent = "Stok: -";
        jumlahInput.removeAttribute("max");
      } else {
        // tampilkan sisa setelah nilai saat ini
        const cur = Number(d.jumlah) || 0;
        const remaining = Math.max(0, availNonNeg - cur);
        stokInfoEl.textContent = `Stok: ${remaining}`;
        jumlahInput.max = availNonNeg;
      }
    }

    function hapusData(i) {
      if (!confirm('Apakah Anda yakin ingin menghapus data review ini?')) return;
      reviewData.splice(i, 1);
      // jika sedang edit item yang dihapus, reset editIndex
      if (editIndex === i) editIndex = -1;
      renderTable();
    }

    document.getElementById("finalSave").addEventListener("click", async () => {
      if (reviewData.length === 0) {
        alert("Tidak ada data untuk disimpan!");
        return;
      }
      if (!confirm('Simpan semua data ke database?')) return;

      try {
        for (let d of reviewData) {
          await fetch("http://localhost:3000/pemakaian", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(d)
          });
        }
        alert("Data berhasil disimpan!");
        reviewData = [];
        renderTable();
        // refresh stok dari server (jika backend mengubah stok)
        await loadDatalistData();
        stokInfoEl.textContent = "Stok: -";
      } catch (err) {
        console.error(err);
        alert("Gagal menyimpan. Cek koneksi / server.");
      }
    });

    // expose functions ke window supaya tombol row bisa panggil
    window.editData = editData;
    window.hapusData = hapusData;

    // initial load
    loadDatalistData();