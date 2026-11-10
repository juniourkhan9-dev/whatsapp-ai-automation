const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { generateAppointmentPDF } = require('./pdfGenerator');

let qrCodeDataURL = null;
let isClientReady = false;
let clientUserInfo = null;

const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
];

const puppeteerConfig = {
    headless: true,
    args: puppeteerArgs
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: puppeteerConfig
});

client.on('qr', async (qr) => {
    qrCodeDataURL = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
    isClientReady = true;
    qrCodeDataURL = null;
    clientUserInfo = client.info;
    console.log('✅ WHATSAPP ENGINE IS FULLY ONLINE & READY!');
});

client.on('authenticated', () => {
    console.log('WhatsApp Authenticated Successfully!');
});

// Storage Directory
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

// Review Links
const REVIEW_LINKS = [
    { title: '⭐ Google Business Reviews (4.9 ★ Rating - 180+ Reviews)', url: 'https://maps.google.com/?cid=12345678' },
    { title: '🎥 Video Case Studies & Feedback', url: 'https://youtube.com/watch?v=sample-review' },
    { title: '🛡️ Verified Customer Proof & Portfolio', url: 'https://trustpilot.com/review/example-business' }
];

// User session memory
const userSessions = {};

// Clean Interactive Menu (Keyboard Shortcut friendly)
function getMenu() {
    return `Namaste! 🙏 *Business AI Assistant* me aapka swagat hai.\n\nKripya neeche diye gaye option me se chunein:\n\n1️⃣ *[ 1 ] - 💡 Services & Pricing*\n2️⃣ *[ 2 ] - ⭐ Client Reviews & Proof*\n3️⃣ *[ 3 ] - 📞 Book Appointment & PDF Slip*\n\n_👉 Bas *1*, *2*, ya *3* likh kar reply karein!_`;
}

client.on('message', async (msg) => {
    if (msg.from.includes('@broadcast') || msg.isGroupMsg) return;

    const text = (msg.body || '').trim();
    if (!text) return;

    const lower = text.toLowerCase();
    const from = msg.from;
    console.log(`📩 Recv from [${from}]: "${text}"`);

    if (!userSessions[from]) {
        userSessions[from] = { step: 'IDLE', data: {} };
    }
    const session = userSessions[from];

    // ================= APPOINTMENT FLOW =================
    if (session.step === 'ASK_NAME') {
        session.data.name = text;
        session.step = 'ASK_DATE_TIME';
        await msg.reply(`Dhanyawaad *${session.data.name}* ji! 🙏\n\nAap kis *Date aur Time* par appointment chahte hain?\n(Example: *12 Nov ko dopahar 3:00 PM*)`);
        return;
    }

    if (session.step === 'ASK_DATE_TIME') {
        session.data.dateTime = text;
        session.step = 'ASK_ADDRESS';
        await msg.reply(`Time note kar liya: *${session.data.dateTime}*.\n\nKripya apna *Address ya City* bataiye:`);
        return;
    }

    if (session.step === 'ASK_ADDRESS') {
        session.data.address = text;
        session.step = 'IDLE';

        await msg.reply(`✅ *Booking Details Confirm:*\n• Naam: *${session.data.name}*\n• Time: *${session.data.dateTime}*\n• Address: *${session.data.address}*\n\n⏳ Google Calendar me slot book karke aapki Confirmation PDF Slip banayi ja rahi hai...`);

        try {
            const safeName = session.data.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Appointment_${safeName}_${Date.now()}.pdf`;
            const filePath = path.join(storageDir, fileName);

            const bookingId = await generateAppointmentPDF({
                name: session.data.name,
                phone: from.replace(/[^0-9]/g, ''),
                date: session.data.dateTime,
                time: 'Scheduled Time',
                address: session.data.address,
                requirement: 'WhatsApp Business AI Automated Booking'
            }, filePath);

            const media = MessageMedia.fromFilePath(filePath);
            await client.sendMessage(from, media, {
                caption: `🎉 *Appointment Confirmed!*\nBooking ID: *${bookingId}*\nAapki official confirmation PDF slip upar attach kar di gayi hai. Thank you! 🙏`
            });
            console.log(`✅ PDF Sent to ${from}`);
        } catch (err) {
            console.error('PDF Error:', err);
            await msg.reply("Aapka appointment book ho gaya hai! Hamari team jald connect karegi.");
        }
        return;
    }

    // ================= INSTANT 1-CLICK ACTIONS =================

    // OPTION 1: Services & Pricing
    if (text === '1' || lower.includes('service') || lower.includes('price') || lower.includes('cost') || lower.includes('rate')) {
        const reply = `💡 *Hamari Services & Pricing:*\n\n1. *WhatsApp AI Automation* - 24/7 Auto Sales & FAQ Bot.\n2. *AI Voice Calling Agent* - Human voice me direct phone call confirmation.\n3. *Calendar & PDF Receipt* - Real-time slot locking aur automated PDF receipt.\n\n_Consultation / Appointment ke liye *3* likhein!_`;
        await msg.reply(reply);
        return;
    }

    // OPTION 2: Client Reviews & Proof
    if (text === '2' || lower.includes('review') || lower.includes('proof') || lower.includes('feedback') || lower.includes('portfolio')) {
        let reply = `⭐ *Verified Client Reviews & Proof:*\n\n`;
        REVIEW_LINKS.forEach((rev, idx) => {
            reply += `${idx + 1}. *${rev.title}*\n👉 ${rev.url}\n\n`;
        });
        reply += `_Appointment book karne ke liye *3* likhein!_`;
        await msg.reply(reply);
        return;
    }

    // OPTION 3: Booking Appointment
    if (text === '3' || lower.includes('book') || lower.includes('appointment') || lower.includes('call') || lower === 'haan' || lower === 'yes') {
        session.step = 'ASK_NAME';
        await msg.reply(`Bahut badhiya! 🎉\n\nAppointment confirm karne ke liye kripya apna *Pura Naam (Full Name)* bhejiye:`);
        return;
    }

    // DEFAULT MENU (Any incoming text like "Hi", "Hello", etc.)
    await msg.reply(getMenu());
});

client.initialize();

module.exports = {
    getQR: () => qrCodeDataURL,
    isReady: () => isClientReady,
    getInfo: () => clientUserInfo
};
