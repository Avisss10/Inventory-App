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
        const res = await fetch("http://localhost:3000/vendor");
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
        const res = await fetch("http://localhost:3000/sparepart");
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
            sparepart.no_seri.toLowerCase().includes(filter)) &&
            sparepart.jumlah > 0
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
                        <button class="btn btn-edit"
                            onclick="editSparepart(${sparepart.id}, '${sparepart.tgl_sparepart_masuk}', '${sparepart.nama_sparepart.replace(/'/g,"\\'")}', '${sparepart.no_seri.replace(/'/g,"\\'")}', ${sparepart.jumlah}, '${sparepart.satuan}', ${sparepart.harga}, ${sparepart.id_vendor})">Edit</button>
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
            sparepart.no_seri.toLowerCase().includes(filter)) &&
            sparepart.jumlah > 0
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

    // ===== SUBMIT FORM =====
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const id = sparepartIdInput.value;
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

        let url = "http://localhost:3000/sparepart";
        let method = "POST";
        if (id) { url += "/" + id; method = "PUT"; }

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        alert(result.message);

        form.reset();
        sparepartIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
        loadSparepart();
    });

    // ===== EDIT =====
    async function editSparepart(id, tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor) {
        try {
            // Fetch data from both tables
            const [sparepartRes, barangMasukRes] = await Promise.all([
                fetch(`http://localhost:3000/sparepart/${id}`),
                fetch(`http://localhost:3000/barang_masuk/${id}`)
            ]);

            if (!sparepartRes.ok || !barangMasukRes.ok) {
                alert("Gagal mengambil data untuk konfirmasi edit");
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

            // Buat pesan notifikasi
            const message = `Data yang akan diedit:

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

            alert(message);
            if (!confirm("Apakah anda yakin akan mengedit data ini?")) return;

            // Proceed with edit - populate form
            sparepartIdInput.value = id;
            if (tgl_sparepart_masuk && tgl_sparepart_masuk.length >= 10) {
                tglSparepartMasukInput.value = tgl_sparepart_masuk.substring(0, 10);
            } else {
                tglSparepartMasukInput.value = "";
            }
            namaSparepartInput.value = nama_sparepart;
            noSeriInput.value = no_seri;
            jumlahInput.value = jumlah;
            satuanInput.value = satuan;
            hargaInput.value = formatNumber(harga.toString());
            const vendorObj = (window._vendorData || []).find(v => v.id == id_vendor);
            vendorInput.value = vendorObj ? vendorObj.nama_vendor.trim() : '';
            submitBtn.textContent = "Update";
            cancelEditBtn.style.display = "inline-block";
        } catch (error) {
            console.error("Error in editSparepart:", error);
            alert("Terjadi kesalahan saat mengambil data untuk edit");
        }
    }

    // ===== BATAL EDIT =====
    cancelEditBtn.addEventListener('click', function() {
        form.reset();
        sparepartIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
    });

    // ===== HARG A INPUT FORMAT =====
    hargaInput.addEventListener('input', function(e) {
        this.value = formatNumber(this.value);
    });

    // ===== DELETE =====
    async function deleteSparepart(id) {
        try {
            // Fetch data from both tables
            const [sparepartRes, barangMasukRes] = await Promise.all([
                fetch(`http://localhost:3000/sparepart/${id}`),
                fetch(`http://localhost:3000/barang_masuk/${id}`)
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
            const res = await fetch(`http://localhost:3000/sparepart/${id}`, { method: "DELETE" });
            const result = await res.json();
            alert(result.message);
            loadSparepart();
        } catch (error) {
            console.error("Error in deleteSparepart:", error);
            alert("Terjadi kesalahan saat menghapus data");
        }
    }

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

    // expose ke window untuk onclick
    window.editSparepart = editSparepart;
    window.deleteSparepart = deleteSparepart;