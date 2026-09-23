const API_URL = '/api';
let currentEditId = null;

// Load data saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    setupFilterListener();
    setupDeleteFormListener();
    terapkanFilter(); // Ambil data sesuai filter default ("Hari Ini") saat load
});

// Setup listener untuk dropdown filter
function setupFilterListener() {
    const filterType = document.getElementById('filterType');
    const dateGroup = document.getElementById('dateGroup');

    filterType.addEventListener('change', () => {
        if (filterType.value === 'date') {
            dateGroup.style.display = 'flex';
        } else {
            dateGroup.style.display = 'none';
        }
    });
}

// Ambil data pemakaian dari server sesuai filter tanggal (atau semua jika tanggal kosong)
async function fetchData(tanggal) {
    const query = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : '?limit=100000';
    const response = await fetch(`${API_URL}/pemakaian${query}`);
    if (!response.ok) throw new Error('Gagal mengambil data');
    return response.json();
}

// Render tabel
function renderTable(data, emptyMessage) {
    const tableBody = document.getElementById('tableBody');
    const totalData = document.getElementById('totalData');

    totalData.textContent = data.length;

    if (data.length === 0) {
        const message = emptyMessage || 'Tidak ada data';
        tableBody.innerHTML = `<tr><td colspan="9" class="no-data no-data-info">${message}</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = data.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(item.tanggal)}</td>
            <td>${item.nama_sparepart || '-'}</td>
            <td>${item.no_seri || '-'}</td>
            <td>${item.jumlah}</td>
            <td>${item.satuan}</td>
            <td>${item.dt_mobil && item.plat ? `${item.dt_mobil} - ${item.plat}` : '-'}</td>
            <td>${item.penanggung_jawab || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editData(${item.id})">Edit</button>
            </td>
        </tr>
    `).join('');
}

// Format tanggal (dibaca langsung dari string, tanpa parsing Date/UTC)
function formatDate(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = getTanggalString(dateString).split('-');
    if (!year || !month || !day) return '-';
    return `${day}/${month}/${year}`;
}

// Ambil bagian tanggal (YYYY-MM-DD) dari string tanggal apa adanya,
// tanpa parsing lewat Date/UTC agar tidak bergeser sehari akibat timezone
function getTanggalString(tanggal) {
    if (!tanggal) return '';
    return String(tanggal).slice(0, 10);
}

// Format tanggal lokal (bukan UTC) untuk filter "Hari Ini"
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Terapkan filter (selalu ambil ulang dari server sesuai filter aktif)
async function terapkanFilter() {
    const filterType = document.getElementById('filterType').value;
    const filterDate = document.getElementById('filterDate').value;

    if (filterType === 'date' && !filterDate) {
        alert('Silakan pilih tanggal terlebih dahulu');
        return;
    }

    let emptyMessage = 'Tidak ada data';
    let tanggalQuery = null;

    if (filterType === 'today') {
        tanggalQuery = getTodayString();
        emptyMessage = `Tidak ada data pemakaian untuk hari ini (${formatDate(tanggalQuery)})`;
    } else if (filterType === 'date') {
        tanggalQuery = filterDate;
        emptyMessage = `Tidak ada data pemakaian pada tanggal ${formatDate(filterDate)}`;
    }

    try {
        const data = await fetchData(tanggalQuery);
        renderTable(data, emptyMessage);
    } catch (error) {
        console.error('Error:', error);
        showError('Gagal memuat data: ' + error.message);
    }
}

// Reset filter
function resetFilter() {
    document.getElementById('filterType').value = 'today';
    document.getElementById('filterDate').value = '';
    document.getElementById('dateGroup').style.display = 'none';
    terapkanFilter();
}

