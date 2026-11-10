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

const ACCESS_TOKEN = 'EAA6BGB8gky0BS1fsIVPvMZA3wlatwLrhGwgnCPZAMI0b5ZAZBnfC7giOslQpV6RZCLZB8n5WadX2LuAKo1ke80p8GWKpqpNZAuAo5Br7hBpAFuYstDZA8WJ8eQ342e4o5BTw6W1vkZBJgRJMNj9qgqW5h1v4Mo3PX3uOMI38aQMFWWZALY5ZCfLyQ2rC0NG9ow0GFUyj9BM2aNgPizI7njsQgG9XoZCcL77gUJAlRGOLBG0ZBtYvxgy6g4SGzTpP4njc45C85RfjIWQl05JF3KNcZBFG7s1opzbFwcDlGHA9rp1wZDZD';
const PHONE_NUMBER_ID = '1501745066346540';
const VERIFY_TOKEN = 'my_secret_token_123';

// 1. Meta Webhook Verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ META WEBHOOK VERIFIED SUCCESSFULLY!');
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
            footer: { text: '1-Click Instant Reply' },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'btn_services', title: '💡 Services & Rates' } },
                    { type: 'reply', reply: { id: 'btn_reviews', title: '⭐ Client Reviews' } },
                    { type: 'reply', reply: { id: 'btn_book', title: '📞 Book Appointment' } }
                ]
            }
        }
    };
    await axios.post(url, payload, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
    });
}

// Helper: Send Text Message via Meta
async function sendMetaText(toPhone, text) {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
    await axios.post(url, {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: text }
    }, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
    });
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

                    // Button Click Detected
                    if (message.type === 'interactive' && message.interactive.button_reply) {
                        const buttonId = message.interactive.button_reply.id;

                        if (buttonId === 'btn_services') {
                            await sendMetaText(from, "💡 Hamari Services:\n• WhatsApp Business AI Automation\n• Auto Voice Call Agent\n• Google Calendar & Instant PDF Slip\n\nBooking ke liye 'Book' button tap karein!");
                        } else if (buttonId === 'btn_reviews') {
                            await sendMetaText(from, "⭐ Hamare Verified Client Reviews:\n1. Google Business (4.9 ★): https://maps.google.com/?cid=123456\n2. Video Proof: https://youtube.com/watch?v=sample\n\nAap inko check kar sakte hain!");
                        } else if (buttonId === 'btn_book') {
                            await sendMetaText(from, "Bahut badhiya! 🎉 Hamara Automated Call Assistant aapko 10 second me call karke appointment confirm karega aur PDF receipt bhej dega!");
                        }
                    } else if (message.type === 'text') {
                        // User typed text -> Send 3 Buttons!
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
