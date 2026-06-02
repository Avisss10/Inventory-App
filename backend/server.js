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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// request timeout: kill requests that hang > 30s
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error(`⏱️  Request timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) res.status(503).json({ error: "Request timeout" });
    });
    next();
});

// static frontend
const basePath = process.pkg
  ? path.dirname(process.execPath) // saat exe
  : path.join(__dirname, '..');    // saat dev

app.use(express.static(path.join(basePath, 'frontend')));

// 🔥 mount page routes
app.use('/', require('./routes/page.routes'));

// 🔥 mount legacy routes
app.use('/', require('./routes/legacy.routes'));

// global error handler
app.use((err, req, res, next) => {
    console.error("💥 Unhandled error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

// start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);

    const { exec } = require('child_process');
    const url = `http://localhost:${PORT}`;
    const opener =
        process.platform === 'win32' ? `start "" "${url}"` :
        process.platform === 'darwin' ? `open "${url}"` :
        `xdg-open "${url}"`;
    exec(opener);
});

// keep-alive timeout > proxy timeout to avoid premature connection drops
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
