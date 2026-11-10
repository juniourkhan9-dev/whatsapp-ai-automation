const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { generateAppointmentPDF } = require('./pdfGenerator');
const whatsappService = require('./whatsappService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Storage directory
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// WhatsApp Connection Status
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        ready: whatsappService.isReady(),
        qr: whatsappService.getQR(),
        user: whatsappService.getInfo()
    });
});

server.listen(PORT, () => {
    console.log(`✅ WhatsApp AI Business Engine running on port ${PORT}`);
});
