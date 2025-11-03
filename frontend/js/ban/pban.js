    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    const state = {
      kendaraanLabelToId: {},
      penukaranBanData: [],
      selectedPenukaran: null,
      banBaruLabelToId: {}
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    const formatKM = (value) => {
      if (!value) return "";
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const cleanKM = (value) => {
      return value.replace(/\./g, "");
    };

    const showAlert = (message) => {
      alert(message);
    };

    const scrollToForm = () => {
      document.getElementById("formContainer").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    };

    // ============================================================================
    // API FUNCTIONS
    // ============================================================================
    const api = {
      async fetchKendaraan() {
        const response = await fetch("http://localhost:3000/kendaraan");
        return await response.json();
      },

      async fetchBanTersedia() {
        const response = await fetch("http://localhost:3000/ban");
        return await response.json();
      },

      async fetchPenukaranBan() {
        const response = await fetch("http://localhost:3000/pban/all");
        return await response.json();
      },

      async updatePenukaranBan(id, data) {
        const response = await fetch(`http://localhost:3000/pban/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        return response;
      }
    };

    // ============================================================================
    // DATA LOADING FUNCTIONS
    // ============================================================================
    async function loadKendaraan() {
      const data = await api.fetchKendaraan();
      const datalist = document.getElementById("kendaraanList");
      datalist.innerHTML = "";

      data.forEach((kendaraan) => {
        const label = `${kendaraan.dt_mobil} - ${kendaraan.plat}`;
        state.kendaraanLabelToId[label] = kendaraan.id;
        datalist.insertAdjacentHTML("beforeend", `<option value="${label}"></option>`);
      });
    }

    async function loadBanBaru() {
      const data = await api.fetchBanTersedia();
      const datalist = document.getElementById("banBaruList");
      datalist.innerHTML = "";

      data.forEach((ban) => {
        const label = `${ban.no_seri} - ${ban.merk_ban}`;
        state.banBaruLabelToId[label] = ban.id;
        datalist.insertAdjacentHTML("beforeend", `<option value="${label}"></option>`);
      });
    }

    async function loadPenukaranBan(kendaraanId) {
      const data = await api.fetchPenukaranBan();
      state.penukaranBanData = data.filter(
        (item) => String(item.id_kendaraan) === String(kendaraanId)
      );
      renderPenukaranBanTable();
    }

    // ============================================================================
    // RENDER FUNCTIONS
    // ============================================================================

  function renderPenukaranBanTable() {
    const tbody = document.querySelector("#penukaranBanTable tbody");
    tbody.innerHTML = "";

    if (!state.penukaranBanData.length) {
      tbody.innerHTML = `<tr><td colspan="14" style="color:#888;">Data tidak ditemukan</td></tr>`;
      return;
    }

    state.penukaranBanData.forEach((item, index) => {
      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${item.seri_lama || "-"}</td>
          <td>${item.merk_lama || "-"}</td>
          <td>${item.tanggal_pasang_lama || "-"}</td>
          <td>${item.km_awal ? formatKM(item.km_awal) : "-"}</td>
          <td>${item.km_akhir ? formatKM(item.km_akhir) : "-"}</td>
          <td>${item.jarak_km === "ODO ERROR" ? "ODO ERROR" : (item.jarak_km ? formatKM(item.jarak_km) : "-")}</td>
          <td>${item.km_gps ? formatKM(item.km_gps) : "-"}</td>
          <td>${item.keterangan || "-"}</td>
          <td>${item.supir || "-"}</td>
          <td>${item.seri_ban_baru || "-"}</td>
          <td>${item.merk_baru || "-"}</td>
          <td>${item.tgl_pasang_ban_baru || "-"}</td>
          <td>
            <button class="btn btn-sm btn-edit" onclick="handleGantiBanClick(${index})">
              Ganti ban
            </button>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    });
  }

    // ============================================================================
    // FORM FUNCTIONS
    // ============================================================================
    function calculateJarakKM() {
      const kmAwal = cleanKM(document.getElementById("km_awal").value);
      const kmAkhir = cleanKM(document.getElementById("km_akhir").value);
      const jarakEl = document.getElementById("jarak_km");

      if (kmAwal && kmAkhir) {
        const diff = parseInt(kmAkhir) - parseInt(kmAwal);
        jarakEl.value = diff < 0 ? "ODO ERROR" : formatKM(diff);
      } else {
        jarakEl.value = "";
      }
    }

    function setupKMFormatting() {
      ["km_akhir", "km_gps"].forEach((id) => {
        const input = document.getElementById(id);
        const preview = document.getElementById(`${id}_preview`);

        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^0-9.]/g, "");
          const cleaned = cleanKM(input.value);

          if (cleaned) {
            input.value = formatKM(cleaned);
            preview.textContent = `${formatKM(cleaned)} km`;
          } else {
            preview.textContent = "";
          }
        });
      });
    }

    function showGantiBanForm(penukaran) {
      state.selectedPenukaran = penukaran;

      document.getElementById("formTitle").style.display = "block";
      document.getElementById("formContainer").style.display = "block";

      document.getElementById("gantiBanForm").reset();

      document.getElementById("seri_lama").value = penukaran.seri_ban_baru || "";
      document.getElementById("km_awal").value = penukaran.km_akhir ? formatKM(penukaran.km_akhir) : "";

      scrollToForm();
    }

    function hideGantiBanForm() {
      document.getElementById("formContainer").style.display = "none";
      document.getElementById("formTitle").style.display = "none";
      state.selectedPenukaran = null;
      document.getElementById("gantiBanForm").reset();
      document.getElementById("km_akhir_preview").textContent = "";
      document.getElementById("km_gps_preview").textContent = "";
    }

    function validateFormData() {
      if (!state.selectedPenukaran) {
        showAlert("Tidak ada data penukaran yang dipilih.");
        return false;
      }

      const kmAkhir = cleanKM(document.getElementById("km_akhir").value);
      if (!kmAkhir || isNaN(kmAkhir)) {
        showAlert("KM Akhir harus berupa angka.");
        return false;
      }

      const banLabel = document.getElementById("ban_baru_input").value;
      const banId = state.banBaruLabelToId[banLabel];
      if (!banId) {
        showAlert("Pilih ban baru dari daftar.");
        return false;
      }

      const tglPasang = document.getElementById("tgl_pasang_ban_baru").value;
      if (!tglPasang) {
        showAlert("Tanggal Pasang Ban Baru harus diisi.");
        return false;
      }

      return true;
    }

    function getFormData() {
      const banLabel = document.getElementById("ban_baru_input").value;
      const banId = state.banBaruLabelToId[banLabel];
      const [seriBanBaru, merkBanBaru] = banLabel.split(" - ");

      return {
        id: state.selectedPenukaran.id,
        seri_lama: document.getElementById("seri_lama").value,
        merk_lama: merkBanBaru,
        tanggal_pasang_lama: new Date().toISOString().slice(0, 10),
        km_awal: cleanKM(document.getElementById("km_awal").value),
        km_akhir: cleanKM(document.getElementById("km_akhir").value),
        jarak_km: cleanKM(document.getElementById("jarak_km").value),
        km_gps: cleanKM(document.getElementById("km_gps").value) || null,
        keterangan: document.getElementById("keterangan").value,
        id_stok: banId,
        tgl_pasang_ban_baru: document.getElementById("tgl_pasang_ban_baru").value,
        supir: document.getElementById("supir").value,
        seri_ban_baru: seriBanBaru,
        merk_baru: merkBanBaru
      };
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    function handleGantiBanClick(index) {
      const penukaran = state.penukaranBanData[index];
      showGantiBanForm(penukaran);
    }

    async function handleFormSubmit(event) {
      event.preventDefault();

      if (!validateFormData()) {
        return;
      }

      const formData = getFormData();
      const response = await api.updatePenukaranBan(formData.id, formData);

      if (!response.ok) {
        showAlert("Gagal menyimpan data.");
        return;
      }

      showAlert("Data penukaran ban berhasil diperbarui.");

      const kendaraanLabel = document.getElementById("kendaraan_input").value;
      const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
      if (kendaraanId) {
        await loadPenukaranBan(kendaraanId);
      }

      hideGantiBanForm();
    }

    function handleCancelClick() {
      hideGantiBanForm();
    }

    async function handleCariKendaraan() {
      const label = document.getElementById("kendaraan_input").value;
      const id = state.kendaraanLabelToId[label];

      if (id) {
        await loadPenukaranBan(id);
      } else {
        showAlert("Pilih kendaraan dari daftar yang tersedia.");
      }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function setupEventListeners() {
      document.getElementById("km_akhir").addEventListener("input", calculateJarakKM);
      document.getElementById("gantiBanForm").addEventListener("submit", handleFormSubmit);
      document.getElementById("cancelBtn").addEventListener("click", handleCancelClick);
      document.getElementById("cariKendaraanBtn").addEventListener("click", handleCariKendaraan);
    }

    async function initializeApp() {
      await loadKendaraan();
      await loadBanBaru();
      setupKMFormatting();
      setupEventListeners();
    }

    // Make handleGantiBanClick available globally for onclick attributes
    window.handleGantiBanClick = handleGantiBanClick;

    // Start the application when DOM is ready
    window.addEventListener("DOMContentLoaded", initializeApp);