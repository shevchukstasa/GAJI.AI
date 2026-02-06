// Wablas WhatsApp Webhook Handler for Gaji.AI
// This serverless function receives WhatsApp messages and responds with salary calculations

const WABLAS_TOKEN = 'OlWT0Ks8uPKEOazqVThdEFAd6Zp0S3kcNIco9lFO6ZUDPkKQ862nES2';
const WABLAS_API = 'https://sby.wablas.com/api/send-message';

// ===================================================================
// TER RATES (PPh 21 - PP 58/2023, PMK 168/2023)
// ===================================================================
const TER_A = [
    { max: 5400000, rate: 0 }, { max: 5650000, rate: 0.0025 }, { max: 5950000, rate: 0.005 },
    { max: 6300000, rate: 0.0075 }, { max: 6750000, rate: 0.01 }, { max: 7500000, rate: 0.0125 },
    { max: 8550000, rate: 0.015 }, { max: 9650000, rate: 0.0175 }, { max: 10050000, rate: 0.02 },
    { max: 10350000, rate: 0.0225 }, { max: 10700000, rate: 0.025 }, { max: 11050000, rate: 0.0275 },
    { max: 11600000, rate: 0.03 }, { max: 12500000, rate: 0.0325 }, { max: 13750000, rate: 0.035 },
    { max: 15100000, rate: 0.0375 }, { max: 16950000, rate: 0.04 }, { max: 19750000, rate: 0.045 },
    { max: 24150000, rate: 0.05 }, { max: 26450000, rate: 0.06 }, { max: 28000000, rate: 0.07 },
    { max: 30050000, rate: 0.08 }, { max: 32400000, rate: 0.09 }, { max: 35400000, rate: 0.10 },
    { max: 39100000, rate: 0.11 }, { max: 43850000, rate: 0.12 }, { max: 47800000, rate: 0.13 },
    { max: 54250000, rate: 0.14 }, { max: 62200000, rate: 0.15 }, { max: 66700000, rate: 0.16 },
    { max: 73500000, rate: 0.17 }, { max: 85850000, rate: 0.18 }, { max: 110000000, rate: 0.19 },
    { max: 134000000, rate: 0.20 }, { max: 169000000, rate: 0.21 }, { max: 221000000, rate: 0.22 },
    { max: 390000000, rate: 0.23 }, { max: 463000000, rate: 0.24 }, { max: 561000000, rate: 0.25 },
    { max: 709000000, rate: 0.26 }, { max: 965000000, rate: 0.27 }, { max: 1419000000, rate: 0.28 },
    { max: Infinity, rate: 0.30 }
];

const TER_B = [
    { max: 6200000, rate: 0 }, { max: 6500000, rate: 0.0025 }, { max: 6850000, rate: 0.005 },
    { max: 7300000, rate: 0.0075 }, { max: 9200000, rate: 0.01 }, { max: 10750000, rate: 0.015 },
    { max: 11250000, rate: 0.02 }, { max: 11600000, rate: 0.025 }, { max: 12600000, rate: 0.03 },
    { max: 13600000, rate: 0.035 }, { max: 14950000, rate: 0.04 }, { max: 16400000, rate: 0.045 },
    { max: 18450000, rate: 0.05 }, { max: 21850000, rate: 0.06 }, { max: 26000000, rate: 0.07 },
    { max: 27700000, rate: 0.08 }, { max: 29350000, rate: 0.09 }, { max: 33950000, rate: 0.10 },
    { max: 37100000, rate: 0.11 }, { max: 41100000, rate: 0.12 }, { max: 45800000, rate: 0.13 },
    { max: 49500000, rate: 0.14 }, { max: 56300000, rate: 0.15 }, { max: 62200000, rate: 0.16 },
    { max: 68600000, rate: 0.17 }, { max: 77500000, rate: 0.18 }, { max: 89000000, rate: 0.19 },
    { max: 103000000, rate: 0.20 }, { max: 134000000, rate: 0.21 }, { max: 169000000, rate: 0.22 },
    { max: 221000000, rate: 0.23 }, { max: 390000000, rate: 0.24 }, { max: 463000000, rate: 0.25 },
    { max: 561000000, rate: 0.26 }, { max: 709000000, rate: 0.27 }, { max: 965000000, rate: 0.28 },
    { max: 1419000000, rate: 0.29 }, { max: Infinity, rate: 0.30 }
];

