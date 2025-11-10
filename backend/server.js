console.log("🚀 Server starting...");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db.js');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========================================
// VENDOR ENDPOINTS
// ========================================

// POST /vendor
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Menambahkan vendor baru ke database
app.post("/vendor", (req, res) => {
    const { nama_vendor } = req.body;
    db.query(
        "INSERT INTO vendor (nama_vendor) VALUES (?)",
        [nama_vendor.trim()],
        (err) => {
            if (err) {
                console.error("Error /vendor POST:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            return res.status(200).json({ message: "Berhasil Menambahkan Vendor" });
        }
    );
});

// GET /vendor
// Pages: vendor.html, barang.html, ban.html, insparepart.html, inoli.html, rekap.html, rekapsemua.html, rekapoli.html
// JS: js/master/vendor.js, js/barang/barang.js, js/barang/rekap.js, js/ban/ban.js, js/ban/lapban.js, js/sparepart/insparepart.js, js/sparepart/rekapsemua.js, js/literan/inoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar semua vendor untuk dropdown/filter di form input dan laporan
app.get("/vendor", (req, res) => {
    db.query("SELECT * FROM vendor", (err, results) => {
        if (err) {
            console.error("Error /vendor GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// GET /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Mengambil detail vendor tertentu untuk keperluan edit
app.get("/vendor/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM vendor WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("Error /vendor/:id GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        if (!results || results.length === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
        res.json(results[0]);
    });
});

// PUT /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Mengupdate data vendor berdasarkan ID
app.put("/vendor/:id", (req, res) => {
    const { id } = req.params;
    const { nama_vendor } = req.body;

    db.query(
        "UPDATE vendor SET nama_vendor = ? WHERE id = ?",
        [nama_vendor.trim(), id],
        (err, result) => {
            if (err) {
                console.error("Error /vendor/:id PUT:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
            res.json({ message: "Vendor berhasil diperbarui" });
        }
    );
});

// DELETE /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Menghapus vendor dari database
app.delete("/vendor/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM vendor WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error /vendor/:id DELETE:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
        res.json({ message: "Vendor berhasil dihapus" });
    });
});

// ========================================
// KENDARAAN ENDPOINTS
// ========================================

// POST /kendaraan
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Menambahkan kendaraan baru ke database
app.post("/kendaraan", (req, res) => {
    const { dt_mobil, plat } = req.body;
    db.query(
        "INSERT INTO kendaraan (dt_mobil, plat) VALUES (?, ?)",
        [dt_mobil, plat],
        (err, result) => {
            if (err) {
                console.error("Error /kendaraan POST:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            return res.status(200).json({ message: "Berhasil Menambahkan Kendaraan", id: result.insertId });
        }
    );
});

// GET /kendaraan
// Pages: kendaraan.html, pemakaian.html, pemakaianoli.html, rekap.html, rekapsemua.html, rekapoli.html, pban.html, lapban.html
// JS: js/master/kendaraan.js, js/sparepart/pemakaian.js, js/barang/rekap.js, js/barang/barang.js, js/ban/pban.js, js/ban/lapban.js, js/literan/pemakaianoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar kendaraan untuk dropdown/filter di form pemakaian dan laporan
app.get("/kendaraan", (req, res) => {
    db.query("SELECT * FROM kendaraan", (err, results) => {
        if (err) {
            console.error("Error /kendaraan GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// PUT /kendaraan/:id
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Mengupdate data kendaraan (dt_mobil dan plat)
app.put("/kendaraan/:id", (req, res) => {
    const { id } = req.params;
    const { dt_mobil, plat } = req.body;

    db.query(
        "UPDATE kendaraan SET dt_mobil = ?, plat = ? WHERE id = ?",
        [dt_mobil, plat, id],
        (err, result) => {
            if (err) {
                console.error("Error /kendaraan/:id PUT:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Kendaraan tidak ditemukan" });
            res.json({ message: "Kendaraan berhasil diperbarui" });
        }
    );
});

// DELETE /kendaraan/:id
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Menghapus kendaraan dari database
app.delete("/kendaraan/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM kendaraan WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error /kendaraan/:id DELETE:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: "Kendaraan tidak ditemukan" });
        res.json({ message: "Kendaraan berhasil dihapus" });
    });
});

// ========================================
// BARANG (OUTPUT) ENDPOINTS
// ========================================

// POST /barang
// Page: barang.html | JS: js/barang/barang.js
// Fungsi: Menyimpan data output barang (pengeluaran barang langsung ke kendaraan)
app.post("/barang", (req, res) => {
    const { no_seri, nama_barang, merk, jumlah, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal } = req.body;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.query(
        "INSERT INTO barang (no_seri, nama_barang, merk, jumlah, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [no_seri, nama_barang, merk, jumlahNum, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal],
        (err, result) => {
            if (err) {
                console.error("Error /barang POST:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json({ success: true, id: result.insertId });
        }
    );
});

// GET /barang
// Page: rekap.html | JS: js/barang/rekap.js
// Fungsi: Mengambil data barang untuk laporan rekap lama (dari tabel barang)
app.get("/barang", (req, res) => {
    const sql = `
    SELECT b.id, b.no_seri, b.nama_barang, b.jumlah, b.satuan, b.harga,
           v.nama_vendor, k.dt_mobil, k.plat,
           b.penanggung_jawab, b.tanggal
    FROM barang b
    LEFT JOIN vendor v ON b.vendor_id = v.id
    LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
    ORDER BY b.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /barang GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// ========================================
// SPAREPART ENDPOINTS
// ========================================

// GET /sparepart
// Pages: insparepart.html, rekapsemua.html | JS: js/sparepart/insparepart.js, js/sparepart/rekapsemua.js
// Fungsi: Mengambil daftar sparepart dari stok_sparepart untuk input dan laporan
app.get("/sparepart", (req, res) => {
    db.query(
        `SELECT s.*, v.nama_vendor
     FROM stok_sparepart s
     LEFT JOIN vendor v ON s.id_vendor = v.id
     ORDER BY s.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /sparepart GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// GET /sparepart/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengambil detail sparepart tertentu untuk edit
app.get("/sparepart/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT s.*, v.nama_vendor
     FROM stok_sparepart s
     LEFT JOIN vendor v ON s.id_vendor = v.id
     WHERE s.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /sparepart/:id GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (!results || results.length === 0) return res.status(404).json({ message: "Sparepart tidak ditemukan" });
            res.json(results[0]);
        }
    );
});

// GET /barang_masuk/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengambil detail barang_masuk untuk edit sparepart
app.get("/barang_masuk/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT b.*, v.nama_vendor
     FROM barang_masuk b
     LEFT JOIN vendor v ON b.id_vendor = v.id
     WHERE b.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /barang_masuk/:id GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (!results || results.length === 0) return res.status(404).json({ message: "Barang masuk tidak ditemukan" });
            res.json(results[0]);
        }
    );
});

// GET /stok_sparepart
// Page: pemakaian.html | JS: js/sparepart/pemakaian.js
// Fungsi: Mengambil stok sparepart yang tersedia untuk form pemakaian
app.get("/stok_sparepart", (req, res) => {
    db.query(
        `SELECT s.*, v.nama_vendor 
     FROM stok_sparepart s 
     LEFT JOIN vendor v ON s.id_vendor = v.id
     ORDER BY s.nama_sparepart`,
        (err, results) => {
            if (err) {
                console.error("Error /stok_sparepart GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// POST /sparepart
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Menambahkan sparepart baru (INSERT ke stok_sparepart dan barang_masuk dalam transaction)
app.post("/sparepart", (req, res) => {
    const { tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction sparepart:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Insert ke stok_sparepart
        db.query(
            "INSERT INTO stok_sparepart (tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error insert stok_sparepart:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }

                const stokId = result.insertId;

                // 2. Insert ke barang_masuk
                db.query(
                    "INSERT INTO barang_masuk (tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor],
                    (err2, result2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error insert barang_masuk:", err2);
                                res.status(500).json({ error: err2.sqlMessage || err2.message });
                            });
                        }

                        // 3. Commit transaction
                        db.commit((err3) => {
                            if (err3) {
                                return db.rollback(() => {
                                    console.error("Error commit sparepart:", err3);
                                    res.status(500).json({ error: err3.sqlMessage || err3.message });
                                });
                            }

                            res.json({
                                message: "Sparepart berhasil ditambahkan ke stok dan barang masuk",
                                stok_id: stokId,
                                barang_masuk_id: result2.insertId
                            });
                        });
                    }
                );
            }
        );
    });
});

// PUT /sparepart/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengupdate sparepart (UPDATE kedua tabel stok_sparepart dan barang_masuk dalam transaction)
app.put("/sparepart/:id", (req, res) => {
    const { id } = req.params;
    const { tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction update sparepart:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Update stok_sparepart
        db.query(
            "UPDATE stok_sparepart SET tgl_sparepart_masuk=?, nama_sparepart=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
            [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor, id],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error update stok_sparepart:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }
                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Sparepart tidak ditemukan" });
                    });
                }

                // 2. Update barang_masuk
                db.query(
                    "UPDATE barang_masuk SET tgl_sparepart_masuk=?, nama_sparepart=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
                    [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor, id],
                    (err2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error update barang_masuk:", err2);
                                res.status(500).json({ error: err2.sqlMessage || err2.message });
                            });
                        }

                        // 3. Commit transaction
                        db.commit((err3) => {
                            if (err3) {
                                return db.rollback(() => {
                                    console.error("Error commit update sparepart:", err3);
                                    res.status(500).json({ error: err3.sqlMessage || err3.message });
                                });
                            }
                            res.json({ message: "Sparepart berhasil diperbarui di kedua tabel" });
                        });
                    }
                );
            }
        );
    });
});

