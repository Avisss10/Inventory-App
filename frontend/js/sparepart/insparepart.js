const form = document.getElementById("stokSparepartForm");
const sparepartTableBody = document.querySelector("#sparepartTable tbody");
const sparepartIdInput = document.getElementById("sparepart_id");
const tglSparepartMasukInput = document.getElementById("tgl_sparepart_masuk");
const namaSparepartInput = document.getElementById("nama_sparepart");
const noSeriInput = document.getElementById("no_seri");
const jumlahInput = document.getElementById("jumlah");
const satuanInput = document.getElementById("satuan");
const hargaInput = document.getElementById("harga");
const vendorInput = document.getElementById("vendor_input");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const filterInput = document.getElementById("sparepart_input");

let sparepartData = [];
let currentPage = 1;
const rowsPerPage = 6;
let isSettingValue = false; // FLAG BARU UNTUK MENCEGAH DOUBLE FORMATTING

// ===== FORMAT NUMBER =====
function formatNumber(value) {
    return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ===== FORMAT QUANTITY =====
function formatQuantity(num) {
    return parseFloat(num).toString();
}

// ===== LOAD VENDOR =====
async function loadVendors() {
    const res = await fetch("/api/vendor");
    const data = await res.json();
    const vendorList = document.getElementById("vendorList");
    vendorList.innerHTML = '';
    data.forEach(v => {
        const option = document.createElement('option');
        option.value = v.nama_vendor;
        option.dataset.id = v.id;
        vendorList.appendChild(option);
    });
    window._vendorData = data;
}

// ===== LOAD SPAREPART =====
async function loadSparepart() {
    const res = await fetch("/api/sparepart");
    let data = await res.json();
    if (!Array.isArray(data)) data = [];
    sparepartData = data;
    renderTable();
    renderPagination();
}

// ===== RENDER TABEL =====
function renderTable() {
    const filter = filterInput.value.toLowerCase();
    let filteredData = sparepartData.filter(sparepart =>
        (sparepart.nama_sparepart.toLowerCase().includes(filter) ||
        (sparepart.no_seri || '').toLowerCase().includes(filter))
    );

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    sparepartTableBody.innerHTML = '';
    pageData.forEach((sparepart, index) => {
        let tgl = '';
        if (sparepart.tgl_sparepart_masuk) {
            const raw = sparepart.tgl_sparepart_masuk.substring(0, 10);
            const [year, month, day] = raw.split("-");
            tgl = `${day}/${month}/${year}`;
        }
        const harga = Number(sparepart.harga).toLocaleString('id-ID');

        sparepartTableBody.innerHTML += `<tr>
            <td style="text-align:center;">${start + index + 1}</td>
            <td>${tgl}</td>
            <td>${sparepart.nama_sparepart}</td>
            <td>${sparepart.no_seri}</td>
            <td style="text-align:right;">${formatQuantity(sparepart.jumlah)}</td>
            <td style="text-align:right;">${harga}</td>
            <td>${sparepart.nama_vendor || ''}</td>
            <td>
                <div class="aksi-container">
                    <button class="btn btn-edit" onclick="editSparepart(${sparepart.id})">Edit</button>
                    <button class="btn btn-delete" onclick="deleteSparepart(${sparepart.id})">Delete</button>
                </div>
            </td>
        </tr>`;
    });
}

// ===== RENDER PAGINATION =====
function renderPagination() {
    const filter = filterInput.value.toLowerCase();
    let filteredData = sparepartData.filter(sparepart =>
        (sparepart.nama_sparepart.toLowerCase().includes(filter) ||
        (sparepart.no_seri || '').toLowerCase().includes(filter))
    );
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderTable(); renderPagination(); };
    paginationDiv.appendChild(prevBtn);

    let startPage = 1, endPage = totalPages;
    if (totalPages > 6) {
        if (currentPage <= 3) { startPage = 1; endPage = 5; }
        else if (currentPage >= totalPages - 2) { startPage = totalPages - 4; endPage = totalPages; }
        else { startPage = currentPage - 2; endPage = currentPage + 2; }
    }
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => { currentPage = 1; renderTable(); renderPagination(); };
        paginationDiv.appendChild(firstBtn);
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.margin = "0 4px";
            paginationDiv.appendChild(dots);
        }
    }
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.onclick = () => { currentPage = i; renderTable(); renderPagination(); };
        paginationDiv.appendChild(btn);
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.margin = "0 4px";
            paginationDiv.appendChild(dots);
        }
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => { currentPage = totalPages; renderTable(); renderPagination(); };
        paginationDiv.appendChild(lastBtn);
    }
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderTable(); renderPagination(); };
    paginationDiv.appendChild(nextBtn);
}