const TER_C = [
    { max: 6600000, rate: 0 }, { max: 6950000, rate: 0.0025 }, { max: 7350000, rate: 0.005 },
    { max: 7800000, rate: 0.0075 }, { max: 8850000, rate: 0.01 }, { max: 9800000, rate: 0.0125 },
    { max: 10950000, rate: 0.015 }, { max: 11200000, rate: 0.02 }, { max: 12050000, rate: 0.025 },
    { max: 12950000, rate: 0.03 }, { max: 14150000, rate: 0.035 }, { max: 15550000, rate: 0.04 },
    { max: 17050000, rate: 0.045 }, { max: 19500000, rate: 0.05 }, { max: 22700000, rate: 0.06 },
    { max: 26600000, rate: 0.07 }, { max: 28100000, rate: 0.08 }, { max: 30100000, rate: 0.09 },
    { max: 34300000, rate: 0.10 }, { max: 37900000, rate: 0.11 }, { max: 41900000, rate: 0.12 },
    { max: 46900000, rate: 0.13 }, { max: 51400000, rate: 0.14 }, { max: 58500000, rate: 0.15 },
    { max: 66700000, rate: 0.16 }, { max: 74500000, rate: 0.17 }, { max: 83200000, rate: 0.18 },
    { max: 95600000, rate: 0.19 }, { max: 110000000, rate: 0.20 }, { max: 134000000, rate: 0.21 },
    { max: 169000000, rate: 0.22 }, { max: 221000000, rate: 0.23 }, { max: 390000000, rate: 0.24 },
    { max: 463000000, rate: 0.25 }, { max: 561000000, rate: 0.26 }, { max: 709000000, rate: 0.27 },
    { max: 965000000, rate: 0.28 }, { max: 1419000000, rate: 0.29 }, { max: Infinity, rate: 0.30 }
];

const TER_TABLES = { A: TER_A, B: TER_B, C: TER_C };

const PTKP_TO_TER = {
    'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
    'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
    'K/3': 'C'
};

const BPJS = {
    kesehatan: { employee: 0.01, employer: 0.04, maxBase: 12000000 },
    jht: { employee: 0.02, employer: 0.037 },
    jp: { employee: 0.01, employer: 0.02, maxBase: 10547400 },
    jkk: 0.0054,
    jkm: 0.003
};

const UMP_DATABASE = {
    'aceh': { ump: 3413666, label: 'Aceh' },
    'medan': { ump: 2895587, label: 'Sumatera Utara' },
    'jakarta': { ump: 5396760, label: 'DKI Jakarta' },
    'bandung': { ump: 4209309, label: 'Kota Bandung' },
    'bekasi': { ump: 5343430, label: 'Kota Bekasi' },
    'surabaya': { ump: 4725479, label: 'Kota Surabaya' },
    'semarang': { ump: 3243969, label: 'Kota Semarang' },
    'yogyakarta': { ump: 2125898, label: 'DI Yogyakarta' },
    'bali': { ump: 2988000, label: 'Bali' },
    'makassar': { ump: 3460410, label: 'Sulawesi Selatan' },
    'default': { ump: 5396760, label: 'DKI Jakarta' }
};

// ===================================================================
// CALCULATION FUNCTIONS
// ===================================================================

function getTERRate(grossMonthly, ptkpStatus) {
    const category = PTKP_TO_TER[ptkpStatus] || 'A';
    const table = TER_TABLES[category];
    for (const bracket of table) {
        if (grossMonthly <= bracket.max) return bracket.rate;
    }
    return table[table.length - 1].rate;
}

function calcPPh21(grossMonthly, ptkpStatus, hasNPWP) {
    const rate = getTERRate(grossMonthly, ptkpStatus);
    let tax = Math.round(grossMonthly * rate);
    if (!hasNPWP) tax = Math.round(tax * 1.2);
    return tax;
}

function calcBPJS(baseSalary) {
    const basisKes = Math.min(baseSalary, BPJS.kesehatan.maxBase);
    const basisJP = Math.min(baseSalary, BPJS.jp.maxBase);
    return {
        empKesehatan: Math.round(basisKes * BPJS.kesehatan.employee),
        empJHT: Math.round(baseSalary * BPJS.jht.employee),
        empJP: Math.round(basisJP * BPJS.jp.employee),
        coKesehatan: Math.round(basisKes * BPJS.kesehatan.employer),
        coJHT: Math.round(baseSalary * BPJS.jht.employer),
        coJP: Math.round(basisJP * BPJS.jp.employer),
        coJKK: Math.round(baseSalary * BPJS.jkk),
        coJKM: Math.round(baseSalary * BPJS.jkm)
    };
}