// DELETE /sparepart/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Menghapus sparepart (DELETE dari kedua tabel dengan validasi belum dipakai)
app.delete("/sparepart/:id", (req, res) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction delete sparepart:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Cek apakah sparepart sudah dipakai
        db.query("SELECT COUNT(*) as total FROM pemakaian_sparepart WHERE sparepart_id=?", [id], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error check pemakaian sparepart:", err);
                    res.status(500).json({ error: err.sqlMessage || err.message });
                });
            }

            if (result[0].total > 0) {
                return db.rollback(() => {
                    res.status(400).json({ message: "Sparepart sudah dipakai, tidak bisa dihapus" });
                });
            }

            // 2. Delete from stok_sparepart
            db.query("DELETE FROM stok_sparepart WHERE id=?", [id], (err2) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error("Error delete stok_sparepart:", err2);
                        res.status(500).json({ error: err2.sqlMessage || err2.message });
                    });
                }

                // 3. Delete from barang_masuk
                db.query("DELETE FROM barang_masuk WHERE id=?", [id], (err3) => {
                    if (err3) {
                        return db.rollback(() => {
                            console.error("Error delete barang_masuk:", err3);
                            res.status(500).json({ error: err3.sqlMessage || err3.message });
                        });
                    }

                    // 4. Commit transaction
                    db.commit((err4) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error("Error commit delete sparepart:", err4);
                                res.status(500).json({ error: err4.sqlMessage || err4.message });
                            });
                        }
                        res.json({ message: "Sparepart berhasil dihapus dari kedua tabel" });
                    });
                });
            });
        });
    });
});

// ========================================
// PEMAKAIAN SPAREPART ENDPOINTS
// ========================================

