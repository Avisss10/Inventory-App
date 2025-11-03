    const form = document.getElementById("kendaraanForm");
    const kendaraanTableBody = document.querySelector("#kendaraanTable tbody");
    const kendaraanIdInput = document.getElementById("kendaraan_id");
    const dtMobilInput = document.getElementById("dt_mobil");
    const platInput = document.getElementById("plat");
    const submitBtn = document.getElementById("submitBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const filterInput = document.getElementById("kendaraan_input");

    // Pagination variables
    let kendaraanData = [];
    let currentPage = 1;
    const rowsPerPage = 10;

    // Ambil data kendaraan dari API
    async function loadKendaraan() {
      try {
        const res = await fetch("http://localhost:3000/kendaraan");
        const data = await res.json();
        kendaraanData = data;
        renderTable();
        renderPagination();
      } catch (error) {
        alert("Gagal ambil data kendaraan: " + error.message);
      }
    }

    // Render tabel sesuai halaman dan filter
    function renderTable() {
      const filter = filterInput.value.toLowerCase();
      let filteredData = kendaraanData.filter(kendaraan =>
        kendaraan.dt_mobil.toLowerCase().includes(filter) ||
        kendaraan.plat.toLowerCase().includes(filter)
      );

      const start = (currentPage - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      const pageData = filteredData.slice(start, end);

      kendaraanTableBody.innerHTML = '';
      pageData.forEach((kendaraan, index) => {
        const row = `<tr>
            <td>${start + index + 1}</td>
            <td>${kendaraan.dt_mobil}</td>
            <td>${kendaraan.plat}</td>
            <td>
              <div class="aksi-container">
                <button class="btn btn-edit" onclick="editKendaraan(${kendaraan.id}, '${kendaraan.dt_mobil.replace(/'/g,"\\'")}', '${kendaraan.plat.replace(/'/g,"\\'")}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteKendaraan(${kendaraan.id})">Delete</button>
              </div>
            </td>
          </tr>`;
        kendaraanTableBody.insertAdjacentHTML("beforeend", row);
      });
    }

    // Render tombol pagination
  function renderPagination() {
    const filter = filterInput.value.toLowerCase();
    let filteredData = kendaraanData.filter(kendaraan =>
      kendaraan.dt_mobil.toLowerCase().includes(filter) ||
      kendaraan.plat.toLowerCase().includes(filter)
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

    // Page numbers with ellipsis
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > 6) {
      if (currentPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - 4;
        endPage = totalPages;
      } else {
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
    }

    if (startPage > 1) {
      const firstBtn = document.createElement('button');
      firstBtn.textContent = '1';
      firstBtn.onclick = () => {
        currentPage = 1;
        renderTable();
        renderPagination();
      };
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
      btn.onclick = () => {
        currentPage = i;
        renderTable();
        renderPagination();
      };
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
      lastBtn.onclick = () => {
        currentPage = totalPages;
        renderTable();
        renderPagination();
      };
      paginationDiv.appendChild(lastBtn);
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

    // Tambah/Update kendaraan
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = kendaraanIdInput.value;
      const dt_mobil = dtMobilInput.value;
      const plat = platInput.value;

      try {
        let res;
        if (id) {
          // Update
          res = await fetch(`http://localhost:3000/kendaraan/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dt_mobil, plat })
          });
        } else {
          // Tambah
          res = await fetch("http://localhost:3000/kendaraan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dt_mobil, plat })
          });
        }

        const result = await res.json();
        alert(result.message);

        form.reset();
        kendaraanIdInput.value = "";
        submitBtn.textContent = "Simpan";
        cancelEditBtn.style.display = "none";
        loadKendaraan(); // refresh tabel
      } catch (error) {
        alert("Terjadi kesalahan: " + error.message);
      }
    });

    // Edit kendaraan
    function editKendaraan(id, dt_mobil, plat) {
      kendaraanIdInput.value = id;
      dtMobilInput.value = dt_mobil;
      platInput.value = plat;
      submitBtn.textContent = "Update";
      cancelEditBtn.style.display = "inline-block";
      dtMobilInput.focus();
    }

    // Batal edit
    cancelEditBtn.addEventListener('click', function() {
      form.reset();
      kendaraanIdInput.value = "";
      submitBtn.textContent = "Simpan";
      cancelEditBtn.style.display = "none";
    });

    // Hapus kendaraan
    async function deleteKendaraan(id) {
      if (!confirm("Yakin ingin menghapus kendaraan ini?")) return;

      try {
        const res = await fetch(`http://localhost:3000/kendaraan/${id}`, {
          method: "DELETE"
        });
        const result = await res.json();
        alert(result.message);
        loadKendaraan();
      } catch (error) {
        alert("Gagal menghapus kendaraan: " + error.message);
      }
    }

    // Filter tabel kendaraan berdasarkan input
    filterInput.addEventListener('input', function() {
      currentPage = 1;
      renderTable();
      renderPagination();
    });

    // Load kendaraan pertama kali
    loadKendaraan();

    // Agar fungsi edit/delete tetap bisa dipanggil
    window.editKendaraan = editKendaraan;
    window.deleteKendaraan = deleteKendaraan;