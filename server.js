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

// Permanent Credentials
const ACCESS_TOKEN = 'EAA6BGB8gky0BSwgaZBIvJ2EK1MCWTrm4aYzGSJZAvA4m9GYmiDDWvtxXdmeR3ttwnRJTSZBkY4RwnETtN9ttPCzgKZB4NPvvpfRhXzbR62tfWDJbgoNpZBiotBvlUgM988puGE0mgchi8yDNnfbDqq5mxxlvesx8m5gUy7cFBjPOmr4A2slFSnxNshWbM47JLW90w8yUZARyEcwosu9oG7ppXaY1QuiMHFU99b88Aq3bxK6YrAQLwFdZCHtBSnRdwjG0DuZBK3MtZARMZBe5ZBnoakR83Jw1nHXW6yr6GZCLBHrd';
const PHONE_NUMBER_ID = '1501745066346540';
const VERIFY_TOKEN = 'my_secret_token_123';

// 1. Meta Webhook Verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ META WEBHOOK VERIFIED!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Helper: Send Meta Interactive Buttons
async function sendMetaButtons(toPhone) {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    const payload = {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: { type: 'text', text: 'Business AI Assistant' },
            body: { text: 'Namaste! 🙏 Hamari company me aapka swagat hai.\n\nKripya neeche diye gaye option par tap karein:' },
            footer: { text: '1-Click Quick Reply' },
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
        console.log(`✅ Buttons sent to ${toPhone}`);
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
    if (body.object && body.entry) {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                const value = change.value;
                if (value.messages && value.messages.length > 0) {
                    const message = value.messages[0];
                    const from = message.from;

                    console.log(`📩 Incoming message from ${from}: Type=${message.type}`);

                    // Button Click Handler
                    if (message.type === 'interactive' && message.interactive.button_reply) {
                        const buttonId = message.interactive.button_reply.id;

                        if (buttonId === 'btn_services') {
                            await sendMetaText(from, "💡 *Hamari Premium Services:*\n1. WhatsApp Business AI Automation\n2. Real AI Voice Calling Agent\n3. Calendar & Instant PDF Booking Slips\n\nAppointment book karne ke liye 'Book Appointment' button tap karein!");
                        } else if (buttonId === 'btn_reviews') {
                            await sendMetaText(from, "⭐ *Client Reviews & Proof:*\n1. Google Business (4.9 ★): https://maps.google.com/?cid=123456\n2. Video Reviews: https://youtube.com/watch?v=sample\n\nAap inko check kar sakte hain!");
                        } else if (buttonId === 'btn_book') {
                            await sendMetaText(from, "🎉 *Bahut Badhiya!*\n\nAapka appointment book ho gaya hai! Hamara AI Call Agent aapse turant connect karega aur confirmation details verify karega.\n\nAapki Confirmation Slip tayar ki ja rahi hai...");
                        }
                    } else if (message.type === 'text') {
                        // User typed text (e.g. "Hi") -> Automatically Send the 3 Interactive Buttons!
                        await sendMetaButtons(from);
                    }
                }
            }
        }
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
