const express = require('express');
const path = require('path');

const router = express.Router();
const frontendPath = path.join(__dirname, '../../frontend');

// HOME
router.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// VENDOR
router.get('/vendor', (req, res) => {
    res.sendFile(path.join(frontendPath, 'vendor.html'));
});

//KENDARAAN
router.get('/kendaraan', (req, res) => {
    res.sendFile(path.join(frontendPath, 'kendaraan.html'));
});

// BARANG
router.get('/barang', (req, res) => {
    res.sendFile(path.join(frontendPath, 'barang.html'));
});

router.get('/rekap', (req, res) => {
    res.sendFile(path.join(frontendPath, 'rekap.html'));
});

//BAN
router.get('/ban', (req, res) => {
    res.sendFile(path.join(frontendPath, 'ban.html'));
});

router.get('/pban', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pban.html'));
});

router.get('/lapban', (req, res) => {
    res.sendFile(path.join(frontendPath, 'lapban.html'));
});

//SPAREPART
router.get('/insparepart', (req, res) => {
    res.sendFile(path.join(frontendPath, 'insparepart.html'));
});

router.get('/pemakaian', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pemakaian.html'));
});

router.get('editpemakaian', (req, res) => {
    res.sendFile(path.join(frontendPath, 'editpemakaian.html'));    
});

router.get('/rekapsemua', (req, res) => {
    res.sendFile(path.join(frontendPath, 'rekapsemua.html'));
});

//OLI
router.get('/inoli', (req, res) => {
    res.sendFile(path.join(frontendPath, 'inoli.html'));
});

router.get('/pemakaianoli', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pemakaianoli.html'));
});

router.get('/rekapoli', (req, res) => {
    res.sendFile(path.join(frontendPath, 'rekapoli.html'));
});

module.exports = router;
