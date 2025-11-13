    // ===== GLOBAL VARIABEL =====
    const form = document.getElementById("stokBanForm");
    const banTableBody = document.querySelector("#banTable tbody");
    const banIdInput = document.getElementById("ban_id");
    const tglBanMasukInput = document.getElementById("tgl_ban_masuk");
    const merkBanInput = document.getElementById("merk_ban");
    const noSeriInput = document.getElementById("no_seri");
    const hargaInput = document.getElementById("harga");
    const vendorInput = document.getElementById("vendor_input");
    const submitBtn = document.getElementById("submitBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const filterInput = document.getElementById("ban_input");

    let banData = [];
    let currentPage = 1;
    const rowsPerPage = 6;

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

    // ===== LOAD BAN =====
    async function loadBan() {
        const res = await fetch("http://localhost:3000/ban/tersedia");
        let data = await res.json();
        if (!Array.isArray(data)) data = [];
        banData = data;
        renderTable();
        renderPagination();
    }

    // ===== FORMAT TANGGAL =====
    function formatTanggal(dateString) {
        if (!dateString || dateString === '0000-00-00' || dateString === '') return 'N/A';
        try {
            const raw = dateString.substring(0, 10); // YYYY-MM-DD
            const [year, month, day] = raw.split("-");
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
            const monthIndex = parseInt(month) - 1;
            const monthName = monthNames[monthIndex] || month;
            return `${day}-${monthName}-${year}`;
        } catch (e) {
            return 'N/A';
        }
    }

    // ===== RENDER TABEL =====
    function renderTable() {
        const filter = filterInput.value.toLowerCase();
        let filteredData = banData.filter(ban =>
            ban.merk_ban.toLowerCase().includes(filter) ||
            ban.no_seri.toLowerCase().includes(filter)
        );

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);

        banTableBody.innerHTML = '';
        pageData.forEach((ban, index) => {
            const tgl = formatTanggal(ban.tgl_ban_masuk);
            const harga = ban.harga ? Number(ban.harga).toLocaleString('id-ID') : 'N/A';

            banTableBody.innerHTML += `<tr>
                <td style="text-align:center;">${start + index + 1}</td>
                <td>${tgl}</td>
                <td>${ban.merk_ban || 'N/A'}</td>
                <td>${ban.no_seri || 'N/A'}</td>
                <td style="text-align:right;">${harga}</td>
                <td>${ban.nama_vendor || 'N/A'}</td>
                <td>
                    <div class="aksi-container">
                        <button class="btn btn-edit"
                            onclick="editBan(${ban.id}, '${ban.tgl_ban_masuk || ''}', '${(ban.merk_ban || '').replace(/'/g,"\\'")}', '${(ban.no_seri || '').replace(/'/g,"\\'")}', ${ban.harga || 0}, ${ban.id_vendor || ''})">Edit</button>
                        <button class="btn btn-delete" onclick="deleteBan(${ban.id})">Delete</button>
                    </div>
                </td>
            </tr>`;
        });
    }

    // ===== RENDER PAGINATION =====
    function renderPagination() {
        const filter = filterInput.value.toLowerCase();
        let filteredData = banData.filter(ban =>
            ban.merk_ban.toLowerCase().includes(filter) ||
            ban.no_seri.toLowerCase().includes(filter)
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
        const id = banIdInput.value;
        const vendorName = vendorInput.value.trim().toLowerCase();
        const vendorObj = (window._vendorData || []).find(
            v => v.nama_vendor.trim().toLowerCase() === vendorName
        );
        if (!vendorObj) {
            alert("Vendor tidak valid!"); 
            vendorInput.focus(); 
            return;
        }

        const data = {
            tgl_ban_masuk: tglBanMasukInput.value,
            merk_ban: merkBanInput.value,
            no_seri: noSeriInput.value,
            jumlah: 1,
            satuan: "pcs",
            harga: hargaInput.value,
            id_vendor: vendorObj.id
        };

        let url = "http://localhost:3000/ban";
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
        banIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
        loadBan();
    });

    // ===== EDIT =====
    function editBan(id, tgl_ban_masuk, merk_ban, no_seri, harga, id_vendor) {
        banIdInput.value = id;
        if (tgl_ban_masuk && tgl_ban_masuk.length >= 10) {
            tglBanMasukInput.value = tgl_ban_masuk.substring(0, 10);
        } else {
            tglBanMasukInput.value = "";
        }
        merkBanInput.value = merk_ban;
        noSeriInput.value = no_seri;
        hargaInput.value = harga;
        const vendorObj = (window._vendorData || []).find(v => v.id == id_vendor);
        vendorInput.value = vendorObj ? vendorObj.nama_vendor : '';
        submitBtn.textContent = "Update";
        cancelEditBtn.style.display = "inline-block";
    }

    // ===== BATAL EDIT =====
    cancelEditBtn.addEventListener('click', function() {
        form.reset();
        banIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
    });

    // ===== DELETE =====
    async function deleteBan(id) {
        if (!confirm("Yakin ingin menghapus data ban ini?")) return;
        const res = await fetch(`http://localhost:3000/ban/${id}`, { method: "DELETE" });
        const result = await res.json();
        alert(result.message);
        loadBan();
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
        loadBan();
    }
    init();

    // expose ke window untuk onclick
    window.editBan = editBan;
    window.deleteBan = deleteBan;