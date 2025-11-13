// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const state = {
  kendaraanLabelToId: {},
  penukaranBanData: [],
  selectedPenukaran: null,
  banBaruLabelToId: {},
  editingPenukaran: null
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

const formatTanggal = (dateString) => {
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
};

const showAlert = (message) => {
  alert(message);
};

const scrollToForm = () => {
  const formContainer = document.getElementById("formContainer");
  const editFormContainer = document.getElementById("editFormContainer");
  const tambahBanFormContainer = document.getElementById("tambahBanFormContainer");
  
  if (formContainer && formContainer.style.display !== "none") {
    formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (editFormContainer && editFormContainer.style.display !== "none") {
    editFormContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (tambahBanFormContainer && tambahBanFormContainer.style.display !== "none") {
    tambahBanFormContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
  },

  async updatePenukaranBanEdit(id, data) {
    const response = await fetch(`http://localhost:3000/pban/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return response;
  },

  async createPenukaranBan(data) {
    const response = await fetch(`http://localhost:3000/pban`, {
      method: "POST",
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
  const tambahDatalist = document.getElementById("tambahBanBaruList");
  
  if (datalist) datalist.innerHTML = "";
  if (tambahDatalist) tambahDatalist.innerHTML = "";

  data.forEach((ban) => {
    const label = `${ban.no_seri} - ${ban.merk_ban}`;
    state.banBaruLabelToId[label] = ban.id;
    if (datalist) {
      datalist.insertAdjacentHTML("beforeend", `<option value="${label}"></option>`);
    }
    if (tambahDatalist) {
      tambahDatalist.insertAdjacentHTML("beforeend", `<option value="${label}"></option>`);
    }
  });
}

async function loadPenukaranBan(kendaraanId) {
  const data = await api.fetchPenukaranBan();
  state.penukaranBanData = data.filter(
    (item) => String(item.id_kendaraan) === String(kendaraanId)
  );
  renderPenukaranBanTable();
  updateTambahBanButton();
}

function updateTambahBanButton() {
  const tambahBanBtn = document.getElementById("tambahBanBtn");
  const tambahBanContainer = document.getElementById("tambahBanContainer");
  
  if (!tambahBanBtn || !tambahBanContainer) return;
  
  // Cek apakah kendaraan sudah dipilih
  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  
  if (!kendaraanId) {
    // Jika tidak ada kendaraan yang dipilih, sembunyikan tombol
    tambahBanContainer.style.display = "none";
    return;
  }
  
  const jumlahData = state.penukaranBanData.length;
  
  // Tampilkan tombol jika jumlah data < 10
  if (jumlahData < 10) {
    tambahBanContainer.style.display = "block";
  } else {
    tambahBanContainer.style.display = "none";
  }
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
        <td>${formatTanggal(item.tanggal_pasang_lama)}</td>
        <td>${item.km_awal ? formatKM(item.km_awal) : "-"}</td>
        <td>${item.km_akhir ? formatKM(item.km_akhir) : "-"}</td>
        <td>${item.jarak_km === "ODO ERROR" ? "ODO ERROR" : (item.jarak_km ? formatKM(item.jarak_km) : "-")}</td>
        <td>${item.km_gps ? formatKM(item.km_gps) : "-"}</td>
        <td>${item.keterangan || "-"}</td>
        <td>${item.supir || "-"}</td>
        <td>${item.seri_ban_baru || "-"}</td>
        <td>${item.merk_baru || "-"}</td>
        <td>${formatTanggal(item.tgl_pasang_ban_baru)}</td>
        <td style="white-space: nowrap;">
          <button class="btn btn-sm btn-edit" onclick="handleEditBanClick(${index})" style="margin-right: 4px;">
            Edit
          </button>
          <button class="btn btn-sm btn-primary" onclick="handleGantiBanClick(${index})">
            Ganti Ban
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

// ============================================================================
// FORM FUNCTIONS - TAMBAH BAN
// ============================================================================
async function showTambahBanForm() {
  // Validasi kendaraan sudah dipilih
  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  
  if (!kendaraanId) {
    showAlert("Pilih kendaraan terlebih dahulu.");
    return;
  }

  // Cek jumlah data
  const jumlahData = state.penukaranBanData.length;
  if (jumlahData >= 10) {
    showAlert("Maksimal 10 data ban per kendaraan.");
    return;
  }

  // Reload list ban untuk memastikan hanya ban yang tersedia yang ditampilkan
  await loadBanBaru();

  // Hide other forms
  document.getElementById("formTitle").style.display = "none";
  document.getElementById("formContainer").style.display = "none";
  document.getElementById("editFormTitle").style.display = "none";
  document.getElementById("editFormContainer").style.display = "none";

  // Show tambah ban form
  document.getElementById("tambahBanFormTitle").style.display = "block";
  document.getElementById("tambahBanFormContainer").style.display = "block";

  document.getElementById("tambahBanForm").reset();
  
  // Set kendaraan_id dari input
  document.getElementById("tambah_ban_kendaraan_id").value = kendaraanId;

  scrollToForm();
}

function hideTambahBanForm() {
  document.getElementById("tambahBanFormContainer").style.display = "none";
  document.getElementById("tambahBanFormTitle").style.display = "none";
  document.getElementById("tambahBanForm").reset();
  document.getElementById("tambah_km_awal_preview").textContent = "";
  document.getElementById("tambah_km_akhir_preview").textContent = "";
  document.getElementById("tambah_km_gps_preview").textContent = "";
}

function validateTambahBanFormData() {
  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  
  if (!kendaraanId) {
    showAlert("Pilih kendaraan terlebih dahulu.");
    return false;
  }

  const jumlahData = state.penukaranBanData.length;
  if (jumlahData >= 10) {
    showAlert("Maksimal 10 data ban per kendaraan.");
    return false;
  }

  return true;
}

function getTambahBanFormData() {
  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  
  const banLabel = document.getElementById("tambah_ban_baru_input").value;
  const banId = state.banBaruLabelToId[banLabel] || null;
  const [seriBanBaru, merkBanBaru] = banLabel ? banLabel.split(" - ") : [null, null];

  const jarakKmValue = document.getElementById("tambah_jarak_km").value;
  const jarakKm = jarakKmValue === "ODO ERROR" ? null : (jarakKmValue ? cleanKM(jarakKmValue) : null);

  return {
    id_kendaraan: kendaraanId || null,
    supir: document.getElementById("tambah_supir").value || null,
    tanggal_pasang_lama: document.getElementById("tambah_tanggal_pasang_lama").value || null,
    merk_lama: document.getElementById("tambah_merk_lama").value || null,
    seri_lama: document.getElementById("tambah_seri_lama").value || null,
    km_awal: cleanKM(document.getElementById("tambah_km_awal").value) || null,
    km_akhir: cleanKM(document.getElementById("tambah_km_akhir").value) || null,
    jarak_km: jarakKm,
    km_gps: cleanKM(document.getElementById("tambah_km_gps").value) || null,
    keterangan: document.getElementById("tambah_keterangan").value || null,
    tgl_pasang_ban_baru: document.getElementById("tambah_tgl_pasang_ban_baru").value || null,
    merk_baru: merkBanBaru || null,
    seri_ban_baru: seriBanBaru || null,
    id_stok: banId
  };
}

function calculateJarakKMTambah() {
  const kmAwal = cleanKM(document.getElementById("tambah_km_awal").value);
  const kmAkhir = cleanKM(document.getElementById("tambah_km_akhir").value);
  const jarakEl = document.getElementById("tambah_jarak_km");

  if (kmAwal && kmAkhir) {
    const diff = parseInt(kmAkhir) - parseInt(kmAwal);
    jarakEl.value = diff < 0 ? "ODO ERROR" : formatKM(diff);
  } else {
    jarakEl.value = "";
  }
}

// ============================================================================
// FORM FUNCTIONS - GANTI BAN
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

  // Setup untuk edit form
  ["edit_km_awal", "edit_km_akhir", "edit_km_gps"].forEach((id) => {
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

  // Setup untuk tambah ban form
  ["tambah_km_awal", "tambah_km_akhir", "tambah_km_gps"].forEach((id) => {
    const input = document.getElementById(id);
    const preview = document.getElementById(`${id}_preview`);

    if (input && preview) {
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
    }
  });
}

async function showGantiBanForm(penukaran) {
  state.selectedPenukaran = penukaran;

  // Reload list ban untuk memastikan hanya ban yang tersedia yang ditampilkan
  await loadBanBaru();

  // Hide other forms
  document.getElementById("editFormTitle").style.display = "none";
  document.getElementById("editFormContainer").style.display = "none";
  document.getElementById("tambahBanFormTitle").style.display = "none";
  document.getElementById("tambahBanFormContainer").style.display = "none";

  // Show ganti ban form
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

  const supir = document.getElementById("supir").value.trim();
  if (!supir) {
    showAlert("Supir harus diisi.");
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
    keterangan: document.getElementById("keterangan").value.trim() || null,
    id_stok: banId,
    tgl_pasang_ban_baru: document.getElementById("tgl_pasang_ban_baru").value,
    supir: document.getElementById("supir").value.trim(),
    seri_ban_baru: seriBanBaru,
    merk_baru: merkBanBaru
  };
}

// ============================================================================
// FORM FUNCTIONS - EDIT BAN
// ============================================================================
function calculateJarakKMEdit() {
  const kmAwal = cleanKM(document.getElementById("edit_km_awal").value);
  const kmAkhir = cleanKM(document.getElementById("edit_km_akhir").value);
  const jarakEl = document.getElementById("edit_jarak_km");

  if (kmAwal && kmAkhir) {
    const diff = parseInt(kmAkhir) - parseInt(kmAwal);
    jarakEl.value = diff < 0 ? "ODO ERROR" : formatKM(diff);
  } else {
    jarakEl.value = "";
  }
}

function showEditBanForm(penukaran) {
  state.editingPenukaran = penukaran;

  // Hide other forms
  document.getElementById("formTitle").style.display = "none";
  document.getElementById("formContainer").style.display = "none";
  document.getElementById("tambahBanFormTitle").style.display = "none";
  document.getElementById("tambahBanFormContainer").style.display = "none";

  // Show edit form
  document.getElementById("editFormTitle").style.display = "block";
  document.getElementById("editFormContainer").style.display = "block";

  // Populate form with existing data
  document.getElementById("edit_seri_lama").value = penukaran.seri_lama || "";
  document.getElementById("edit_merk_lama").value = penukaran.merk_lama || "";
  document.getElementById("edit_tanggal_pasang_lama").value = penukaran.tanggal_pasang_lama || "";
  document.getElementById("edit_km_awal").value = penukaran.km_awal ? formatKM(penukaran.km_awal) : "";
  document.getElementById("edit_km_akhir").value = penukaran.km_akhir ? formatKM(penukaran.km_akhir) : "";
  document.getElementById("edit_jarak_km").value = penukaran.jarak_km === "ODO ERROR" ? "ODO ERROR" : (penukaran.jarak_km ? formatKM(penukaran.jarak_km) : "");
  document.getElementById("edit_km_gps").value = penukaran.km_gps ? formatKM(penukaran.km_gps) : "";
  document.getElementById("edit_supir").value = penukaran.supir || "";
  document.getElementById("edit_keterangan").value = penukaran.keterangan || "";
  document.getElementById("edit_seri_ban_baru").value = penukaran.seri_ban_baru || "";
  document.getElementById("edit_merk_baru").value = penukaran.merk_baru || "";
  document.getElementById("edit_tgl_pasang_ban_baru").value = penukaran.tgl_pasang_ban_baru || "";

  // Update previews
  if (penukaran.km_awal) {
    document.getElementById("edit_km_awal_preview").textContent = `${formatKM(penukaran.km_awal)} km`;
  }
  if (penukaran.km_akhir) {
    document.getElementById("edit_km_akhir_preview").textContent = `${formatKM(penukaran.km_akhir)} km`;
  }
  if (penukaran.km_gps) {
    document.getElementById("edit_km_gps_preview").textContent = `${formatKM(penukaran.km_gps)} km`;
  }

  scrollToForm();
}

function hideEditBanForm() {
  document.getElementById("editFormContainer").style.display = "none";
  document.getElementById("editFormTitle").style.display = "none";
  state.editingPenukaran = null;
  document.getElementById("editBanForm").reset();
  document.getElementById("edit_km_awal_preview").textContent = "";
  document.getElementById("edit_km_akhir_preview").textContent = "";
  document.getElementById("edit_km_gps_preview").textContent = "";
}

function validateEditFormData() {
  if (!state.editingPenukaran) {
    showAlert("Tidak ada data yang sedang diedit.");
    return false;
  }

  const kmAwal = cleanKM(document.getElementById("edit_km_awal").value);
  const kmAkhir = cleanKM(document.getElementById("edit_km_akhir").value);

  if (kmAwal && isNaN(kmAwal)) {
    showAlert("KM Awal harus berupa angka.");
    return false;
  }

  if (kmAkhir && isNaN(kmAkhir)) {
    showAlert("KM Akhir harus berupa angka.");
    return false;
  }

  return true;
}

function getEditFormData() {
  const jarakKmValue = document.getElementById("edit_jarak_km").value;
  const jarakKm = jarakKmValue === "ODO ERROR" ? "ODO ERROR" : cleanKM(jarakKmValue);

  return {
    id: state.editingPenukaran.id,
    seri_lama: document.getElementById("edit_seri_lama").value,
    merk_lama: document.getElementById("edit_merk_lama").value,
    tanggal_pasang_lama: document.getElementById("edit_tanggal_pasang_lama").value,
    km_awal: cleanKM(document.getElementById("edit_km_awal").value),
    km_akhir: cleanKM(document.getElementById("edit_km_akhir").value),
    jarak_km: jarakKm,
    km_gps: cleanKM(document.getElementById("edit_km_gps").value) || null,
    keterangan: document.getElementById("edit_keterangan").value,
    supir: document.getElementById("edit_supir").value,
    seri_ban_baru: document.getElementById("edit_seri_ban_baru").value,
    merk_baru: document.getElementById("edit_merk_baru").value,
    tgl_pasang_ban_baru: document.getElementById("edit_tgl_pasang_ban_baru").value
  };
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function handleGantiBanClick(index) {
  const penukaran = state.penukaranBanData[index];
  showGantiBanForm(penukaran);
}

function handleEditBanClick(index) {
  const penukaran = state.penukaranBanData[index];
  showEditBanForm(penukaran);
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!validateFormData()) {
    return;
  }

  const formData = getFormData();
  
  // Konfirmasi sebelum submit
  const confirmMessage = `
Apakah Anda yakin ingin mengganti ban?

Detail Penggantian:
━━━━━━━━━━━━━━━━━━━━━━
Ban Lama: ${formData.seri_lama}
KM Awal: ${formatKM(formData.km_awal)}
KM Akhir: ${formatKM(formData.km_akhir)}
Jarak: ${formData.jarak_km === "ODO ERROR" ? "ODO ERROR" : formatKM(formData.jarak_km)} km

Ban Baru: ${formData.seri_ban_baru} - ${formData.merk_baru}
Tanggal Pasang: ${formData.tgl_pasang_ban_baru}
Supir: ${formData.supir || "-"}
━━━━━━━━━━━━━━━━━━━━━━

Data ini akan disimpan ke histori dan tidak dapat dibatalkan.
  `.trim();

  if (!confirm(confirmMessage)) {
    return;
  }

  const response = await api.updatePenukaranBan(formData.id, formData);

  if (!response.ok) {
    showAlert("Gagal menyimpan data.");
    return;
  }

  showAlert("Data penukaran ban berhasil diperbarui.");

  // Reload list ban untuk menghapus ban yang sudah dipakai dari dropdown
  await loadBanBaru();

  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  if (kendaraanId) {
    await loadPenukaranBan(kendaraanId);
  }

  hideGantiBanForm();
}

async function handleEditFormSubmit(event) {
  event.preventDefault();

  if (!validateEditFormData()) {
    return;
  }

  const formData = getEditFormData();
  
  // Konfirmasi sebelum submit
  const confirmMessage = `
Apakah Anda yakin ingin menyimpan perubahan data ban?

Data yang akan diubah:
━━━━━━━━━━━━━━━━━━━━━━
Ban Lama: ${formData.seri_lama || "-"} (${formData.merk_lama || "-"})
Tanggal Pasang Lama: ${formData.tanggal_pasang_lama || "-"}

KM Awal: ${formData.km_awal ? formatKM(formData.km_awal) : "-"}
KM Akhir: ${formData.km_akhir ? formatKM(formData.km_akhir) : "-"}
Jarak: ${formData.jarak_km === "ODO ERROR" ? "ODO ERROR" : (formData.jarak_km ? formatKM(formData.jarak_km) + " km" : "-")}
KM GPS: ${formData.km_gps ? formatKM(formData.km_gps) : "-"}

Ban Baru: ${formData.seri_ban_baru || "-"} (${formData.merk_baru || "-"})
Tanggal Pasang Baru: ${formData.tgl_pasang_ban_baru || "-"}
Supir: ${formData.supir || "-"}
Keterangan: ${formData.keterangan || "-"}
━━━━━━━━━━━━━━━━━━━━━━

Perubahan ini akan langsung tersimpan.
  `.trim();

  if (!confirm(confirmMessage)) {
    return;
  }

  const response = await api.updatePenukaranBanEdit(formData.id, formData);

  if (!response.ok) {
    showAlert("Gagal menyimpan perubahan.");
    return;
  }

  showAlert("Data ban berhasil diperbarui.");

  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  if (kendaraanId) {
    await loadPenukaranBan(kendaraanId);
  }

  hideEditBanForm();
}

function handleCancelClick() {
  hideGantiBanForm();
}

function handleEditCancelClick() {
  hideEditBanForm();
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

async function handleTambahBanFormSubmit(event) {
  event.preventDefault();

  if (!validateTambahBanFormData()) {
    return;
  }

  const formData = getTambahBanFormData();
  
  // Konfirmasi sebelum submit
  const confirmMessage = `
Apakah Anda yakin ingin menambahkan data ban baru?

Detail Data Ban:
━━━━━━━━━━━━━━━━━━━━━━
Ban Lama: ${formData.seri_lama || "-"} (${formData.merk_lama || "-"})
Tanggal Pasang Lama: ${formData.tanggal_pasang_lama || "-"}

KM Awal: ${formData.km_awal ? formatKM(formData.km_awal) : "-"}
KM Akhir: ${formData.km_akhir ? formatKM(formData.km_akhir) : "-"}
Jarak: ${formData.jarak_km === "ODO ERROR" ? "ODO ERROR" : (formData.jarak_km ? formatKM(formData.jarak_km) + " km" : "-")}
KM GPS: ${formData.km_gps ? formatKM(formData.km_gps) : "-"}

Ban Baru: ${formData.seri_ban_baru || "-"} (${formData.merk_baru || "-"})
Tanggal Pasang Baru: ${formData.tgl_pasang_ban_baru || "-"}
Supir: ${formData.supir || "-"}
Keterangan: ${formData.keterangan || "-"}
━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  if (!confirm(confirmMessage)) {
    return;
  }

  const response = await api.createPenukaranBan(formData);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Gagal menyimpan data" }));
    showAlert(`Gagal menyimpan data: ${errorData.error || "Unknown error"}`);
    return;
  }

  showAlert("Data ban berhasil ditambahkan.");

  // Reload list ban untuk menghapus ban yang sudah dipakai dari dropdown
  await loadBanBaru();

  const kendaraanLabel = document.getElementById("kendaraan_input").value;
  const kendaraanId = state.kendaraanLabelToId[kendaraanLabel];
  if (kendaraanId) {
    await loadPenukaranBan(kendaraanId);
  }

  hideTambahBanForm();
}

function handleTambahBanCancelClick() {
  hideTambahBanForm();
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function setupEventListeners() {
  document.getElementById("km_akhir").addEventListener("input", calculateJarakKM);
  document.getElementById("edit_km_awal").addEventListener("input", calculateJarakKMEdit);
  document.getElementById("edit_km_akhir").addEventListener("input", calculateJarakKMEdit);
  document.getElementById("tambah_km_awal").addEventListener("input", calculateJarakKMTambah);
  document.getElementById("tambah_km_akhir").addEventListener("input", calculateJarakKMTambah);
  document.getElementById("gantiBanForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("editBanForm").addEventListener("submit", handleEditFormSubmit);
  document.getElementById("tambahBanForm").addEventListener("submit", handleTambahBanFormSubmit);
  document.getElementById("cancelBtn").addEventListener("click", handleCancelClick);
  document.getElementById("editCancelBtn").addEventListener("click", handleEditCancelClick);
  document.getElementById("tambahBanCancelBtn").addEventListener("click", handleTambahBanCancelClick);
  document.getElementById("cariKendaraanBtn").addEventListener("click", handleCariKendaraan);
  document.getElementById("tambahBanBtn").addEventListener("click", showTambahBanForm);
  
  // Update tombol tambah ban ketika input kendaraan berubah
  document.getElementById("kendaraan_input").addEventListener("input", () => {
    updateTambahBanButton();
  });
}

async function initializeApp() {
  await loadKendaraan();
  await loadBanBaru();
  setupKMFormatting();
  setupEventListeners();
}

// Make functions available globally for onclick attributes
window.handleGantiBanClick = handleGantiBanClick;
window.handleEditBanClick = handleEditBanClick;

// Start the application when DOM is ready
window.addEventListener("DOMContentLoaded", initializeApp);