// ===== SUBMIT FORM (hanya untuk INSERT baru, bukan EDIT) =====
form.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const vendorName = vendorInput.value.trim();
    const vendorObj = (window._vendorData || []).find(v => v.nama_vendor.trim().toLowerCase() === vendorName.toLowerCase());
    if (!vendorObj) { alert("Vendor tidak valid!"); vendorInput.focus(); return; }

    const data = {
        tgl_sparepart_masuk: tglSparepartMasukInput.value.substring(0,10),
        nama_sparepart: namaSparepartInput.value,
        no_seri: noSeriInput.value,
        jumlah: jumlahInput.value,
        satuan: satuanInput.value,
        harga: parseInt(hargaInput.value.replace(/\./g, '')) || 0,
        id_vendor: vendorObj.id
    };

    // Hanya POST (insert baru), tidak ada PUT (edit) di sini
    const res = await fetch("/api/sparepart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    alert(result.message);

    form.reset();
    loadSparepart();
});

// ===== Modal element refs =====
const editModal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveBothBtn = document.getElementById('saveBothBtn');

// barang masuk form fields
const bm_id = document.getElementById('bm_id');
const bm_tgl = document.getElementById('bm_tgl');
const bm_nama = document.getElementById('bm_nama');
const bm_no_seri = document.getElementById('bm_no_seri');
const bm_jumlah = document.getElementById('bm_jumlah');
const bm_satuan = document.getElementById('bm_satuan');
const bm_harga = document.getElementById('bm_harga');
const bm_vendor = document.getElementById('bm_vendor');

// stock sparepart form fields
const sp_id = document.getElementById('sp_id');
const sp_jumlah = document.getElementById('sp_jumlah');

// helper: open/close modal
function openModal() {
    editModal.style.display = 'flex';
    editModal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
    editModal.style.display = 'none';
    editModal.setAttribute('aria-hidden', 'true');
}

// ===== PREVIEW PERBANDINGAN (Barang Masuk vs Stock Sparepart, nilai lama) =====
function fillPreviewCompare(barangMasuk, sparepart) {
    const fmtTgl = (v) => v ? v.substring(0, 10) : '';
    const fmtHarga = (v) => (Number(v) || 0).toLocaleString('id-ID');
    const fmtJumlah = (v) => (parseFloat(v) || 0).toString();

    const fields = [
        { key: 'tgl', bm: fmtTgl(barangMasuk.tgl_sparepart_masuk), sp: fmtTgl(sparepart.tgl_sparepart_masuk) },
        { key: 'nama', bm: barangMasuk.nama_sparepart || '', sp: sparepart.nama_sparepart || '' },
        { key: 'no_seri', bm: barangMasuk.no_seri || '', sp: sparepart.no_seri || '' },
        { key: 'satuan', bm: barangMasuk.satuan || '', sp: sparepart.satuan || '' },
        { key: 'harga', bm: fmtHarga(barangMasuk.harga), sp: fmtHarga(sparepart.harga) },
        { key: 'vendor', bm: barangMasuk.nama_vendor || '', sp: sparepart.nama_vendor || '' },
        { key: 'jumlah', bm: fmtJumlah(barangMasuk.jumlah), sp: fmtJumlah(sparepart.jumlah) }
    ];

    let anyMismatch = false;

    fields.forEach(({ key, bm, sp }) => {
        const cellBM = document.getElementById(`prev_bm_${key}`);
        const cellSP = document.getElementById(`prev_sp_${key}`);
        const row = document.querySelector(`#previewCompareTable tr[data-field="${key}"]`);
        if (cellBM) cellBM.textContent = bm;
        if (cellSP) cellSP.textContent = sp;

        // jumlah boleh berbeda (stok berkurang oleh pemakaian), jangan ditandai mismatch
        const isMismatch = key !== 'jumlah' && bm !== sp;
        if (row) row.classList.toggle('field-mismatch', isMismatch);
        if (isMismatch) anyMismatch = true;
    });

    const warning = document.getElementById('previewMismatchWarning');
    if (warning) warning.style.display = anyMismatch ? 'block' : 'none';
}

