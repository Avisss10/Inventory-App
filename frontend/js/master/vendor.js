        const form = document.getElementById('vendorForm');
        const vendorTableBody = document.querySelector('#vendorTable tbody');
        const vendorIdInput = document.getElementById('vendor_id');
        const namaVendorInput = document.getElementById('nama_vendor');
        const submitBtn = document.getElementById('submitBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');

        // Pagination variables
        let vendorsData = [];
        let currentPage = 1;
        const rowsPerPage = 10;

        // Ambil data vendor dari API
        async function loadVendors() {
            try {
                const res = await fetch('http://localhost:3000/vendor');
                const data = await res.json();
                vendorsData = data;
                renderTable();
                renderPagination();
            } catch (error) {
                alert("Gagal ambil data vendor: " + error.message);
            }
        }

        // Render tabel sesuai halaman dan filter
        function renderTable() {
            const filter = document.getElementById('vendor_input').value.toLowerCase();
            let filteredData = vendorsData.filter(vendor =>
                vendor.nama_vendor.toLowerCase().includes(filter)
            );

            const start = (currentPage - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            const pageData = filteredData.slice(start, end);

            vendorTableBody.innerHTML = '';
            pageData.forEach((vendor, index) => {
                const row = `<tr>
                    <td>${start + index + 1}</td>
                    <td>${vendor.nama_vendor}</td>
                    <td>
                        <div class="aksi-container">
                            <button class="btn btn-edit" onclick="editVendor(${vendor.id}, '${vendor.nama_vendor.replace(/'/g,"\\'")}')">Edit</button>
                            <button class="btn btn-delete" onclick="deleteVendor(${vendor.id})">Delete</button>
                        </div>
                    </td>
                </tr>`;
                vendorTableBody.insertAdjacentHTML('beforeend', row);
            });
        }

        // Render tombol pagination
        function renderPagination() {
            const filter = document.getElementById('vendor_input').value.toLowerCase();
            let filteredData = vendorsData.filter(vendor =>
                vendor.nama_vendor.toLowerCase().includes(filter)
            );
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            const paginationDiv = document.getElementById('pagination');
            paginationDiv.innerHTML = '';

            if (totalPages <= 1) return;

            // Prev button
            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Prev';
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {
                currentPage--;
                renderTable();
                renderPagination();
            };
            paginationDiv.appendChild(prevBtn);

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                if (i === currentPage) btn.classList.add('active');
                btn.onclick = () => {
                    currentPage = i;
                    renderTable();
                    renderPagination();
                };
                paginationDiv.appendChild(btn);
            }

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => {
                currentPage++;
                renderTable();
                renderPagination();
            };
            paginationDiv.appendChild(nextBtn);
        }

        // Tambah/Update vendor
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = vendorIdInput.value;
            const nama_vendor = namaVendorInput.value;

            try {
                let res;
                if (id) {
                    // Update vendor
                    res = await fetch(`http://localhost:3000/vendor/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nama_vendor })
                    });
                } else {
                    // Tambah vendor
                    res = await fetch('http://localhost:3000/vendor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nama_vendor })
                    });
                }

                const result = await res.json();
                alert(result.message);

                form.reset();
                vendorIdInput.value = "";
                submitBtn.textContent = "Simpan";
                cancelEditBtn.style.display = "none";
                loadVendors(); // refresh tabel
            } catch (error) {
                alert("Terjadi kesalahan: " + error.message);
            }
        });

        // Edit vendor
        function editVendor(id, nama_vendor) {
            vendorIdInput.value = id;
            namaVendorInput.value = nama_vendor;
            submitBtn.textContent = "Update";
            cancelEditBtn.style.display = "inline-block";
            namaVendorInput.focus();
        }

        // Batal edit
        cancelEditBtn.addEventListener('click', function() {
            form.reset();
            vendorIdInput.value = "";
            submitBtn.textContent = "Simpan";
            cancelEditBtn.style.display = "none";
        });

        // Hapus vendor
        async function deleteVendor(id) {
            if (!confirm("Yakin ingin menghapus vendor ini?")) return;

            try {
                const res = await fetch(`http://localhost:3000/vendor/${id}`, {
                    method: 'DELETE'
                });
                const result = await res.json();
                alert(result.message);
                loadVendors();
            } catch (error) {
                alert("Gagal menghapus vendor: " + error.message);
            }
        }

        // Filter tabel vendor berdasarkan input
        document.getElementById('vendor_input').addEventListener('input', function() {
            currentPage = 1;
            renderTable();
            renderPagination();
        });

        // Load vendor pertama kali
        loadVendors();

        // Agar fungsi edit/delete tetap bisa dipanggil
        window.editVendor = editVendor;
        window.deleteVendor = deleteVendor;