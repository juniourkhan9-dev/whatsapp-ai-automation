const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { generateAppointmentPDF } = require('./pdfGenerator');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Storage directory for generated PDFs
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// In-memory Appointments Database & Calendar Slots
let appointments = [];
let bookedSlots = [
    { date: '2026-11-10', time: '11:00 AM' }, // Demo pre-booked slot
    { date: '2026-11-10', time: '03:00 PM' }
];

// Pre-defined Reviews & Links
const REVIEW_LINKS = [
    { title: 'Google Business Reviews (4.9 ★ Rating - 180+ Reviews)', url: 'https://maps.google.com/?cid=12345678' },
    { title: 'Client Video Testimonials & Case Studies', url: 'https://youtube.com/watch?v=sample-client-review' },
    { title: 'Verified Trustpilot Ratings & Badges', url: 'https://trustpilot.com/review/example-business' }
];

// Knowledge base for FAQs
function getAiChatResponse(message) {
    const text = message.toLowerCase().trim();

    if (text.includes('review') || text.includes('feedback') || text.includes('proof') || text.includes('client work') || text.includes('rating')) {
        let reply = "Bilkul! Yahan hamare previous clients ke reviews aur work samples hain:\n\n";
        REVIEW_LINKS.forEach((rev, idx) => {
            reply += `${idx + 1}. [${rev.title}](${rev.url})\n`;
        });
        reply += "\nAap inko check kar sakte hain. Kya aap humare expert ke saath ek appointment/call schedule karna chahte hain?";
        return { reply, triggerCall: false, reviews: REVIEW_LINKS };
    }

    if (text.includes('service') || text.includes('kya karte ho') || text.includes('features') || text.includes('kaam')) {
        return {
            reply: "Hum business ke liye complete WhatsApp Automation, AI Voice Calling Agents, aur Automated CRM setup karte hain. Isse aapke 90% client queries auto-resolve ho jate hain aur bookings automate ho jati hain!\n\nKya aapko iska live call demo dekhna hai ya booking karni hai?",
            triggerCall: false
        };
    }

    if (text.includes('price') || text.includes('cost') || text.includes('charges') || text.includes('kitna') || text.includes('kharcha')) {
        return {
            reply: "Pricing aapke requirement aur call volume par depend karti hai:\n• One-time Setup: ₹25,000 - ₹50,000\n• Running Maintenance: ₹3,000 - ₹5,000/month\n\nEk quick confirmation call schedule karein taaki hum aapke business ke hisaab se exact quotation de sakein?",
            triggerCall: false
        };
    }

    if (text.includes('book') || text.includes('yes') || text.includes('haan') || text.includes('appointment') || text.includes('confirm') || text.includes('call') || text.includes('schedule') || text.includes('demo')) {
        return {
            reply: "Bahut badhiya! 🎉 Main aapki booking initiate kar raha hoon. Hamara Automated Voice Assistant aapko abhi live call karke Date, Time aur Address confirm karega...",
            triggerCall: true
        };
    }

    return {
        reply: "Namaste! Main Business Assistant hoon. Main aapki kya madad kar sakta hoon? Aap mujhse services, pricing, client reviews maang sakte hain ya direct appointment call book kar sakte hain.",
        triggerCall: false
    };
}

// 1. WhatsApp Chat API
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    const response = getAiChatResponse(message || '');
    res.json(response);
});

// 2. Check Calendar Availability
app.post('/api/check-slot', (req, res) => {
    const { date, time } = req.body;
    const isBusy = bookedSlots.some(slot => slot.date === date && slot.time.toLowerCase() === time.toLowerCase());
    if (isBusy) {
        return res.json({ available: false, message: `Maaf kijiye, ${time} par slot pehle se booked hai. Kripya doosra time chunein jaise 12:00 PM ya 04:00 PM.` });
    }
    res.json({ available: true, message: `Great! ${date} ko ${time} ka slot bilkul free hai.` });
});

// 3. Confirm Booking & Generate PDF
app.post('/api/book-appointment', async (req, res) => {
    try {
        const { name, phone, date, time, address, requirement } = req.body;

        // Add to booked slots
        bookedSlots.push({ date, time });

        const timestamp = Date.now();
        const fileName = `Appointment_${name.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        const filePath = path.join(storageDir, fileName);

        const bookingId = await generateAppointmentPDF({
            name,
            phone: phone || '+91 98765 43210',
            date,
            time,
            address: address || 'Office / Online Google Meet',
            requirement: requirement || 'WhatsApp & AI Voice Automation Demo Inquiry'
        }, filePath);

        const appointmentRecord = {
            bookingId,
            name,
            phone: phone || '+91 98765 43210',
            date,
            time,
            address,
            requirement,
            pdfUrl: `/storage/${fileName}`,
            createdAt: new Date().toISOString()
        };

        appointments.push(appointmentRecord);

        res.json({
            success: true,
            bookingId,
            message: `Appointment confirmed for ${name}!`,
            pdfUrl: `/storage/${fileName}`,
            appointment: appointmentRecord
        });
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({ success: false, error: 'Could not generate appointment PDF' });
    }
});

// 4. Get all appointments (Admin CRM View)
app.get('/api/appointments', (req, res) => {
    res.json(appointments);
});

server.listen(PORT, () => {
    console.log(`WhatsApp AI Automation Simulator running at http://localhost:${PORT}`);
});
