# Inventory App

Ringkasan singkat aplikasi manajemen inventory (backend Express + frontend statis).

## Struktur proyek (sekilas)
- Backend: [backend/server.js](backend/server.js), koneksi DB: [`db`](backend/db.js) ([backend/db.js](backend/db.js)), dependencies: [backend/package.json](backend/package.json)  
- Frontend (static files): [frontend/index.html](frontend/index.html) dan halaman terkait di folder [frontend/](frontend)  
- Contoh file frontend penting:
  - Rekap literan: [frontend/rekapoli.html](frontend/rekapoli.html) & [frontend/js/literan/rekapoli.js](frontend/js/literan/rekapoli.js)
  - Pemakaian literan: [frontend/pemakaianoli.html](frontend/pemakaianoli.html) & [frontend/js/literan/pemakaianoli.js](frontend/js/literan/pemakaianoli.js)
  - Penukaran ban: [frontend/pban.html](frontend/pban.html) & [frontend/js/ban/pban.js](frontend/js/ban/pban.js)
  - Input barang: [frontend/barang.html](frontend/barang.html) & [frontend/js/barang/barang.js](frontend/js/barang/barang.js)
  - Pemakaian sparepart: [frontend/pemakaian.html](frontend/pemakaian.html) & [frontend/js/sparepart/pemakaian.js](frontend/js/sparepart/pemakaian.js)
  - Rekap semua sparepart: [frontend/rekapsemua.html](frontend/rekapsemua.html) & [frontend/js/sparepart/rekapsemua.js](frontend/js/sparepart/rekapsemua.js)

## Prasyarat
- Node.js (v14+)
- MySQL / MariaDB (database `db_stok` sesuai konfigurasi default)
- XAMPP (opsional, jika menjalankan environment lokal lain)

## Setup & Jalankan (lokal)
1. Sesuaikan konfigurasi database di [backend/db.js](backend/db.js) jika perlu (host/user/password/database).  
   - Variabel koneksi dieksport sebagai [`db`](backend/db.js).
2. Install dependency backend:
   ```sh
   cd backend
   npm install
3. Jalankan server:
node server.js
Server default di: http://localhost:3000 — file frontend dilayani statis oleh server (lihat backend/server.js).
4. Akses aplikasi lewat browser: buka http://localhost:3000 atau langsung buka salah satu halaman di frontend/, mis. index.html.

API & Pengembangan
Semua endpoint ditangani di server.js. Buka file tersebut untuk melihat daftar route (contoh: /oli_masuk, /pemakaian_oli, /stok_oli, /ban, /pban/all, dsb).
Jika frontend memakai base URL yang berbeda, perbarui konstanta API di file JS terkait (mis. API_BASE_URL di frontend/js/literan/rekapoli.js).
Export / Cetak laporan
Frontend menggunakan SheetJS dan jsPDF (lihat referensi di setiap halaman HTML yang butuh export, mis. rekapoli.html, frontend/rekapsemua.html).
Fungsi export terimplementasi di masing‑masing modul JS (mis. rekapoli.js, frontend/js/sparepart/rekapsemua.js).
Debugging cepat
Jika koneksi DB gagal, cek log output dari db.js (meng-print status koneksi).
Pastikan tabel dan kolom DB sesuai yang dipakai backend (lihat query di backend/server.js).

Catatan
Aplikasi menggunakan server Express untuk menyajikan frontend statis dan endpoint API.
Jika ingin menjalankan hanya frontend (tanpa server), buka file HTML langsung, namun beberapa fitur memerlukan API backend.