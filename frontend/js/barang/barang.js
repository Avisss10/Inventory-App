    let reviewData = [];
    let editIndex = -1;
    let vendorMap = {};
    let kendaraanMap = {};
    let vendorNameToId = {};
    let kendaraanLabelToId = {};

    const jumlah = document.getElementById("jumlah");
    const hargaDisplay = document.getElementById("harga_display");
    const hargaHidden = document.getElementById("harga");
    const total = document.getElementById("total");
    const satuan = document.getElementById("satuan");

    satuan.addEventListener("change", () => {
      if (satuan.value) {
        jumlah.disabled = false;
        if (satuan.value === "liter") {
          jumlah.step = "0.01";
        } else if (satuan.value === "pcs" || satuan.value === "set" || satuan.value === "lembar" || satuan.value === "meter") {
          jumlah.step = "1";
        }
      } else {
        jumlah.disabled = true;
        jumlah.value = "";
        hitungTotal();
      }
    });

    // Initially disable jumlah
    jumlah.disabled = true;

    function formatRupiah(angka) {
      return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    hargaDisplay.addEventListener("input", () => {
      let value = hargaDisplay.value.replace(/\D/g, "");
      if (value === "") {
        hargaDisplay.value = "";
        hargaHidden.value = "";
        total.value = "";
        return;
      }
      hargaHidden.value = value;
      hargaDisplay.value = formatRupiah(value);
      hitungTotal();
    });

    jumlah.addEventListener("input", hitungTotal);

    function hitungTotal() {
      const jml = parseFloat(jumlah.value) || 0;
      const hrg = parseFloat(hargaHidden.value) || 0;
      if (jml && hrg) {
        total.value = "Rp " + (jml * hrg).toLocaleString("id-ID");
      } else {
        total.value = "";
      }
    }

    document.getElementById("barangForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const vendorNama = document.getElementById("vendor_input").value;
      const kendaraanLabel = document.getElementById("kendaraan_input").value;
      const vendorId = vendorNameToId[vendorNama] || "";
      const kendaraanId = kendaraanLabelToId[kendaraanLabel] || "";

      const data = {
        no_seri: document.getElementById("no_seri").value,
        nama_barang: document.getElementById("nama_barang").value,
        merk: document.getElementById("merk").value,
        jumlah: document.getElementById("jumlah").value,
        satuan: document.getElementById("satuan").value,
        harga: hargaHidden.value,
        total: (parseFloat(document.getElementById("jumlah").value) || 0) * (parseFloat(hargaHidden.value) || 0),
        vendor_id: vendorId,
        kendaraan_id: kendaraanId,
        penanggung_jawab: document.getElementById("penanggung_jawab").value,
        tanggal: document.getElementById("tanggal").value
      };

      if (!vendorId || !kendaraanId) {
        alert("Pilih vendor dan kendaraan dari daftar!");
        return;
      }

      if (editIndex === -1) {
        reviewData.push(data);
      } else {
        reviewData[editIndex] = data;
        editIndex = -1;
      }

      renderTable();
      e.target.reset();
      hargaDisplay.value = "";
      hargaHidden.value = "";
      total.value = "";
      jumlah.disabled = true;
    });

    function renderTable() {
      const tbody = document.querySelector("#reviewTable tbody");
      tbody.innerHTML = "";
      let totalBarang = 0;
      let grandTotal = 0;

      reviewData.forEach((d, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${d.no_seri}</td>
          <td>${d.nama_barang}</td>
          <td>${d.merk}</td>
          <td>${d.jumlah}</td>
          <td>${d.satuan}</td>
          <td>Rp ${parseFloat(d.harga).toLocaleString("id-ID")}</td>
          <td>Rp ${parseFloat(d.total).toLocaleString("id-ID")}</td>
          <td>${vendorMap[d.vendor_id] || d.vendor_id}</td>
          <td>${kendaraanMap[d.kendaraan_id] || d.kendaraan_id}</td>
          <td>${d.penanggung_jawab}</td>
          <td>${d.tanggal}</td>
          <td>
            <button class="btn-sm btn-edit" onclick="editData(${i})">Edit</button>
            <button class="btn-sm btn-delete" onclick="hapusData(${i})">Delete</button>
          </td>
        `;
        tbody.appendChild(row);

        totalBarang += parseFloat(d.jumlah);
        grandTotal += parseFloat(d.total);
      });

      document.getElementById("reviewSummary").innerHTML = `
        <strong>Total Barang:</strong> ${totalBarang} <br>
        <strong>Grand Total:</strong> Rp ${grandTotal.toLocaleString("id-ID")}
      `;
    }

    function editData(i) {
      const d = reviewData[i];
      document.getElementById("no_seri").value = d.no_seri;
      document.getElementById("nama_barang").value = d.nama_barang;
      document.getElementById("merk").value = d.merk;
      document.getElementById("jumlah").value = d.jumlah;
      document.getElementById("satuan").value = d.satuan;
      hargaHidden.value = d.harga;
      hargaDisplay.value = formatRupiah(d.harga);
      total.value = "Rp " + parseFloat(d.total).toLocaleString("id-ID");
      document.getElementById("vendor_input").value = vendorMap[d.vendor_id] || "";
      document.getElementById("kendaraan_input").value = kendaraanMap[d.kendaraan_id] || "";
      document.getElementById("penanggung_jawab").value = d.penanggung_jawab;
      document.getElementById("tanggal").value = d.tanggal;
      editIndex = i;
      if (document.getElementById("satuan").value) {
        document.getElementById("jumlah").disabled = false;
        if (document.getElementById("satuan").value === "liter") {
          document.getElementById("jumlah").step = "0.01";
        } else if (document.getElementById("satuan").value === "pcs" || document.getElementById("satuan").value === "set" || document.getElementById("satuan").value === "lembar" || document.getElementById("satuan").value === "meter") {
          document.getElementById("jumlah").step = "1";
        }
      } else {
        document.getElementById("jumlah").disabled = true;
      }
    }

    function hapusData(i) {
      if (confirm('Apakah Anda yakin ingin menghapus data review ini?')) {
        reviewData.splice(i, 1);
        renderTable();
      }
    }

    document.getElementById("finalSave").addEventListener("click", async () => {
      if (reviewData.length === 0) {
        alert("Tidak ada data untuk disimpan!");
        return;
      }
      
      if (confirm('Simpan semua data ke database?')) {
        for (let d of reviewData) {
          await fetch("http://localhost:3000/api/barang", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(d)
          });
        }
        alert("Data berhasil disimpan!");
        reviewData = [];
        renderTable();
      }
    });

    async function loadDatalistData() {
      try {
        const vendorRes = await fetch("http://localhost:3000/api/vendor");
        const vendors = await vendorRes.json();
        const vendorList = document.getElementById("vendorList");
        vendorList.innerHTML = "";
        vendors.forEach(v => {
          let option = document.createElement("option");
          option.value = v.nama_vendor;
          vendorList.appendChild(option);
          vendorNameToId[v.nama_vendor] = v.id;
          vendorMap[v.id] = v.nama_vendor;
        });

        const kendaraanRes = await fetch("http://localhost:3000/api/kendaraan");
        const kendaraans = await kendaraanRes.json();
        const kendaraanList = document.getElementById("kendaraanList");
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
        console.error("Error loading data:", error);
      }
    }
    
    loadDatalistData();

    window.editData = editData;
    window.hapusData = hapusData;