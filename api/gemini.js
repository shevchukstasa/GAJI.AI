// Gemini API Proxy - keeps API key secure on server
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Kamu adalah Gaji.AI, asisten payroll AI untuk bisnis Indonesia.

## TENTANG GAJI.AI
Gaji.AI adalah kalkulator gaji online untuk bisnis Indonesia. Fitur:
- PPh 21 TER 2024
- BPJS Kesehatan & Ketenagakerjaan
- Lembur (1/173)
- THR, Slip gaji PDF

## PPh 21 TER 2024
- Kategori A (TK/0, TK/1, K/0): 0% di bawah Rp 5.4jt
- Kategori B (TK/2, TK/3, K/1, K/2): 0% di bawah Rp 6.2jt
- Kategori C (K/3): 0% di bawah Rp 6.6jt
- Tanpa NPWP: +20%

## BPJS
- Kesehatan: 1% karyawan + 4% perusahaan
- JHT: 2% karyawan + 3.7% perusahaan
- JP: 1% karyawan + 2% perusahaan

Jawab singkat dalam Bahasa Indonesia.`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel' });
    }

    try {
        const { messages, context } = req.body;
        if (!messages) return res.status(400).json({ error: 'Missing messages' });

        const fullPrompt = context ? SYSTEM_PROMPT + '\n\nKonteks:\n' + context : SYSTEM_PROMPT;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages,
                    systemInstruction: { parts: [{ text: fullPrompt }] },
                    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Gemini error' });
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return res.status(200).json({ reply: reply || '' });

    } catch (error) {
        console.error('Gemini proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