// ===== EDIT (buka modal dan isi kedua form) =====
async function editSparepart(id) {
    try {
        // ambil data dari kedua endpoint
        const [sparepartRes, barangMasukRes] = await Promise.all([
            fetch(`/api/sparepart/${id}`),
            fetch(`/api/barang_masuk/${id}`)
        ]);

        if (!sparepartRes.ok || !barangMasukRes.ok) {
            alert("Gagal mengambil data untuk edit.");
            return;
        }

        const sparepart = await sparepartRes.json();
        const barangMasuk = await barangMasukRes.json();

        // SET FLAG TRUE SEBELUM MENGISI FORM
        isSettingValue = true;

        // isi form Barang Masuk
        bm_id.value = barangMasuk.id || '';
        bm_tgl.value = barangMasuk.tgl_sparepart_masuk ? barangMasuk.tgl_sparepart_masuk.substring(0,10) : '';
        bm_nama.value = barangMasuk.nama_sparepart || '';
        bm_no_seri.value = barangMasuk.no_seri || '';
        bm_jumlah.value = barangMasuk.jumlah || 0;
        bm_satuan.value = barangMasuk.satuan || '';
        // Format harga: ambil angka murni, baru format
        const hargaBM = Number(barangMasuk.harga) || 0;
        bm_harga.value = hargaBM.toLocaleString('id-ID');
        bm_vendor.value = barangMasuk.nama_vendor || '';

        // isi jumlah Stock Sparepart (identitas barang dipakai bersama dari form Barang Masuk)
        sp_id.value = sparepart.id || '';
        sp_jumlah.value = sparepart.jumlah || 0;

        fillPreviewCompare(barangMasuk, sparepart);

        // RESET FLAG SETELAH DELAY KECIL (pastikan semua event selesai)
        setTimeout(() => {
            isSettingValue = false;
        }, 100);

        openModal();
    } catch (error) {
        console.error("Error in editSparepart modal:", error);
        alert("Terjadi kesalahan saat membuka form edit.");
        isSettingValue = false; // Reset flag jika ada error
    }
}

// ===== SAVE BOTH (identitas barang satu form, jumlah terpisah per tabel) =====
async function saveBothIndependently() {
    const vendorName = bm_vendor.value.trim();
    const vendorData = window._vendorData || [];

    const vendorObj = vendorData.find(v => v.nama_vendor.trim().toLowerCase() === vendorName.toLowerCase());

    if (!vendorObj) {
        alert("Vendor tidak valid. Pastikan memilih vendor dari daftar.");
        return;
    }

    const parseHarga = (value) => {
        const cleaned = String(value).replace(/\./g, '').replace(/,/g, '');
        return parseInt(cleaned) || 0;
    };

    // Identitas barang (tanggal, nama, no seri, satuan, harga, vendor) sama untuk kedua tabel
    const identitas = {
        tgl_sparepart_masuk: bm_tgl.value || null,
        nama_sparepart: bm_nama.value || '',
        no_seri: bm_no_seri.value || '',
        satuan: bm_satuan.value || '',
        harga: parseHarga(bm_harga.value),
        id_vendor: vendorObj.id
    };

    // Jumlah tetap terpisah: barang_masuk = jumlah asli saat masuk, stok_sparepart = sisa stok saat ini
    const payloadBM = { ...identitas, jumlah: Number(bm_jumlah.value) || 0 };
    const payloadSP = { ...identitas, jumlah: Number(sp_jumlah.value) || 0 };

    console.log('Payload Barang Masuk:', payloadBM);
    console.log('Payload Stock Sparepart:', payloadSP);

    try {
        // Kirim PUT ke kedua endpoint secara terpisah
        const [resBM, resSP] = await Promise.all([
            fetch(`/api/barang_masuk/${bm_id.value}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadBM)
            }),
            fetch(`/api/sparepart/${sp_id.value}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadSP)
            })
        ]);

        console.log('Response Barang Masuk status:', resBM.status);
        console.log('Response Stock Sparepart status:', resSP.status);

        if (!resBM.ok || !resSP.ok) {
            const errorBM = !resBM.ok ? await resBM.text() : '';
            const errorSP = !resSP.ok ? await resSP.text() : '';
            console.error('Error Response BM:', errorBM);
            console.error('Error Response SP:', errorSP);
            alert('Gagal menyimpan data. Periksa console untuk detail error.');
            return;
        }

        const textBM = await resBM.text();
        const textSP = await resSP.text();
        console.log('Raw Response BM:', textBM);
        console.log('Raw Response SP:', textSP);

        const jsonBM = textBM ? JSON.parse(textBM) : {};
        const jsonSP = textSP ? JSON.parse(textSP) : {};

        alert(`Berhasil menyimpan perubahan!\n- Barang Masuk: ${jsonBM.message || 'OK'}\n- Stock Sparepart: ${jsonSP.message || 'OK'}`);
        
        closeModal();
        await loadSparepart();
        console.log('Tabel berhasil di-refresh');
    } catch (err) {
        console.error("Error saveBothIndependently:", err);
        alert("Terjadi kesalahan: " + err.message);
    }
}

