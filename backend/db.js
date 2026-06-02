const mysql = require('mysql2');

console.log("🔌 Connecting to DB...");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "db_stok",
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

pool.getConnection((err, conn) => {
    if (err) {
        console.error("❌ Database gagal connect:", err.message);
    } else {
        console.log("✅ Database connected!");
        conn.release();
        console.log("Opening Browser...");
    }
});

module.exports = pool;
