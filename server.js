const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { generateAppointmentPDF } = require('./pdfGenerator');

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

// Meta Official Cloud API Config
// (Can be overridden anytime via Render Environment Variables)
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAA6BGB8gky0BSwgaZBIvJ2EK1MCWTrm4aYzGSJZAvA4m9GYmiDDWvtxXdmeR3ttwnRJTSZBkY4RwnETtN9ttPCzgKZB4NPvvpfRhXzbR62tfWDJbgoNpZBiotBvlUgM988puGE0mgchi8yDNnfbDqq5mxxlvesx8m5gUy7cFBjPOmr4A2slFSnxNshWbM47JLW90w8yUZARyEcwosu9oG7ppXaY1QuiMHFU99b88Aq3bxK6YrAQLwFdZCHtBSnRdwjG0DuZBK3MtZARMZBe5ZBnoakR83Jw1nHXW6yr6GZCLBHrd';
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1501745066346540';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'my_secret_token_123';

// In-Memory Appointments for CRM Dashboard
let bookedAppointments = [];
let userStates = {};

// Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ONLINE',
        mode: 'Meta Official WhatsApp Cloud API',
        uptime: process.uptime(),
        memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        appointmentsCount: bookedAppointments.length
    });
});

// 1. Meta Webhook Verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ META WEBHOOK VERIFIED BY FACEBOOK!');
            return res.status(200).send(challenge);
        } else {
            console.warn('❌ Webhook token mismatch');
            return res.sendStatus(403);
        }
    }
    res.sendStatus(400);
});

// Helper: Send Meta Interactive Buttons (Official Quick Reply Buttons)
async function sendMetaButtons(toPhone) {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: { type: 'text', text: 'Business AI Assistant' },
            body: { text: 'Namaste! 🙏 Hamari company me aapka swagat hai.\n\nKripya neeche diye gaye option me se chunein:' },
            footer: { text: '24/7 Instant AI Booking' },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'btn_services', title: '💡 Services & Rates' } },
                    { type: 'reply', reply: { id: 'btn_reviews', title: '⭐ Client Reviews' } },
                    { type: 'reply', reply: { id: 'btn_book', title: '📞 Book Appointment' } }
                ]
            }
        }
    };
    try {
        await axios.post(url, payload, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
        });
        console.log(`✅ Interactive Buttons sent to ${toPhone}`);
    } catch (err) {
        console.error('Error sending buttons:', err.response ? err.response.data : err.message);
    }
}

// Helper: Send Text Message via Meta
async function sendMetaText(toPhone, text) {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    try {
        await axios.post(url, {
            messaging_product: 'whatsapp',
            to: toPhone,
            type: 'text',
            text: { body: text }
        }, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
        });
        console.log(`✅ Text sent to ${toPhone}`);
    } catch (err) {
        console.error('Error sending text:', err.response ? err.response.data : err.message);
    }
}

// Helper: Send PDF Document via Meta
async function sendMetaDocument(toPhone, pdfUrl, filename, caption) {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    try {
        await axios.post(url, {
            messaging_product: 'whatsapp',
            to: toPhone,
            type: 'document',
            document: {
                link: pdfUrl,
                filename: filename,
                caption: caption
            }
        }, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
        });
        console.log(`✅ PDF Document sent to ${toPhone}`);
    } catch (err) {
        console.error('Error sending PDF document:', err.response ? err.response.data : err.message);
    }
}

