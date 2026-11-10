const axios = require('axios');

const ACCESS_TOKEN = 'EAA6BGB8gky0BSwgaZBIvJ2EK1MCWTrm4aYzGSJZAvA4m9GYmiDDWvtxXdmeR3ttwnRJTSZBkY4RwnETtN9ttPCzgKZB4NPvvpfRhXzbR62tfWDJbgoNpZBiotBvlUgM988puGE0mgchi8yDNnfbDqq5mxxlvesx8m5gUy7cFBjPOmr4A2slFSnxNshWbM47JLW90w8yUZARyEcwosu9oG7ppXaY1QuiMHFU99b88Aq3bxK6YrAQLwFdZCHtBSnRdwjG0DuZBK3MtZARMZBe5ZBnoakR83Jw1nHXW6yr6GZCLBHrd';
const PHONE_NUMBER_ID = '1501745066346540';
const TO_NUMBER = '919669856729';

async function sendInteractiveButtons() {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        to: TO_NUMBER,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: {
                type: 'text',
                text: 'Business Support AI'
            },
            body: {
                text: 'Namaste! 🙏 Hamari company me aapka swagat hai.\n\nKripya neeche diye gaye option par tap karein:'
            },
            footer: {
                text: '1-Click Quick Reply'
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: 'btn_services',
                            title: '💡 Services & Rates'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 'btn_reviews',
                            title: '⭐ Client Reviews'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 'btn_book',
                            title: '📞 Book Appointment'
                        }
                    }
                ]
            }
        }
    };

    try {
        const res = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Meta Interactive Buttons Sent Successfully!', res.data);
    } catch (err) {
        console.error('❌ Error sending Meta Buttons:', err.response ? err.response.data : err.message);
    }
}

sendInteractiveButtons();