// POST /pemakaian
// Page: pemakaian.html | JS: js/sparepart/pemakaian.js
// Fungsi: Mencatat pemakaian sparepart (INSERT pemakaian dan UPDATE stok dalam transaction)
app.post("/pemakaian", (req, res) => {
    const { sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal } = req.body;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction pemakaian:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Cek stok tersedia
        db.query(
            "SELECT jumlah FROM stok_sparepart WHERE id = ?",
            [sparepart_id],
            (err, stokResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error select stok_sparepart:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }

                if (!stokResult || stokResult.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Sparepart tidak ditemukan" });
                    });
                }

                const stokTersedia = parseFloat(stokResult[0].jumlah) || 0;

                // 2. Validasi stok cukup
                if (stokTersedia < jumlahNum) {
                    return db.rollback(() => {
                        res.status(400).json({
                            message: `Stok tidak cukup! Tersedia: ${stokTersedia}, diminta: ${jumlahNum}`
                        });
                    });
                }

                // 3. Kurangi stok
                db.query(
                    "UPDATE stok_sparepart SET jumlah = jumlah - ? WHERE id = ?",
                    [jumlahNum, sparepart_id],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error update stok_sparepart:", err);
                                res.status(500).json({ error: err.sqlMessage || err.message });
                            });
                        }

                        // 4. Insert pemakaian
                        db.query(
                            "INSERT INTO pemakaian_sparepart (sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal) VALUES (?, ?, ?, ?, ?, ?)",
                            [sparepart_id, kendaraan_id, jumlahNum, satuan, penanggung_jawab, tanggal],
                            (err, result) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error insert pemakaian_sparepart:", err);
                                        res.status(500).json({ error: err.sqlMessage || err.message });
                                    });
                                }

                                // 5. Commit transaction
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("Error commit pemakaian_sparepart:", err);
                                            res.status(500).json({ error: err.sqlMessage || err.message });
                                        });
                                    }

                                    res.json({
                                        message: "Pemakaian berhasil disimpan dan stok berkurang",
                                        id: result.insertId
                                    });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// GET /pemakaian
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Mengambil data pemakaian sparepart untuk laporan
app.get("/pemakaian", (req, res) => {
    const sql = `
    SELECT 
      p.*,
      s.nama_sparepart,
      s.no_seri,
      k.dt_mobil,
      k.plat
    FROM pemakaian_sparepart p
    LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    ORDER BY p.tanggal DESC, p.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /pemakaian GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// GET /pemakaian_vendor
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Mengambil data pemakaian sparepart dengan filter vendor untuk laporan detail
app.get("/pemakaian_vendor", (req, res) => {
    try {
        let { start, end, vendor, barang, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) {
            return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        }
        if (end && !dateRE.test(end)) {
            return res.status(400).json({ error: "end harus format YYYY-MM-DD" });
        }

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT 
        p.id,
        bm.tgl_sparepart_masuk AS tanggal_masuk,
        s.no_seri,
        s.nama_sparepart,
        p.jumlah,
        p.satuan,
        s.harga,
        (p.jumlah * s.harga) AS total,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        p.tanggal AS tanggal_pemakaian
      FROM pemakaian_sparepart p
      LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
      LEFT JOIN barang_masuk bm ON s.id = bm.id
      LEFT JOIN vendor v ON s.id_vendor = v.id
      LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
      WHERE 1=1
    `;

        const params = [];

        if (start && end) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND s.id_vendor = ?";
            params.push(vendor);
        }

        if (barang) {
            sql += " AND s.nama_sparepart LIKE ?";
            params.push(`%${barang}%`);
        }

        if (kendaraan) {
            sql += " AND p.kendaraan_id = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY bm.tgl_sparepart_masuk DESC, p.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /pemakaian_vendor:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /pemakaian_vendor:", err);
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// BAN ENDPOINTS
// ========================================

// GET /ban
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengambil ban yang tersedia untuk penukaran ban (tidak sedang dipakai dan belum pernah diganti)
app.get("/ban", (req, res) => {
    db.query(
        `SELECT b.*, v.nama_vendor
     FROM stok_ban b
     LEFT JOIN vendor v ON b.id_vendor = v.id
     WHERE NOT EXISTS (
       SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = b.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM histori_ban hb WHERE hb.id_stok = b.id
     )
     ORDER BY b.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /ban GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// GET /ban/tersedia
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Mengambil ban tersedia (belum dipakai) dengan filter untuk input penukaran ban
app.get("/ban/tersedia", (req, res) => {
    try {
        let { vendor, merkBan } = req.query;

        let sql = `
      SELECT b.id, b.no_seri, b.merk_ban, b.jumlah, b.satuan, b.tgl_ban_masuk, b.harga, b.id_vendor, v.nama_vendor
      FROM stok_ban b
      LEFT JOIN vendor v ON b.id_vendor = v.id
      WHERE NOT EXISTS (
        SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = b.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM histori_ban hb WHERE hb.id_stok = b.id
      )
    `;
        const params = [];

        if (vendor) {
            sql += " AND b.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND b.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY b.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /ban/tersedia GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /ban/tersedia:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /ban
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Menambahkan stok ban baru ke tabel stok_ban
app.post("/ban", (req, res) => {
    const { tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    const jumlahNum = parseInt(jumlah, 10) || 0;
    db.query(
        "INSERT INTO stok_ban (tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [tgl_ban_masuk, merk_ban, no_seri, jumlahNum, satuan, harga, id_vendor],
        (err, result) => {
            if (err) {
                console.error("Error /ban POST:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.status(201).json({
                message: "Data ban berhasil ditambahkan",
                id: result.insertId
            });
        }
    );
});

// PUT /ban/:id
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Mengupdate data ban di tabel stok_ban
app.put("/ban/:id", (req, res) => {
    const { id } = req.params;
    const { tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    const jumlahNum = parseInt(jumlah, 10) || 0;

    db.query(
        "UPDATE stok_ban SET tgl_ban_masuk=?, merk_ban=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
        [tgl_ban_masuk, merk_ban, no_seri, jumlahNum, satuan, harga, id_vendor, id],
        (err, result) => {
            if (err) {
                console.error("Error /ban/:id PUT:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Ban tidak ditemukan" });
            res.json({ message: "Ban berhasil diperbarui" });
        }
    );
});

// DELETE /ban/:id
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Menghapus ban dengan validasi belum dipakai di penukaran_ban
app.delete('/ban/:id', (req, res) => {
    const id = req.params.id;

    const check = `SELECT COUNT(*) as total FROM penukaran_ban WHERE id_stok=?`;
    db.query(check, [id], (err, result) => {
        if (err) {
            console.error("Error check penukaran_ban:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        if (result[0].total > 0) {
            return res.status(400).json({
                message: "Ban sudah dipakai, tidak bisa dihapus."
            });
        }

        db.query("DELETE FROM stok_ban WHERE id=?", [id], (err2) => {
            if (err2) {
                console.error("Error delete stok_ban:", err2);
                return res.status(500).json({ error: err2.sqlMessage || err2.message });
            }
            res.json({ message: "Ban berhasil dihapus." });
        });
    });
});

// ========================================
// PENUKARAN BAN ENDPOINTS
// ========================================

// GET /pban/all
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengambil semua data penukaran_ban untuk ditampilkan dan diedit
app.get("/pban/all", (req, res) => {
    db.query(
        `SELECT 
        pb.id,
        pb.id_kendaraan,
        pb.supir,
        pb.tanggal_pasang_lama,
        pb.merk_lama,
        pb.seri_lama,
        pb.km_awal,
        pb.km_akhir,
        pb.jarak_km,
        pb.km_gps,
        pb.keterangan,
        pb.tgl_pasang_ban_baru,
        COALESCE(sb.merk_ban, pb.merk_baru) AS merk_baru,
        COALESCE(sb.no_seri, pb.seri_ban_baru) AS seri_ban_baru,
        pb.id_stok
     FROM penukaran_ban pb
     LEFT JOIN stok_ban sb ON pb.id_stok = sb.id
     ORDER BY pb.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /pban/all GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// PUT /pban/:id
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengupdate data penukaran ban dan menyimpan histori perubahan ke tabel histori_ban
app.put("/pban/:id", (req, res) => {
    const { id } = req.params;
    const {
        seri_lama,
        km_awal,
        km_akhir,
        jarak_km,
        km_gps,
        keterangan,
        id_stok,
        tgl_pasang_ban_baru,
        supir,
        seri_ban_baru,
        merk_baru
    } = req.body;

    db.query(
        "SELECT * FROM penukaran_ban WHERE id = ?",
        [id],
        (err, results) => {
            if (err) {
                console.error("Error select penukaran_ban:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (!results || results.length === 0) {
                return res.status(404).json({ message: "Data tidak ditemukan" });
            }

            const lama = results[0];

            db.query(
                `INSERT INTO histori_ban 
          (id_kendaraan, supir, tanggal_pasang_lama, merk_lama, seri_lama, km_awal, km_akhir, jarak_km, km_gps, keterangan, tgl_pasang_ban_baru, seri_ban_baru, merk_baru, id_stok)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lama.id_kendaraan, lama.supir, lama.tanggal_pasang_lama, lama.merk_lama, lama.seri_lama,
                    lama.km_awal, lama.km_akhir, lama.jarak_km, lama.km_gps, lama.keterangan,
                    lama.tgl_pasang_ban_baru, lama.seri_ban_baru, lama.merk_baru, lama.id_stok
                ],
                (err2) => {
                    if (err2) {
                        console.error("Error insert histori_ban:", err2);
                        return res.status(500).json({ error: err2.sqlMessage || err2.message });
                    }

                    const lama_tgl_pasang = lama.tgl_pasang_ban_baru;
                    const lama_merk_baru = lama.merk_baru;

                    db.query(
                        `UPDATE penukaran_ban
             SET seri_lama=?, km_awal=?, km_akhir=?, jarak_km=?, km_gps=?, keterangan=?, id_stok=?, tgl_pasang_ban_baru=?, supir=?, seri_ban_baru=?, merk_baru=?,
                 tanggal_pasang_lama=?, merk_lama=?
             WHERE id=?`,
                        [
                            seri_lama, km_awal, km_akhir, jarak_km, km_gps, keterangan, id_stok, tgl_pasang_ban_baru, supir, seri_ban_baru, merk_baru,
                            lama_tgl_pasang, lama_merk_baru,
                            id
                        ],
                        (err3, result) => {
                            if (err3) {
                                console.error("Error /pban/:id PUT:", err3);
                                return res.status(500).json({ error: err3.sqlMessage || err3.message });
                            }
                            res.json({ message: "Penukaran ban berhasil diupdate & histori tersimpan" });
                        }
                    );
                }
            );
        }
    );
});

// PUT /pban/edit/:id
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengupdate data penukaran ban TANPA menyimpan histori (untuk koreksi data)
app.put("/pban/edit/:id", (req, res) => {
    const { id } = req.params;
    const {
        seri_lama,
        merk_lama,
        tanggal_pasang_lama,
        km_awal,
        km_akhir,
        jarak_km,
        km_gps,
        keterangan,
        supir,
        seri_ban_baru,
        merk_baru,
        tgl_pasang_ban_baru
    } = req.body;

    db.query(
        `UPDATE penukaran_ban
         SET seri_lama=?, merk_lama=?, tanggal_pasang_lama=?, km_awal=?, km_akhir=?, 
             jarak_km=?, km_gps=?, keterangan=?, supir=?, seri_ban_baru=?, 
             merk_baru=?, tgl_pasang_ban_baru=?
         WHERE id=?`,
        [
            seri_lama, merk_lama, tanggal_pasang_lama, km_awal, km_akhir,
            jarak_km, km_gps, keterangan, supir, seri_ban_baru,
            merk_baru, tgl_pasang_ban_baru, id
        ],
        (err, result) => {
            if (err) {
                console.error("Error /pban/edit/:id PUT:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Data tidak ditemukan" });
            }
            res.json({ message: "Data ban berhasil diperbarui" });
        }
    );
});

// ========================================
// REKAP ENDPOINTS
// ========================================

// GET /rekap_lama
// Page: rekap.html | JS: js/barang/rekap.js
// Fungsi: Rekap data barang lama (dari tabel barang) dengan filter tanggal, vendor, dll
app.get("/rekap_lama", (req, res) => {
    try {
        let { start, end, vendor, barang, satuan, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        b.id,
        b.no_seri,
        b.nama_barang,
        b.merk,
        b.jumlah,
        b.satuan,
        b.harga,
        (b.jumlah * b.harga) AS total,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        b.Penanggung_jawab AS penanggung_jawab,
        b.tanggal
      FROM barang b
      LEFT JOIN vendor v ON b.vendor_id = v.id
      LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(b.tanggal) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(b.tanggal) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(b.tanggal) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND b.vendor_id = ?";
            params.push(vendor);
        }

        if (barang) {
            sql += " AND b.nama_barang LIKE ?";
            params.push(`%${barang}%`);
        }

        if (satuan && satuan !== 'semua') {
            sql += " AND b.satuan = ?";
            params.push(satuan);
        }

        if (kendaraan) {
            sql += " AND b.kendaraan_id = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY b.tanggal DESC, b.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap_lama:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap_lama:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /rekap
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Rekap umum (stok, pemakaian, vendor) dengan berbagai filter dan type
app.get("/rekap", (req, res) => {
    try {
        let { start, end, vendor, barang, satuan, type } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = "";
        let params = [];

        if (type === 'stok') {
            sql = `
        SELECT
          s.id,
          s.no_seri,
          s.nama_sparepart,
          '' AS merk,
          s.jumlah,
          s.satuan,
          s.harga,
          (s.jumlah * s.harga) AS total,
          v.nama_vendor,
          'Gudang Utama' AS lokasi,
          s.tgl_sparepart_masuk AS tanggal
        FROM stok_sparepart s
        LEFT JOIN vendor v ON s.id_vendor = v.id
        WHERE 1=1
      `;

            if (start && end) {
                sql += " AND DATE(s.tgl_sparepart_masuk) BETWEEN ? AND ?";
                params.push(start, end);
            } else if (start) {
                sql += " AND DATE(s.tgl_sparepart_masuk) = ?";
                params.push(start);
            } else if (end) {
                sql += " AND DATE(s.tgl_sparepart_masuk) = ?";
                params.push(end);
            }

            if (vendor) {
                sql += " AND s.id_vendor = ?";
                params.push(vendor);
            }

            if (barang) {
                sql += " AND s.nama_sparepart LIKE ?";
                params.push(`%${barang}%`);
            }

            if (satuan && satuan !== 'semua') {
                sql += " AND s.satuan = ?";
                params.push(satuan);
            }

            sql += " ORDER BY s.tgl_sparepart_masuk DESC, s.id DESC";

        } else if (type === 'kendaraan') {
            const jenisBarang = req.query.jenis_barang || 'semua';

            if (jenisBarang === 'sparepart') {
                sql = `
          SELECT
            p.id,
            s.no_seri,
            s.nama_sparepart,
            '' AS merk,
            p.jumlah,
            p.satuan,
            s.harga,
            (p.jumlah * s.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            p.penanggung_jawab,
            p.tanggal,
            '' AS keterangan
          FROM pemakaian_sparepart p
          LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
          LEFT JOIN vendor v ON s.id_vendor = v.id
          LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(p.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND s.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND s.nama_sparepart LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND p.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND p.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY p.tanggal DESC, p.id DESC";

            } else if (jenisBarang === 'ban') {
                sql = `
          SELECT
            pb.id,
            sb.no_seri,
            CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
            sb.merk_ban AS merk,
            1 AS jumlah,
            'pcs' AS satuan,
            sb.harga,
            sb.harga AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            pb.supir AS penanggung_jawab,
            pb.tgl_pasang_ban_baru AS tanggal,
            pb.keterangan
          FROM penukaran_ban pb
          JOIN stok_ban sb ON pb.id_stok = sb.id
          LEFT JOIN vendor v ON sb.id_vendor = v.id
          LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND CONCAT('Ban ', sb.merk_ban) LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND 'pcs' = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND pb.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

            } else {
                // UNION ALL untuk semua (sparepart + ban + barang + oli)
                sql = `
          SELECT
            p.id,
            s.no_seri,
            s.nama_sparepart,
            '' AS merk,
            p.jumlah,
            p.satuan,
            s.harga,
            (p.jumlah * s.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            p.penanggung_jawab,
            p.tanggal,
            '' AS keterangan
          FROM pemakaian_sparepart p
          LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
          LEFT JOIN vendor v ON s.id_vendor = v.id
          LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(p.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND s.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND s.nama_sparepart LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND p.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND p.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan penukaran ban
                sql += `
          UNION ALL
          SELECT
            pb.id,
            sb.no_seri,
            CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
            sb.merk_ban AS merk,
            1 AS jumlah,
            'pcs' AS satuan,
            sb.harga,
            sb.harga AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            pb.supir AS penanggung_jawab,
            pb.tgl_pasang_ban_baru AS tanggal,
            pb.keterangan
          FROM penukaran_ban pb
          JOIN stok_ban sb ON pb.id_stok = sb.id
          LEFT JOIN vendor v ON sb.id_vendor = v.id
          LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND CONCAT('Ban ', sb.merk_ban) LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND 'pcs' = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND pb.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan tabel barang (OUTPUT)
                sql += `
          UNION ALL
          SELECT
            b.id,
            b.no_seri,
            b.nama_barang AS nama_sparepart,
            b.merk,
            b.jumlah,
            b.satuan,
            b.harga,
            (b.jumlah * b.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            b.penanggung_jawab,
            b.tanggal,
            '' AS keterangan
          FROM barang b
          LEFT JOIN vendor v ON b.vendor_id = v.id
          LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(b.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(b.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(b.tanggal) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND b.vendor_id = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND b.nama_barang LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND b.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND b.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan pemakaian_oli
                sql += `
          UNION ALL
          SELECT
            po.id,
            om.no_seri,
            om.nama_oli AS nama_sparepart,
            '' AS merk,
            po.jumlah_pakai AS jumlah,
            om.satuan,
            om.harga AS harga,
            (po.jumlah_pakai * om.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            po.keterangan AS penanggung_jawab,
            po.tanggal_pakai AS tanggal,
            po.keterangan
          FROM pemakaian_oli po
          LEFT JOIN oli_masuk om ON po.id_oli_masuk = om.id
          LEFT JOIN vendor v ON om.id_vendor = v.id
          LEFT JOIN kendaraan k ON po.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(po.tanggal_pakai) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND om.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND om.nama_oli LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND om.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND po.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY tanggal DESC, id DESC";
            }

            // GET /rekap - Update bagian type === 'vendor'
            // Ganti bagian UNION oli_masuk dengan query ini:

            } else if (type === 'vendor') {
                // UNION: barang_masuk, stok_ban, dan oli_masuk (yang belum digabung)
                sql = `
                    SELECT
                        b.id,
                        b.tgl_sparepart_masuk AS tanggal,
                        b.nama_sparepart,
                        b.no_seri,
                        b.jumlah,
                        b.satuan,
                        b.harga,
                        (b.jumlah * b.harga) AS total,
                        v.nama_vendor,
                        b.id_vendor,
                        'Sparepart' AS jenis
                    FROM barang_masuk b
                    LEFT JOIN vendor v ON b.id_vendor = v.id
                    WHERE 1=1
                `;

                if (start && end) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND b.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND b.satuan = ?";
                    params.push(satuan);
                }

                // UNION dengan stok_ban
                sql += `
                    UNION ALL
                    SELECT
                        sb.id,
                        sb.tgl_ban_masuk AS tanggal,
                        CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
                        sb.no_seri,
                        sb.jumlah,
                        sb.satuan,
                        sb.harga,
                        (sb.jumlah * sb.harga) AS total,
                        v.nama_vendor,
                        sb.id_vendor,
                        'Ban' AS jenis
                    FROM stok_ban sb
                    LEFT JOIN vendor v ON sb.id_vendor = v.id
                    WHERE 1=1
                `;

                if (start && end) {
                    sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(sb.tgl_ban_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(sb.tgl_ban_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND sb.satuan = ?";
                    params.push(satuan);
                }

                // UNION dengan oli_masuk (HANYA yang belum digabung / id_oli_lama IS NULL)
                sql += `
                    UNION ALL
                    SELECT
                        om.id,
                        om.tanggal_masuk AS tanggal,
                        om.nama_oli AS nama_sparepart,
                        om.no_seri,
                        om.total_masuk AS jumlah,
                        om.satuan,
                        om.harga,
                        (om.total_masuk * om.harga) AS total,
                        v.nama_vendor,
                        om.id_vendor,
                        'Oli' AS jenis
                    FROM oli_masuk om
                    LEFT JOIN vendor v ON om.id_vendor = v.id
                    WHERE om.id_oli_lama IS NULL
                `;

                if (start && end) {
                    sql += " AND DATE(om.tanggal_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(om.tanggal_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(om.tanggal_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND om.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND om.satuan = ?";
                    params.push(satuan);
                }

                sql += " ORDER BY tanggal DESC, id DESC";
            } else {
            // Default: return empty array jika type tidak valid
            return res.json([]);
        }

        // Eksekusi query
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /rekap_ban
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap penukaran ban yang sudah dipakai dengan filter tanggal, vendor, kendaraan
app.get("/rekap_ban", (req, res) => {
    try {
        let { start, end, vendor, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        pb.id,
        pb.seri_lama,
        pb.merk_lama,
        pb.tanggal_pasang_lama,
        pb.km_awal,
        pb.km_akhir,
        pb.jarak_km,
        pb.keterangan,
        sb.no_seri,
        sb.merk_ban,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        pb.supir,
        pb.tgl_pasang_ban_baru,
        pb.km_gps
      FROM penukaran_ban pb
      JOIN stok_ban sb ON pb.id_stok = sb.id
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (kendaraan) {
            if (isNaN(kendaraan)) {
                sql += " AND CONCAT(k.dt_mobil, ' - ', k.plat) LIKE ?";
                params.push(`%${kendaraan}%`);
            } else {
                sql += " AND pb.id_kendaraan = ?";
                params.push(kendaraan);
            }
        }

        sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap_ban:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap_ban:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /ban_masuk
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap data ban masuk (dari stok_ban) dengan filter tanggal, vendor, merk ban
app.get("/ban_masuk", (req, res) => {
    try {
        let { start, end, vendor, merkBan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        sb.id,
        sb.tgl_ban_masuk,
        sb.merk_ban,
        sb.no_seri,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        v.nama_vendor
      FROM stok_ban sb
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND sb.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY sb.tgl_ban_masuk DESC, sb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /ban_masuk:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /ban_masuk:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /stok_ban
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap stok ban yang belum dipakai dengan filter tanggal, vendor, merk ban
app.get("/stok_ban", (req, res) => {
    try {
        let { start, end, vendor, merkBan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        sb.id,
        sb.tgl_ban_masuk,
        sb.merk_ban,
        sb.no_seri,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        sb.id_vendor,
        v.nama_vendor
      FROM stok_ban sb
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      WHERE NOT EXISTS (
        SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = sb.id
      )
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND sb.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY sb.tgl_ban_masuk DESC, sb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /stok_ban:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /stok_ban:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /data_kendaraan
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Riwayat penukaran ban per kendaraan dengan filter tanggal
app.get("/data_kendaraan", (req, res) => {
    try {
        let { start, end, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        pb.supir,
        pb.tanggal_pasang_lama,
        pb.merk_lama,
        pb.seri_lama,
        pb.km_awal,
        pb.km_akhir,
        pb.jarak_km,
        pb.km_gps,
        pb.keterangan,
        pb.tgl_pasang_ban_baru,
        pb.merk_baru,
        pb.seri_ban_baru
      FROM penukaran_ban pb
      LEFT JOIN stok_ban sb ON pb.id_stok = sb.id
      LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(end);
        }

        if (kendaraan) {
            sql += " AND pb.id_kendaraan = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /data_kendaraan:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /data_kendaraan:", err);
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// OLI MASUK ENDPOINTS
// ========================================

// GET /oli_masuk
// Pages: inoli.html, rekapoli.html | JS: js/literan/inoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar oli masuk dengan JOIN vendor dan kalkulasi stok tersisa
app.get("/oli_masuk", (req, res) => {
    db.query(
        `SELECT 
      om.*,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa,
      COALESCE(
        (SELECT SUM(po.jumlah_pakai) FROM pemakaian_oli po WHERE po.id_oli_masuk = om.id),
        0
      ) AS total_dipakai
     FROM oli_masuk om
     LEFT JOIN vendor v ON om.id_vendor = v.id
     LEFT JOIN stok_oli so ON om.id = so.id_oli_masuk
     ORDER BY om.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /oli_masuk GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// GET /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengambil detail oli masuk tertentu untuk edit
app.get("/oli_masuk/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT 
      om.*,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa
     FROM oli_masuk om
     LEFT JOIN vendor v ON om.id_vendor = v.id
     LEFT JOIN stok_oli so ON om.id = so.id_oli_masuk
     WHERE om.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /oli_masuk/:id GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            if (!results || results.length === 0) {
                return res.status(404).json({ message: "Oli masuk tidak ditemukan" });
            }
            res.json(results[0]);
        }
    );
});

// GET /oli_lama
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengambil data oli yang pernah menjadi "oli lama" untuk fitur gabungan oli
app.get("/oli_lama", (req, res) => {
    const sql = `
    SELECT 
      om_lama.id AS id_oli_masuk,
      om_lama.tanggal_masuk,
      om_lama.nama_oli,
      om_lama.no_seri,
      om_lama.jumlah_baru,
      om_lama.sisa_lama,
      om_lama.total_stok,
      om_lama.satuan,
      om_lama.id_vendor,
      om_lama.id_oli_baru,
      om_lama.keterangan,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa,
      om_baru.no_seri AS no_seri_baru,
      om_baru.nama_oli AS nama_oli_baru,
      om_baru.tanggal_masuk AS tanggal_gabung,
      om_baru.sisa_lama AS sisa_lama_digabung
    FROM oli_masuk om_lama
    LEFT JOIN vendor v ON om_lama.id_vendor = v.id
    LEFT JOIN stok_oli so ON om_lama.id = so.id_oli_masuk
    LEFT JOIN oli_masuk om_baru ON om_lama.id_oli_baru = om_baru.id
    WHERE om_lama.id IN (
      SELECT DISTINCT id_oli_lama 
      FROM oli_masuk 
      WHERE id_oli_lama IS NOT NULL
    )
    ORDER BY om_lama.tanggal_masuk DESC, om_lama.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /oli_lama GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// POST /oli_masuk
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Menambahkan oli masuk dengan fitur gabungan oli lama (transaction kompleks)
app.post("/oli_masuk", (req, res) => {
    const {
        tanggal_masuk,
        nama_oli,
        no_seri,
        jumlah_baru,
        sisa_lama,
        satuan,
        harga,
        id_vendor,
        id_oli_lama,
        keterangan
    } = req.body;

    const jumlahBaruNum = parseFloat(jumlah_baru) || 0;
    const sisaLamaNum = parseFloat(sisa_lama) || 0;
    const hargaNum = parseFloat(harga) || 0;
    const totalMasuk = jumlahBaruNum + sisaLamaNum;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction oli_masuk:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Insert ke oli_masuk
        db.query(
            `INSERT INTO oli_masuk 
        (tanggal_masuk, nama_oli, no_seri, jumlah_baru, sisa_lama, total_masuk, stok_tersisa, satuan, harga, id_vendor, id_oli_lama, keterangan) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tanggal_masuk, nama_oli, no_seri, jumlahBaruNum, sisaLamaNum, totalMasuk, totalMasuk, satuan, hargaNum, id_vendor, id_oli_lama, keterangan],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error insert oli_masuk:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }

                const oliMasukId = result.insertId;

                // 2. Insert ke stok_oli
                db.query(
                    `INSERT INTO stok_oli (id_oli_masuk, total_stok) VALUES (?, ?)`,
                    [oliMasukId, totalMasuk],
                    (err2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error insert stok_oli:", err2);
                                res.status(500).json({ error: err2.sqlMessage || err2.message });
                            });
                        }

                        // 3. Jika ada oli lama yang digabung
                        if (id_oli_lama) {
                            db.query(
                                `UPDATE oli_masuk SET id_oli_baru = ? WHERE id = ?`,
                                [oliMasukId, id_oli_lama],
                                (err3) => {
                                    if (err3) {
                                        return db.rollback(() => {
                                            console.error("Error update oli_masuk id_oli_baru:", err3);
                                            res.status(500).json({ error: err3.sqlMessage || err3.message });
                                        });
                                    }

                                    // 4. Update stok oli lama menjadi 0
                                    db.query(
                                        `UPDATE stok_oli SET total_stok = 0 WHERE id_oli_masuk = ?`,
                                        [id_oli_lama],
                                        (err4) => {
                                            if (err4) {
                                                return db.rollback(() => {
                                                    console.error("Error update stok_oli lama:", err4);
                                                    res.status(500).json({ error: err4.sqlMessage || err4.message });
                                                });
                                            }

                                            db.commit((err5) => {
                                                if (err5) {
                                                    return db.rollback(() => {
                                                        console.error("Error commit oli_masuk:", err5);
                                                        res.status(500).json({ error: err5.sqlMessage || err5.message });
                                                    });
                                                }
                                                res.json({
                                                    message: "Oli masuk berhasil ditambahkan dan stok diperbarui",
                                                    id: oliMasukId
                                                });
                                            });
                                        }
                                    );
                                }
                            );
                        } else {
                            db.commit((err5) => {
                                if (err5) {
                                    return db.rollback(() => {
                                        console.error("Error commit oli_masuk:", err5);
                                        res.status(500).json({ error: err5.sqlMessage || err5.message });
                                    });
                                }
                                res.json({
                                    message: "Oli masuk berhasil ditambahkan",
                                    id: oliMasukId
                                });
                            });
                        }
                    }
                );
            }
        );
    });
});

// PUT /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengupdate oli masuk dengan update stok terkait
app.put("/oli_masuk/:id", (req, res) => {
    const { id } = req.params;
    const {
        tanggal_masuk,
        nama_oli,
        no_seri,
        jumlah_baru,
        sisa_lama,
        satuan,
        harga,
        id_vendor,
        id_oli_lama,
        keterangan
    } = req.body;

    const jumlahBaruNum = parseFloat(jumlah_baru) || 0;
    const sisaLamaNum = parseFloat(sisa_lama) || 0;
    const hargaNum = parseFloat(harga) || 0;
    const totalMasuk = jumlahBaruNum + sisaLamaNum;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction update oli_masuk:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Update oli_masuk
        db.query(
            `UPDATE oli_masuk 
      SET tanggal_masuk=?, nama_oli=?, no_seri=?, jumlah_baru=?, sisa_lama=?, 
          total_masuk=?, stok_tersisa=?, satuan=?, harga=?, id_vendor=?, id_oli_lama=?, keterangan=? 
      WHERE id=?`,
            [tanggal_masuk, nama_oli, no_seri, jumlahBaruNum, sisaLamaNum,
                totalMasuk, totalMasuk, satuan, hargaNum, id_vendor, id_oli_lama, keterangan, id],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error update oli_masuk:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }
                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Oli masuk tidak ditemukan" });
                    });
                }

                // 2. Update stok_oli
                db.query(
                    `UPDATE stok_oli SET total_stok = ? WHERE id_oli_masuk = ?`,
                    [totalMasuk, id],
                    (err2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error update stok_oli:", err2);
                                res.status(500).json({ error: err2.sqlMessage || err2.message });
                            });
                        }

                        db.commit((err3) => {
                            if (err3) {
                                return db.rollback(() => {
                                    console.error("Error commit update oli_masuk:", err3);
                                    res.status(500).json({ error: err3.sqlMessage || err3.message });
                                });
                            }
                            res.json({ message: "Oli masuk berhasil diperbarui" });
                        });
                    }
                );
            }
        );
    });
});