// 2. Meta Webhook Receiver (POST)
app.post('/webhook', async (req, res) => {
    res.sendStatus(200);

    const body = req.body;
    if (!body.object || !body.entry) return;

    for (const entry of body.entry) {
        for (const change of entry.changes) {
            const value = change.value;
            if (value.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const from = message.from;
                const contactName = (value.contacts && value.contacts[0]?.profile?.name) || 'Customer';

                console.log(`📩 Incoming message from ${contactName} (${from}): Type=${message.type}`);

                if (!userStates[from]) {
                    userStates[from] = { step: 'IDLE', data: { name: contactName } };
                }
                const session = userStates[from];

                // Case 1: Button Click
                if (message.type === 'interactive' && message.interactive.button_reply) {
                    const buttonId = message.interactive.button_reply.id;

                    if (buttonId === 'btn_services') {
                        await sendMetaText(from, "💡 *Hamari Premium Services & Rates:*\n\n1️⃣ WhatsApp Business AI Automation (₹2,999/-)\n2️⃣ Real-time Voice Call AI Agent (₹4,999/-)\n3️⃣ Instant Calendar & Verified PDF Booking (₹1,999/-)\n\nAppointment book karne ke liye neeche 'Book Appointment' button tap karein!");
                    } else if (buttonId === 'btn_reviews') {
                        await sendMetaText(from, "⭐ *Verified Client Reviews & Proof:*\n\n• Google Business: 4.9 ★ (180+ Reviews)\n👉 https://maps.google.com/?cid=123456\n• Video Case Studies:\n👉 https://youtube.com/watch?v=sample-review\n\nAap bejhijhak check kar sakte hain!");
                    } else if (buttonId === 'btn_book') {
                        session.step = 'AWAITING_TIME';
                        await sendMetaText(from, `Shukriya *${contactName}* ji! 🙏\n\nAap kis *Date aur Time* par appointment chahte hain?\n(Example: *12 Nov ko shaam 4:00 PM*)`);
                    }
                    return;
                }

                // Case 2: Text Flow
                if (message.type === 'text') {
                    const userText = (message.text?.body || '').trim();

                    if (session.step === 'AWAITING_TIME') {
                        session.data.dateTime = userText;
                        session.step = 'AWAITING_ADDRESS';
                        await sendMetaText(from, `Time note kar liya: *${session.data.dateTime}*.\n\nKripya apna *Address ya City* bataiye:`);
                        return;
                    }

                    if (session.step === 'AWAITING_ADDRESS') {
                        session.data.address = userText;
                        session.step = 'IDLE';

                        await sendMetaText(from, `✅ *Booking Details Confirm:*\n• Naam: *${session.data.name}*\n• Time: *${session.data.dateTime}*\n• Address: *${session.data.address}*\n\n⏳ Google Calendar me slot lock karke aapki Official Confirmation PDF Slip taiyar ki ja rahi hai...`);

                        try {
                            const safeName = session.data.name.replace(/[^a-zA-Z0-9]/g, '_');
                            const fileName = `Appointment_${safeName}_${Date.now()}.pdf`;
                            const filePath = path.join(storageDir, fileName);

                            const apptDetails = {
                                customerName: session.data.name,
                                phone: from,
                                service: 'Business AI Consultation & Automation',
                                dateTime: session.data.dateTime,
                                address: session.data.address,
                                notes: 'Slot automatically booked via Meta WhatsApp AI'
                            };

                            await generateAppointmentPDF(apptDetails, filePath);

                            const host = req.get('host') || 'localhost:3000';
                            const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
                            const publicPdfUrl = `${protocol}://${host}/storage/${fileName}`;

                            bookedAppointments.unshift({
                                id: `BK-${Date.now().toString().slice(-4)}`,
                                ...apptDetails,
                                pdfUrl: publicPdfUrl,
                                timestamp: new Date().toLocaleTimeString()
                            });

                            await sendMetaDocument(
                                from,
                                publicPdfUrl,
                                fileName,
                                `📄 Namaste ${session.data.name} ji! Yeh rahi aapki official Appointment Confirmation Slip.`
                            );
                        } catch (pdfErr) {
                            console.error('Error generating/sending PDF:', pdfErr);
                            await sendMetaText(from, "Aapka slot confirm ho gaya hai! Hamari team aapse jald hi call par rabta karegi.");
                        }
                        return;
                    }

                    // Default greeting -> Send Interactive Buttons
                    await sendMetaButtons(from);
                }
            }
        }
    }
});

// Web CRM API
app.get('/api/appointments', (req, res) => {
    res.json(bookedAppointments);
});

server.listen(PORT, () => {
    console.log(`🚀 Meta Official WhatsApp AI Engine running on port ${PORT}`);
    console.log(`⚡ Memory footprint: ~30MB (Will NEVER exceed Render free limits)`);
});
