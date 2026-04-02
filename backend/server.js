console.log("🚀 Server starting...");

//require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// static frontend
const basePath = process.pkg
  ? path.dirname(process.execPath) // saat exe
  : path.join(__dirname, '..');    // saat dev

app.use(express.static(path.join(basePath, 'frontend')));

// 🔥 mount page routes
app.use('/', require('./routes/page.routes'));

// 🔥 mount legacy routes
app.use('/', require('./routes/legacy.routes'));

// start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