// DELETE /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Menghapus oli masuk dengan validasi belum dipakai
app.delete("/oli_masuk/:id", (req, res) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction delete oli_masuk:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Cek apakah oli sudah dipakai
        db.query(
            "SELECT COUNT(*) as total FROM pemakaian_oli WHERE id_oli_masuk=?",
            [id],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error check pemakaian oli:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }

                if (result[0].total > 0) {
                    return db.rollback(() => {
                        res.status(400).json({ message: "Oli sudah dipakai, tidak bisa dihapus" });
                    });
                }

                // 2. Delete stok_oli
                db.query("DELETE FROM stok_oli WHERE id_oli_masuk=?", [id], (err2) => {
                    if (err2) {
                        return db.rollback(() => {
                            console.error("Error delete stok_oli:", err2);
                            res.status(500).json({ error: err2.sqlMessage || err2.message });
                        });
                    }

                    // 3. Delete oli_masuk
                    db.query("DELETE FROM oli_masuk WHERE id=?", [id], (err3) => {
                        if (err3) {
                            return db.rollback(() => {
                                console.error("Error delete oli_masuk:", err3);
                                res.status(500).json({ error: err3.sqlMessage || err3.message });
                            });
                        }

                        db.commit((err4) => {
                            if (err4) {
                                return db.rollback(() => {
                                    console.error("Error commit delete oli_masuk:", err4);
                                    res.status(500).json({ error: err4.sqlMessage || err4.message });
                                });
                            }
                            res.json({ message: "Oli masuk berhasil dihapus" });
                        });
                    });
                });
            }
        );
    });
});