function calcOvertime(baseSalary, hours) {
    if (!hours || hours <= 0) return { total: 0 };
    const hourlyRate = baseSalary / 173;
    const firstHour = Math.min(hours, 1) * hourlyRate * 1.5;
    const restHours = Math.max(0, hours - 1) * hourlyRate * 2.0;
    return { total: Math.round(firstHour + restHours) };
}

function calculatePayroll(data) {
    const ot = calcOvertime(data.baseSalary, data.overtime);
    const gross = data.baseSalary + ot.total;
    const bpjs = calcBPJS(data.baseSalary);
    const pph21 = calcPPh21(gross, data.ptkp, data.hasNPWP);
    const totalEmpDeductions = pph21 + bpjs.empKesehatan + bpjs.empJHT + bpjs.empJP;
    const net = gross - totalEmpDeductions;
    const companyCost = gross + bpjs.coKesehatan + bpjs.coJHT + bpjs.coJP + bpjs.coJKK + bpjs.coJKM;

    return { gross, pph21, bpjs, totalDeductions: totalEmpDeductions, net, companyCost, overtime: ot };
}

// ===================================================================
// NATURAL LANGUAGE PARSER
// ===================================================================

function parseMessage(text) {
    const data = {
        name: '',
        baseSalary: 0,
        region: 'jakarta',
        regionLabel: 'DKI Jakarta',
        ptkp: 'TK/0',
        overtime: 0,
        hasNPWP: false
    };

    // Extract name
    const nameMatch = text.match(/^([A-Za-z][A-Za-z]+)/i);
    if (nameMatch) data.name = nameMatch[1];

    // Extract salary
    const salaryPatterns = [
        /(?:gaji|salary|gajipokok)\s*(?:pokok\s*)?(\d+[\.,]?\d*)\s*(jt|juta|mio|million|m|ribu|rb|k)/i,
        /(\d+[\.,]?\d*)\s*(jt|juta|mio|million|m|ribu|rb|k)/i
    ];

    for (const pattern of salaryPatterns) {
        const match = text.match(pattern);
        if (match) {
            let amount = parseFloat(match[1].replace(',', '.'));
            const unit = match[2].toLowerCase();
            if (['jt', 'juta', 'mio', 'million', 'm'].includes(unit)) {
                data.baseSalary = amount * 1000000;
            } else if (['ribu', 'rb', 'k'].includes(unit)) {
                data.baseSalary = amount * 1000;
            }
            break;
        }
    }

    // Extract region
    const textLower = text.toLowerCase();
    const regions = Object.keys(UMP_DATABASE).sort((a, b) => b.length - a.length);
    for (const key of regions) {
        if (textLower.includes(key)) {
            data.region = key;
            data.regionLabel = UMP_DATABASE[key].label;
            break;
        }
    }

    // NPWP
    if (/npwp|ada\s*npwp|punya\s*npwp/i.test(text)) {
        data.hasNPWP = true;
    }

    // PTKP status
    if (/k\/3/i.test(text)) data.ptkp = 'K/3';
    else if (/k\/2/i.test(text)) data.ptkp = 'K/2';
    else if (/k\/1/i.test(text)) data.ptkp = 'K/1';
    else if (/k\/0/i.test(text)) data.ptkp = 'K/0';
    else if (/tk\/3/i.test(text)) data.ptkp = 'TK/3';
    else if (/tk\/2/i.test(text)) data.ptkp = 'TK/2';
    else if (/tk\/1/i.test(text)) data.ptkp = 'TK/1';

    // Overtime
    const otMatch = text.match(/(?:lembur|overtime|ot)\s*(\d+)\s*(?:jam|hours|h)?/i);
    if (otMatch) data.overtime = parseInt(otMatch[1]);

    return data;
}

