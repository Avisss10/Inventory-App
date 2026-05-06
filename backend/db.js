const mysql = require('mysql2');

console.log("🔌 Connecting to DB...");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "db_stock",
    dateStrings: true
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database gagal connect:", err.message);
  } else {
    console.log("✅ Database connected!");
  }
});

module.exports = db;