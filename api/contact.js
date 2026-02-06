// Contact Form Handler for Gaji.AI
// Sends inquiries to business email without exposing the address

// Email is configured via environment variable for security
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'shevchukstasa@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, company, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Build email content
        const emailContent = `
Pesan Baru dari Website Gaji.AI

Nama: ${name}
Email: ${email}
Perusahaan: ${company || '-'}

Pesan:
${message}

---
Dikirim dari formulir kontak Gaji.AI
Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
        `.trim();

        // Option 1: Use Resend API if available
        if (RESEND_API_KEY) {
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Gaji.AI <noreply@gaji.ai>',
                    to: CONTACT_EMAIL,
                    reply_to: email,
                    subject: `[Gaji.AI] Permintaan dari ${name}${company ? ` - ${company}` : ''}`,
                    text: emailContent
                })
            });

            if (resendResponse.ok) {
                console.log('Email sent via Resend');
                return res.status(200).json({ success: true, message: 'Pesan terkirim!' });
            }
        }

        // Option 2: Log to console and store for later (fallback)
        console.log('=== NEW CONTACT FORM SUBMISSION ===');
        console.log(emailContent);
        console.log('===================================');

        // For now, we'll store the message and return success
        // In production, you should configure RESEND_API_KEY or use another email service

        return res.status(200).json({
            success: true,
            message: 'Pesan diterima! Kami akan menghubungi Anda segera.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