function formatIDR(amount) {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

// ===================================================================
// RESPONSE FORMATTER
// ===================================================================

function formatResponse(data, calc) {
    const terCat = PTKP_TO_TER[data.ptkp] || 'A';
    const terRate = getTERRate(calc.gross, data.ptkp);

    let msg = `*GAJI.AI - Hasil Perhitungan*\n\n`;
    msg += `Nama: ${data.name || 'Karyawan'}\n`;
    msg += `Lokasi: ${data.regionLabel}\n`;
    msg += `Gaji Pokok: ${formatIDR(data.baseSalary)}\n`;

    if (data.overtime > 0) {
        msg += `Lembur: ${data.overtime} jam (+${formatIDR(calc.overtime.total)})\n`;
    }

    msg += `PTKP: ${data.ptkp} (TER ${terCat}, ${(terRate * 100).toFixed(2)}%)\n`;
    msg += `NPWP: ${data.hasNPWP ? 'Ada' : 'Tidak ada (+20%)'}\n\n`;

    msg += `*POTONGAN:*\n`;
    msg += `PPh 21: ${formatIDR(calc.pph21)}\n`;
    msg += `BPJS Kes (1%): ${formatIDR(calc.bpjs.empKesehatan)}\n`;
    msg += `BPJS JHT (2%): ${formatIDR(calc.bpjs.empJHT)}\n`;
    msg += `BPJS JP (1%): ${formatIDR(calc.bpjs.empJP)}\n`;
    msg += `Total Potongan: ${formatIDR(calc.totalDeductions)}\n\n`;

    msg += `*HASIL:*\n`;
    msg += `Gross: ${formatIDR(calc.gross)}\n`;
    msg += `*Take-Home Pay: ${formatIDR(calc.net)}*\n\n`;

    msg += `Biaya Perusahaan: ${formatIDR(calc.companyCost)}\n\n`;
    msg += `---\n`;
    msg += `Hitung lagi? Kirim data gaji.\n`;
    msg += `Contoh: "Budi, gaji 8 jt, Jakarta, lembur 10 jam, ada NPWP"\n\n`;
    msg += `Web: gaji.ai`;

    return msg;
}

function formatWelcome() {
    return `*Selamat datang di GAJI.AI!* 🇮🇩

Saya adalah asisten perhitungan gaji karyawan Indonesia.

*Cara pakai:*
Kirim data gaji dalam format bebas, contoh:
"Budi, gaji 8 juta, Jakarta, lembur 20 jam, ada NPWP"

*Yang saya hitung:*
✓ PPh 21 (TER 2024)
✓ BPJS Kesehatan & Ketenagakerjaan
✓ Lembur (1/173, 1.5x & 2x)
✓ Take-Home Pay

*Kirim data gaji Anda sekarang!*`;
}

function formatError() {
    return `Maaf, saya tidak mendeteksi data gaji.

*Mohon sertakan minimal:*
- Nominal gaji (contoh: "8 juta" atau "5.5 jt")

*Contoh lengkap:*
"Budi, gaji 8 jt, Jakarta, lembur 10 jam, NPWP"

*Opsional:*
- Nama karyawan
- Kota/Provinsi
- Jam lembur
- Status PTKP (TK/0, K/1, dll)
- Ada NPWP atau tidak`;
}

// ===================================================================
// WABLAS API
// ===================================================================

async function sendWhatsAppMessage(phone, message) {
    const url = `${WABLAS_API}?token=${WABLAS_TOKEN}&phone=${phone}&message=${encodeURIComponent(message)}`;

    try {
        const response = await fetch(url);
        const result = await response.json();
        console.log('Wablas response:', result);
        return result;
    } catch (error) {
        console.error('Wablas error:', error);
        throw error;
    }
}

// ===================================================================
// WEBHOOK HANDLER
// ===================================================================

export default async function handler(req, res) {
    // Handle GET request (for webhook verification)
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', message: 'Gaji.AI WhatsApp Webhook Active' });
    }

    // Handle POST request (incoming messages)
    if (req.method === 'POST') {
        try {
            const { phone, message, pushName } = req.body;

            console.log('Incoming message:', { phone, message, pushName });

            if (!phone || !message) {
                return res.status(400).json({ error: 'Missing phone or message' });
            }

            // Check for greeting or help
            const msgLower = message.toLowerCase().trim();
            if (['halo', 'hai', 'hi', 'hello', 'help', 'bantuan', 'mulai', 'start'].includes(msgLower)) {
                await sendWhatsAppMessage(phone, formatWelcome());
                return res.status(200).json({ status: 'welcome sent' });
            }

            // Parse the message
            const data = parseMessage(message);

            // Check if we have valid salary data
            if (!data.baseSalary || data.baseSalary < 100000) {
                await sendWhatsAppMessage(phone, formatError());
                return res.status(200).json({ status: 'error message sent' });
            }

            // Calculate payroll
            const calc = calculatePayroll(data);

            // Format and send response
            const response = formatResponse(data, calc);
            await sendWhatsAppMessage(phone, response);

            return res.status(200).json({ status: 'calculation sent', data, calc });

        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