// ===== Modal event listeners =====
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
saveBothBtn.addEventListener('click', saveBothIndependently);

// Auto-format saat user mengetik (hanya aktif saat user manual input)
bm_harga.addEventListener('input', function(e){ 
    if (isSettingValue) return;
    
    // Ambil angka murni (hapus semua non-digit)
    const rawValue = e.target.value.replace(/\D/g, '');
    // Format dengan locale Indonesia
    e.target.value = rawValue ? Number(rawValue).toLocaleString('id-ID') : '';
});

// ===== DELETE =====
async function deleteSparepart(id) {
    try {
        // Fetch data from both tables
        const [sparepartRes, barangMasukRes] = await Promise.all([
            fetch(`/api/sparepart/${id}`),
            fetch(`/api/barang_masuk/${id}`)
        ]);

        if (!sparepartRes.ok || !barangMasukRes.ok) {
            alert("Gagal mengambil data untuk konfirmasi penghapusan");
            return;
        }

        const sparepart = await sparepartRes.json();
        const barangMasuk = await barangMasukRes.json();

        // Format tanggal
        const formatTanggal = (dateStr) => {
            if (!dateStr) return '-';
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        };

        // Format harga
        const formatHarga = (harga) => Number(harga).toLocaleString('id-ID');

        // Buat pesan konfirmasi
        const message = `Apakah anda yakin akan Menghapus data ini?

Data Stok Sparepart:
- Tanggal Masuk: ${formatTanggal(sparepart.tgl_sparepart_masuk)}
- Nama Sparepart: ${sparepart.nama_sparepart}
- No. Seri: ${sparepart.no_seri}
- Jumlah: ${sparepart.jumlah} ${sparepart.satuan}
- Harga: Rp ${formatHarga(sparepart.harga)}
- Vendor: ${sparepart.nama_vendor || '-'}

Data Barang Masuk:
- Tanggal Masuk: ${formatTanggal(barangMasuk.tgl_sparepart_masuk)}
- Nama Sparepart: ${barangMasuk.nama_sparepart}
- No. Seri: ${barangMasuk.no_seri}
- Jumlah: ${barangMasuk.jumlah} ${barangMasuk.satuan}
- Harga: Rp ${formatHarga(barangMasuk.harga)}
- Vendor: ${barangMasuk.nama_vendor || '-'}`;

        if (!confirm(message)) return;

        // Proceed with delete
        const res = await fetch(`/api/sparepart/${id}`, { method: "DELETE" });
        const result = await res.json();
        alert(result.message);
        loadSparepart();
    } catch (error) {
        console.error("Error in deleteSparepart:", error);
        alert("Terjadi kesalahan saat menghapus data");
    }
}

// Auto-format harga (titik ribuan) saat mengetik di form Input Sparepart
hargaInput.addEventListener('input', function(e) {
    const rawValue = e.target.value.replace(/\D/g, '');
    e.target.value = rawValue ? formatNumber(rawValue) : '';
});

// ===== FILTER =====
filterInput.addEventListener('input', function() {
    currentPage = 1;
    renderTable();
    renderPagination();
});

// ===== INIT =====
function init() {
    loadVendors();
    loadSparepart();
}
init();

// expose ke window untuk onclick dan form hooks
window.editSparepart = editSparepart;
window.deleteSparepart = deleteSparepart;