// ========================================
// STOK OLI ENDPOINTS
// ========================================

// GET /stok_oli
// Page: pemakaianoli.html | JS: js/literan/pemakaianoli.js
// Fungsi: Mengambil stok oli yang tersedia (total_stok > 0) untuk pemakaian
app.get("/stok_oli", (req, res) => {
    db.query(
        `SELECT 
      so.id,
      so.id_oli_masuk,
      so.total_stok,
      om.nama_oli,
      om.no_seri,
      om.tanggal_masuk,
      om.satuan,
      v.nama_vendor
     FROM stok_oli so
     JOIN oli_masuk om ON so.id_oli_masuk = om.id
     LEFT JOIN vendor v ON om.id_vendor = v.id
     WHERE so.total_stok > 0
     ORDER BY om.nama_oli, om.no_seri`,
        (err, results) => {
            if (err) {
                console.error("Error /stok_oli GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// ========================================
// PEMAKAIAN OLI ENDPOINTS
// ========================================

// GET /pemakaian_oli
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Mengambil data pemakaian oli untuk laporan
app.get("/pemakaian_oli", (req, res) => {
    db.query(
        `SELECT 
      po.*,
      om.nama_oli,
      om.no_seri,
      k.dt_mobil,
      k.plat
     FROM pemakaian_oli po
     JOIN oli_masuk om ON po.id_oli_masuk = om.id
     JOIN kendaraan k ON po.id_kendaraan = k.id
     ORDER BY po.tanggal_pakai DESC, po.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /pemakaian_oli GET:", err);
                return res.status(500).json({ error: err.sqlMessage || err.message });
            }
            res.json(results);
        }
    );
});

// POST /pemakaian_oli
// Page: pemakaianoli.html | JS: js/literan/pemakaianoli.js
// Fungsi: Mencatat pemakaian oli (INSERT pemakaian dan UPDATE stok dalam transaction)
app.post("/pemakaian_oli", (req, res) => {
    const {
        tanggal_pakai,
        id_oli_masuk,
        id_kendaraan,
        jumlah_pakai,
        keterangan
    } = req.body;
    const jumlahPakaiNum = parseFloat(jumlah_pakai) || 0;

    if (!tanggal_pakai || !id_oli_masuk || !id_kendaraan || jumlahPakaiNum <= 0) {
        return res.status(400).json({
            message: "Data tidak lengkap atau jumlah pakai tidak valid"
        });
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction pemakaian_oli:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        // 1. Cek stok tersedia
        db.query(
            "SELECT total_stok FROM stok_oli WHERE id_oli_masuk = ?",
            [id_oli_masuk],
            (err, stokResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error check stok:", err);
                        res.status(500).json({ error: err.sqlMessage || err.message });
                    });
                }
                if (!stokResult || stokResult.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Stok oli tidak ditemukan" });
                    });
                }

                const stokTersedia = parseFloat(stokResult[0].total_stok) || 0;
                if (jumlahPakaiNum > stokTersedia) {
                    return db.rollback(() => {
                        res.status(400).json({
                            message: `Stok tidak mencukupi. Tersedia: ${stokTersedia}L, Diminta: ${jumlahPakaiNum}L`
                        });
                    });
                }

                // 2. Insert pemakaian_oli
                db.query(
                    `INSERT INTO pemakaian_oli
          (tanggal_pakai, id_oli_masuk, id_kendaraan, jumlah_pakai, keterangan)
          VALUES (?, ?, ?, ?, ?)`,
                    [tanggal_pakai, id_oli_masuk, id_kendaraan, jumlahPakaiNum, keterangan || null],
                    (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error insert pemakaian_oli:", err);
                                res.status(500).json({ error: err.sqlMessage || err.message });
                            });
                        }

                        // 3. Update stok_oli (kurangi stok)
                        const stokBaru = stokTersedia - jumlahPakaiNum;
                        db.query(
                            "UPDATE stok_oli SET total_stok = ? WHERE id_oli_masuk = ?",
                            [stokBaru, id_oli_masuk],
                            (err2) => {
                                if (err2) {
                                    return db.rollback(() => {
                                        console.error("Error update stok_oli:", err2);
                                        res.status(500).json({ error: err2.sqlMessage || err2.message });
                                    });
                                }

                                // 4. Update stok_tersisa di oli_masuk
                                db.query(
                                    "UPDATE oli_masuk SET stok_tersisa = stok_tersisa - ? WHERE id = ?",
                                    [jumlahPakaiNum, id_oli_masuk],
                                    (err3) => {
                                        if (err3) {
                                            return db.rollback(() => {
                                                console.error("Error update oli_masuk stok_tersisa:", err3);
                                                res.status(500).json({ error: err3.sqlMessage || err3.message });
                                            });
                                        }

                                        db.commit((err4) => {
                                            if (err4) {
                                                return db.rollback(() => {
                                                    console.error("Error commit pemakaian_oli:", err4);
                                                    res.status(500).json({ error: err4.sqlMessage || err4.message });
                                                });
                                            }
                                            res.json({
                                                message: "Pemakaian oli berhasil dicatat",
                                                id: result.insertId,
                                                stok_tersisa: stokBaru
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});

// ========================================
// REKAP OLI ENDPOINTS
// ========================================

// GET /rekap/oli_masuk
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap oli masuk (tanpa gabungan) dengan filter tanggal, vendor, nama oli
app.get("/rekap/oli_masuk", (req, res) => {
    const { start, end, vendor, nama_oli } = req.query;

    let sql = `
    SELECT 
      om.id,
      om.tanggal_masuk,
      om.nama_oli,
      om.no_seri,
      om.jumlah_baru,
      om.harga,
      om.satuan,
      v.nama_vendor
    FROM oli_masuk om
    LEFT JOIN vendor v ON om.id_vendor = v.id
    WHERE 1=1
  `;

    const params = [];

    if (start && end) {
        sql += ` AND DATE(om.tanggal_masuk) BETWEEN ? AND ?`;
        params.push(start, end);
    }

    if (vendor) {
        sql += ` AND om.id_vendor = ?`;
        params.push(vendor);
    }

    if (nama_oli) {
        sql += ` AND om.nama_oli LIKE ?`;
        params.push(`%${nama_oli}%`);
    }

    sql += ` ORDER BY om.tanggal_masuk DESC, om.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/oli_masuk GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// GET /rekap/oli_tersedia
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap oli tersedia dengan filter vendor, nama oli, tanggal (menampilkan semua data dari stok_oli)
app.get("/rekap/oli_tersedia", (req, res) => {
    const { vendor, nama_oli, start, end } = req.query;

    let sql = `
    SELECT
      om.id,
      om.tanggal_masuk,
      om.nama_oli,
      om.no_seri,
      om.jumlah_baru,
      om.sisa_lama,
      om.total_masuk,
      om.stok_tersisa AS stok_tersisa_om,
      COALESCE(so.total_stok, 0) AS total_stok,
      om.satuan,
      om.harga,
      om.id_vendor,
      om.id_oli_lama,
      om.id_oli_baru,
      v.nama_vendor,
      om_lama.no_seri AS no_seri_lama,
      COALESCE(
        (SELECT SUM(po.jumlah_pakai)
         FROM pemakaian_oli po
         WHERE po.id_oli_masuk = om.id),
        0
      ) as total_dipakai
    FROM stok_oli so
    JOIN oli_masuk om ON so.id_oli_masuk = om.id
    LEFT JOIN vendor v ON om.id_vendor = v.id
    LEFT JOIN oli_masuk om_lama ON om.id_oli_lama = om_lama.id
  `;

    const params = [];

    // Filter tanggal
    if (start && end) {
        sql += " AND DATE(om.tanggal_masuk) BETWEEN ? AND ?";
        params.push(start, end);
    } else if (start) {
        sql += " AND DATE(om.tanggal_masuk) = ?";
        params.push(start);
    } else if (end) {
        sql += " AND DATE(om.tanggal_masuk) = ?";
        params.push(end);
    }

    if (vendor) {
        sql += " AND om.id_vendor = ?";
        params.push(vendor);
    }

    if (nama_oli) {
        sql += " AND om.nama_oli LIKE ?";
        params.push(`%${nama_oli}%`);
    }

    sql += " ORDER BY om.nama_oli, om.no_seri";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/oli_tersedia GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// GET /rekap/pemakaian_oli
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap pemakaian oli dengan filter tanggal, kendaraan, nama oli, vendor
app.get("/rekap/pemakaian_oli", (req, res) => {
    const { start, end, kendaraan, nama_oli, vendor } = req.query;

    let sql = `
    SELECT 
      po.id,
      po.tanggal_pakai,
      po.jumlah_pakai,
      po.keterangan,
      om.nama_oli,
      om.no_seri,
      om.harga,
      CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
      v.nama_vendor,
      om.id_vendor
    FROM pemakaian_oli po
    JOIN oli_masuk om ON po.id_oli_masuk = om.id
    JOIN kendaraan k ON po.id_kendaraan = k.id
    LEFT JOIN vendor v ON om.id_vendor = v.id
    WHERE 1=1
  `;

    const params = [];

    if (start && end) {
        sql += ` AND DATE(po.tanggal_pakai) BETWEEN ? AND ?`;
        params.push(start, end);
    }

    if (kendaraan) {
        sql += ` AND po.id_kendaraan = ?`;
        params.push(kendaraan);
    }

    if (nama_oli) {
        sql += ` AND om.nama_oli LIKE ?`;
        params.push(`%${nama_oli}%`);
    }

    if (vendor) {
        sql += ` AND om.id_vendor = ?`;
        params.push(vendor);
    }

    sql += ` ORDER BY po.tanggal_pakai DESC, po.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/pemakaian_oli GET:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json(results);
    });
});

// ========================================
// GENERAL ENDPOINTS
// ========================================

// GET /
// Page: index.html
// Fungsi: Serving halaman utama aplikasi inventory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});