// Edit data
async function editData(id) {
    try {
        const response = await fetch(`${API_URL}/pemakaian/${id}`);
        if (!response.ok) throw new Error('Gagal mengambil detail data');
        
        const data = await response.json();
        
        // ✅ SET currentEditId DI SINI
        currentEditId = id;
        
        console.log('Edit data ID:', currentEditId); // Debug
        
        // Isi form dengan data read-only
        document.getElementById('editId').value = data.id;
        document.getElementById('editSparepart').value = `${data.nama_sparepart || '-'} - ${data.no_seri || '-'}`;
        document.getElementById('editKendaraan').value = data.dt_mobil && data.plat ? `${data.dt_mobil} - ${data.plat}` : '-';
        document.getElementById('editJumlah').value = data.jumlah;
        document.getElementById('editSatuan').value = data.satuan;
        document.getElementById('editPenanggungJawab').value = data.penanggung_jawab || '-';
        document.getElementById('editTanggal').value = data.tanggal.split('T')[0];
        
        // Reset keterangan
        document.getElementById('editKeterangan').value = '';
        
        // Simpan data asli untuk update
        document.getElementById('editForm').dataset.sparepartId = data.sparepart_id;
        document.getElementById('editForm').dataset.kendaraanId = data.kendaraan_id;
        document.getElementById('editForm').dataset.penanggungJawab = data.penanggung_jawab;
        
        // Tampilkan modal
        document.getElementById('editModal').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal memuat data: ' + error.message);
    }
}

// Close modal edit
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editForm').reset();
    // ✅ Reset currentEditId HANYA saat close modal edit dengan tombol cancel
    currentEditId = null;
}

// Submit form edit
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const id = document.getElementById('editId').value;
    const keterangan = document.getElementById('editKeterangan').value.trim();
    
    // Validasi keterangan
    if (!keterangan) {
        alert('Keterangan wajib diisi untuk mencatat alasan perubahan data');
        return;
    }
    
    const data = {
        sparepart_id: parseInt(form.dataset.sparepartId),
        kendaraan_id: parseInt(form.dataset.kendaraanId),
        jumlah: document.getElementById('editJumlah').value,
        satuan: document.getElementById('editSatuan').value,
        penanggung_jawab: form.dataset.penanggungJawab,
        tanggal: document.getElementById('editTanggal').value,
        keterangan: keterangan
    };
    
    try {
        const response = await fetch(`${API_URL}/pemakaian/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Gagal mengupdate data');
        }
        
        alert(result.message || 'Data berhasil diperbarui dan histori tersimpan');
        closeModal();
        terapkanFilter();
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menyimpan: ' + error.message);
    }
});

// Delete data dari modal (buka modal konfirmasi)
function deleteCurrentData() {
    console.log('Delete button clicked, currentEditId:', currentEditId); // Debug
    
    if (!currentEditId) {
        alert('Tidak ada data yang dipilih');
        return;
    }
    
    // ✅ JANGAN panggil closeModal() karena akan reset currentEditId
    // Tutup modal edit secara manual tanpa reset currentEditId
    document.getElementById('editModal').classList.remove('active');
    
    // Buka modal delete
    document.getElementById('deleteKeterangan').value = '';
    document.getElementById('deleteModal').classList.add('active');
    
    console.log('Delete modal opened, currentEditId:', currentEditId); // Debug
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.getElementById('deleteForm').reset();
    // ✅ Reset form edit juga
    document.getElementById('editForm').reset();
    // ✅ Reset currentEditId di sini
    currentEditId = null;
}

// Setup delete form listener
function setupDeleteFormListener() {
    document.getElementById('deleteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        console.log('Delete form submitted, currentEditId:', currentEditId); // Debug
        
        if (!currentEditId) {
            alert('Tidak ada data yang dipilih untuk dihapus');
            return;
        }
        
        const keterangan = document.getElementById('deleteKeterangan').value.trim();
        
        if (!keterangan) {
            alert('Alasan penghapusan wajib diisi');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/pemakaian/${currentEditId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keterangan })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Gagal menghapus data');
            }
            
            alert(result.message || 'Data berhasil dihapus dan histori tersimpan');
            closeDeleteModal();
            terapkanFilter();
        } catch (error) {
            console.error('Error:', error);
            alert('Gagal menghapus: ' + error.message);
        }
    });
}

// Show error
function showError(message) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr><td colspan="9" class="no-data" style="color: #ef4444;">${message}</td></tr>`;
}