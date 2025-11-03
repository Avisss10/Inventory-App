    const form = document.getElementById("oliMasukForm");
    const oliTableBody = document.querySelector("#oliTable tbody");
    const oliIdInput = document.getElementById("oli_id");
    const tanggalMasukInput = document.getElementById("tanggal_masuk");
    const namaOliInput = document.getElementById("nama_oli");
    const noSeriInput = document.getElementById("no_seri");
    const jumlahBaruInput = document.getElementById("jumlah_baru");
    const satuanInput = document.getElementById("satuan");
    const hargaInput = document.getElementById("harga");
    const vendorInput = document.getElementById("vendor_input");
    const oldOliInput = document.getElementById("old_oli_input");
    const sisaLamaInput = document.getElementById("sisa_lama");
    const keteranganInput = document.getElementById("keterangan");
    const submitBtn = document.getElementById("submitBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const filterInput = document.getElementById("oli_input");
    const totalInfo = document.getElementById("total_info");
    const totalMasukSpan = document.getElementById("total_masuk");
    const stockLabel = document.getElementById("stock_label");

    let oliData = [];
    let oldOliMap = {}; // Map untuk oli lama: key -> id_oli_masuk
    let currentPage = 1;
    const rowsPerPage = 10;

    // ===== FORMAT QUANTITY =====
    function formatQuantity(num) {
        return parseFloat(num).toFixed(2);
    }

    // ===== FORMAT CURRENCY =====
    function formatCurrency(num) {
        if (num == 0 || isNaN(num)) return '-';
        return 'Rp ' + parseFloat(num).toLocaleString('id-ID');
    }

    // ===== FORMAT INPUT NUMBER =====
    function formatInput(value) {
        // Allow only digits and comma
        value = value.replace(/[^\d,]/g, '');
        // Split by comma (decimal separator)
        let parts = value.split(',');
        if (parts.length > 2) {
            // If more than one comma, merge extras
            parts = [parts[0], parts.slice(1).join('')];
        }
        // Format integer part with dots (thousands separator)
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parts.join(',');
    }

    // ===== FORMAT Harga Input =====
    hargaInput.addEventListener('input', function() {
        const rawValue = this.value.replace(/\./g, '').replace(',', '.');
        this.value = formatInput(rawValue);
    });

    hargaInput.addEventListener('blur', function() {
        const rawValue = this.value.replace(/\./g, '').replace(',', '.');
        const numValue = parseFloat(rawValue) || 0;
        this.value = numValue.toString().replace('.', ',');
    });

    // ===== HITUNG TOTAL =====
    function hitungTotal() {
        const baru = parseFloat(jumlahBaruInput.value) || 0;
        const lama = parseFloat(sisaLamaInput.value) || 0;
        const total = baru + lama;
        
        if (lama > 0) {
            totalInfo.style.display = 'block';
            totalMasukSpan.textContent = formatQuantity(total);
        } else {
            totalInfo.style.display = 'none';
        }
    }

    // Event listeners untuk hitung total
    jumlahBaruInput.addEventListener('input', hitungTotal);
    sisaLamaInput.addEventListener('input', hitungTotal);

    // ===== LOAD VENDOR =====
    async function loadVendors() {
        const loadingDiv = document.getElementById("loading-vendors");
        loadingDiv.style.display = 'block';
        try {
            const res = await fetch("http://localhost:3000/vendor");
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
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
        } catch (error) {
            console.error('Error loading vendors:', error);
            alert('Gagal memuat data vendor. Cek koneksi server.');
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // ===== LOAD OLD OLI OPTIONS =====
    async function loadOldOliOptions() {
        try {
            const res = await fetch("http://localhost:3000/oli_masuk");
            let data = await res.json();
            if (!Array.isArray(data)) data = [];
            
            const oldOliList = document.getElementById("oldOliList");
            oldOliList.innerHTML = '';
            oldOliMap = {};
            
            // Filter oli yang belum digabung ke oli baru lain (id_oli_baru = NULL)
            const availableOli = data.filter(oli => !oli.id_oli_baru);
            
            availableOli.forEach(oli => {
                // Format tanggal
                let tglDisplay = '';
                if (oli.tanggal_masuk) {
                    const raw = oli.tanggal_masuk.substring(0, 10);
                    const [year, month, day] = raw.split("-");
                    tglDisplay = `${day}/${month}/${year}`;
                }
                
                const stok = oli.stok_tersisa || 0;
                const key = `${oli.id} - ${tglDisplay} - ${oli.nama_oli}`;
                
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${tglDisplay} - ${oli.nama_oli} - Stok: ${formatQuantity(stok)}L`;
                
                oldOliList.appendChild(option);
                oldOliMap[key] = {
                    id: oli.id,
                    stok: stok,
                    nama_oli: oli.nama_oli,
                    no_seri: oli.no_seri,
                    tanggal: tglDisplay
                };
            });
        } catch (error) {
            console.error('Error loading old oli options:', error);
        }
    }

    // ===== AUTO-FILL JUMLAH OLI LAMA =====
    oldOliInput.addEventListener('change', function() {
        const key = this.value.trim();
        
        if (key && oldOliMap[key]) {
            const oliData = oldOliMap[key];
            const stok = oliData.stok;
            
            if (stok > 0) {
                sisaLamaInput.value = stok;
                sisaLamaInput.max = stok;
                
                // Tampilkan label stok
                stockLabel.textContent = `Stok: ${formatQuantity(stok)}`;
                stockLabel.style.display = 'block';
            } else {
                sisaLamaInput.value = '';
                sisaLamaInput.removeAttribute('max');
                stockLabel.style.display = 'none';
            }
            hitungTotal();
        } else {
            sisaLamaInput.value = '';
            sisaLamaInput.removeAttribute('max');
            stockLabel.style.display = 'none';
            totalInfo.style.display = 'none';
        }
    });

    // Clear input on double click
    oldOliInput.addEventListener('dblclick', function() {
        this.value = '';
        sisaLamaInput.value = '';
        sisaLamaInput.removeAttribute('max');
        stockLabel.style.display = 'none';
        totalInfo.style.display = 'none';
    });

    // ===== LOAD OLI MASUK =====
    async function loadOli() {
        const res = await fetch("http://localhost:3000/oli_masuk");
        let data = await res.json();
        if (!Array.isArray(data)) data = [];
        oliData = data;
        renderTable();
        renderPagination();
        loadOldOliOptions();
    }

    // ===== RENDER TABEL =====
    function renderTable() {
        const filter = filterInput.value.toLowerCase();
        let filteredData = oliData.filter(oli =>
            oli.nama_oli.toLowerCase().includes(filter) ||
            oli.no_seri.toLowerCase().includes(filter)
        );

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);

        oliTableBody.innerHTML = '';
        pageData.forEach((oli, index) => {
            let tgl = '';
            if (oli.tanggal_masuk) {
                const raw = oli.tanggal_masuk.substring(0, 10);
                const [year, month, day] = raw.split("-");
                tgl = `${day}/${month}/${year}`;
            }

            const jumlahBaru = parseFloat(oli.jumlah_baru) || 0;
            const sisaLama = parseFloat(oli.sisa_lama) || 0;
            // Preferensi gunakan total_masuk jika tersedia, fallback ke jumlah_baru + sisa_lama
            const total = parseFloat(oli.total_masuk) || (jumlahBaru + sisaLama);
            // ambil nilai dipakai dari backend (kami menambahkan total_dipakai)
            const dipakai = parseFloat(oli.total_dipakai) || 0;
            // Fix: Ensure sisaAkhir is never negative
            const sisaAkhir = Math.max(0, total - dipakai);

            let statusHTML = '';
            if (oli.id_oli_lama) {
                statusHTML = `<span class="status-badge status-gabungan">Gabungan</span><br><small style="color:#666;">dari Liter lama</small>`;
            } else {
                statusHTML = `<span class="status-badge status-murni">Murni</span>`;
            }

            const hargaSatuan = parseFloat(oli.harga) || 0;
            const totalHarga = hargaSatuan * total;

            oliTableBody.innerHTML += `<tr>
                <td style="text-align:center;">${start + index + 1}</td>
                <td style="text-align:center;">${tgl}</td>
                <td>${oli.nama_oli}</td>
                <td style="text-align:center;">${oli.no_seri}</td>
                <td style="text-align:right;">${formatQuantity(jumlahBaru)}</td>
                <td style="text-align:right;">${sisaLama > 0 ? formatQuantity(sisaLama) : '-'}</td>
                <td style="text-align:right;"><strong>${formatQuantity(total)}</strong></td>
                <td style="text-align:right; color:#dc3545;">${dipakai > 0 ? formatQuantity(dipakai) : '-'}</td> <!-- { new cell } -->
                <td style="text-align:right; color:#28a745;"><strong>${formatQuantity(sisaAkhir)}</strong></td> <!-- { fixed: always >= 0 } -->
                <td style="text-align:right;">${hargaSatuan > 0 ? formatCurrency(hargaSatuan) : '-'}</td>
                <td style="text-align:right;"><strong>${totalHarga > 0 ? formatCurrency(totalHarga) : '-'}</strong></td>
                <td style="text-align:center;">${oli.satuan || 'L'}</td>
                <td>${statusHTML}</td>
                <td>${oli.nama_vendor || ''}</td>
                <td>
                    <div class="aksi-container">
                        <button class="btn btn-edit"
                            onclick="editOli(${oli.id})">Edit</button>
                        <button class="btn btn-delete" onclick="deleteOli(${oli.id})">Delete</button>
                    </div>
                </td>
            </tr>`;
        });
    }

    // ===== RENDER PAGINATION =====
    function renderPagination() {
        const filter = filterInput.value.toLowerCase();
        let filteredData = oliData.filter(oli =>
            oli.nama_oli.toLowerCase().includes(filter) ||
            oli.no_seri.toLowerCase().includes(filter)
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
        const id = oliIdInput.value;
        const vendorName = vendorInput.value.trim();
        const vendorObj = (window._vendorData || []).find(v => v.nama_vendor.trim().toLowerCase() === vendorName.toLowerCase());
        if (!vendorObj) { alert("Vendor tidak valid!"); vendorInput.focus(); return; }

        const jumlahBaru = parseFloat(jumlahBaruInput.value) || 0;
        const sisaLama = parseFloat(sisaLamaInput.value) || 0;
        
        // Get id_oli_lama dari oldOliMap
        const oldOliKey = oldOliInput.value.trim();
        const idOliLama = oldOliKey && oldOliMap[oldOliKey] ? oldOliMap[oldOliKey].id : null;

        // Validasi jika pilih oli lama tapi tidak isi jumlahnya
        if (idOliLama && sisaLama <= 0) {
            alert("Jika memilih oli lama, harap isi jumlah sisa lama!");
            sisaLamaInput.focus();
            return;
        }

        const data = {
            tanggal_masuk: tanggalMasukInput.value.substring(0,10),
            nama_oli: namaOliInput.value,
            no_seri: noSeriInput.value,
            jumlah_baru: jumlahBaru,
            sisa_lama: sisaLama,
            satuan: satuanInput.value,
            harga: parseFloat(hargaInput.value) || 0,
            id_vendor: vendorObj.id,
            id_oli_lama: idOliLama,
            keterangan: keteranganInput.value || null
        };

        let url = "http://localhost:3000/oli_masuk";
        let method = "POST";
        if (id) { 
            url += "/" + id; 
            method = "PUT"; 
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (res.ok) {
                alert(result.message);
                form.reset();
                satuanInput.value = 'L';
                oliIdInput.value = "";
                submitBtn.textContent = "Simpan";
                cancelEditBtn.style.display = "none";
                stockLabel.style.display = "none";
                totalInfo.style.display = "none";
                loadOli();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Terjadi kesalahan saat menyimpan data");
        }
    });

    // ===== EDIT =====
    async function editOli(id) {
        try {
            const res = await fetch(`http://localhost:3000/oli_masuk/${id}`);
            if (!res.ok) {
                alert("Gagal mengambil data untuk edit");
                return;
            }

            const oli = await res.json();

            const formatTanggal = (dateStr) => {
                if (!dateStr) return '-';
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
            };

            const jumlahBaru = parseFloat(oli.jumlah_baru) || 0;
            const sisaLama = parseFloat(oli.sisa_lama) || 0;
            const total = parseFloat(oli.total_masuk) || (jumlahBaru + sisaLama);

            const message = `Data yang akan diedit:

- Tanggal Masuk: ${formatTanggal(oli.tanggal_masuk)}
- Nama Oli: ${oli.nama_oli}
- No. Seri: ${oli.no_seri}
- Jumlah Baru: ${formatQuantity(jumlahBaru)} liter
- Sisa Lama: ${sisaLama > 0 ? formatQuantity(sisaLama) + ' liter' : '-'}
- Total Masuk: ${formatQuantity(total)} liter
- Satuan: ${oli.satuan || 'L'}
- Harga: ${formatQuantity(oli.harga || 0)} Rp
- Vendor: ${oli.nama_vendor || '-'}
- Status: ${oli.id_oli_lama ? 'Gabungan dari oli lama' : 'Oli murni (baru)'}
- Keterangan: ${oli.keterangan || '-'}`;

            alert(message);
            if (!confirm("Apakah anda yakin akan mengedit data ini?")) return;

            oliIdInput.value = id;
            if (oli.tanggal_masuk && oli.tanggal_masuk.length >= 10) {
                tanggalMasukInput.value = oli.tanggal_masuk.substring(0, 10);
            } else {
                tanggalMasukInput.value = "";
            }
            namaOliInput.value = oli.nama_oli;
            noSeriInput.value = oli.no_seri;
            jumlahBaruInput.value = jumlahBaru;
            satuanInput.value = oli.satuan || 'L';
            
            const vendorObj = (window._vendorData || []).find(v => v.id == oli.id_vendor);
            vendorInput.value = vendorObj ? vendorObj.nama_vendor.trim() : '';
            
            // Set oli lama menggunakan key format
            if (oli.id_oli_lama) {
                // Find the matching key in oldOliMap
                const matchingKey = Object.keys(oldOliMap).find(key => 
                    oldOliMap[key].id === oli.id_oli_lama
                );
                if (matchingKey) {
                    oldOliInput.value = matchingKey;
                    const oliData = oldOliMap[matchingKey];
                    stockLabel.textContent = `Stok: ${formatQuantity(oliData.stok)}`;
                    stockLabel.style.display = 'block';
                } else {
                    oldOliInput.value = '';
                    stockLabel.style.display = 'none';
                }
            } else {
                oldOliInput.value = '';
                stockLabel.style.display = 'none';
            }
            
            sisaLamaInput.value = sisaLama || '';
            keteranganInput.value = oli.keterangan || '';
            
            hitungTotal();
            
            submitBtn.textContent = "Update";
            cancelEditBtn.style.display = "inline-block";
        } catch (error) {
            console.error("Error in editOli:", error);
            alert("Terjadi kesalahan saat mengambil data untuk edit");
        }
    }

    // ===== BATAL EDIT =====
    cancelEditBtn.addEventListener('click', function() {
        form.reset();
        satuanInput.value = 'L';
        oliIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
        stockLabel.style.display = "none";
        totalInfo.style.display = "none";
    });

    // ===== DELETE =====
    async function deleteOli(id) {
        try {
            const res = await fetch(`http://localhost:3000/oli_masuk/${id}`);
            if (!res.ok) {
                alert("Gagal mengambil data untuk konfirmasi penghapusan");
                return;
            }

            const oli = await res.json();

            const formatTanggal = (dateStr) => {
                if (!dateStr) return '-';
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
            };

            const jumlahBaru = parseFloat(oli.jumlah_baru) || 0;
            const sisaLama = parseFloat(oli.sisa_lama) || 0;
            const total = parseFloat(oli.total_masuk) || (jumlahBaru + sisaLama);

            const message = `Apakah anda yakin akan Menghapus data ini?

- Tanggal Masuk: ${formatTanggal(oli.tanggal_masuk)}
- Nama Oli: ${oli.nama_oli}
- No. Seri: ${oli.no_seri}
- Jumlah Baru: ${formatQuantity(jumlahBaru)} liter
- Sisa Lama: ${sisaLama > 0 ? formatQuantity(sisaLama) + ' liter' : '-'}
- Total Masuk: ${formatQuantity(total)} liter
- Satuan: ${oli.satuan || 'L'}
- Vendor: ${oli.nama_vendor || '-'}
- Status: ${oli.id_oli_lama ? 'Gabungan dari oli lama' : 'Oli murni (baru)'}
- Keterangan: ${oli.keterangan || '-'}`;

            if (!confirm(message)) return;

            const deleteRes = await fetch(`http://localhost:3000/oli_masuk/${id}`, { method: "DELETE" });
            const result = await deleteRes.json();
            
            if (deleteRes.ok) {
                alert(result.message);
                loadOli();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Error in deleteOli:", error);
            alert("Terjadi kesalahan saat menghapus data");
        }
    }

    // ===== FILTER WITH DEBOUNCING =====
    let filterTimeout;
    filterInput.addEventListener('input', function() {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            currentPage = 1;
            renderTable();
            renderPagination();
        }, 300); // 300ms debounce
    });

    // ===== INIT =====
    function init() {
        loadVendors();
        loadOli();
    }
    init();

    // expose ke window untuk onclick
    window.editOli = editOli;
    window.deleteOli = deleteOli;