# Inventory App

## Menjalankan setelah clone dari GitHub

1. Pastikan MySQL (misal via XAMPP) sudah berjalan dan database `db_stok` sudah dibuat/di-import.
2. Install dependency backend:
   ```
   cd backend
   npm install
   ```
3. Jalankan server:
   ```
   npm start
   ```
   atau untuk mode development (auto-restart saat ada perubahan):
   ```
   npm run dev
   ```
4. Buka browser ke `http://localhost:<port>` (lihat `backend/server.js` untuk port yang digunakan). Folder `frontend` akan otomatis di-serve oleh backend.

## Catatan

- Koneksi database diatur di [backend/db.js](backend/db.js) (host, user, password, nama database). Sesuaikan jika kredensial MySQL Anda berbeda dari default XAMPP (`root` tanpa password).
- `node_modules/` tidak ikut di-commit ke git — jalankan `npm install` setelah clone untuk memasang ulang.
- `Inventory-App.exe` adalah hasil build (lihat [build.bat](build.bat)) dan tidak ikut di-commit; build ulang sendiri jika diperlukan.
