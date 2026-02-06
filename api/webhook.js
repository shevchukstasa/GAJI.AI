// Wablas WhatsApp Webhook Handler for Gaji.AI
// This serverless function receives WhatsApp messages and responds with salary calculations

// ===================================================================
// SECURITY: API keys should be configured in Vercel Environment Variables
// Go to Vercel Dashboard → Settings → Environment Variables
// ===================================================================
const WABLAS_TOKEN = process.env.WABLAS_TOKEN || 'OlWT0Ks8uPKEOazqVThdEFAd6Zp0S3kcNIco9lFO6ZUDPkKQ862nES2';
const WABLAS_API = process.env.WABLAS_API || 'https://sby.wablas.com/api/send-message';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ofnsqxyoqjgwuzzpgewx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_HD2TfdfOhKFtuN1Kyt6guQ_rG-FTwcr';
const FREE_LIMIT = parseInt(process.env.FREE_LIMIT) || 10;

// Deepgram configuration for audio transcription (preferred - faster and cheaper)
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '958279e4160c7e0d8e97e696aff4a78ef9029337';
// OpenAI Whisper as fallback
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===================================================================
// AUDIO TRANSCRIPTION (Deepgram primary, OpenAI Whisper fallback)
// ===================================================================

async function transcribeWithDeepgram(audioUrl) {
    try {
        console.log('Transcribing with Deepgram:', audioUrl);

        const response = await fetch('https://api.deepgram.com/v1/listen?language=id&model=nova-2&smart_format=true', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: audioUrl })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Deepgram API error: ${error}`);
        }

        const result = await response.json();
        const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        console.log('Deepgram transcription:', transcript);
        return transcript || null;

    } catch (error) {
        console.error('Deepgram transcription error:', error);
        return null;
    }
}

async function transcribeWithWhisper(audioUrl) {
    try {
        // Download audio file from Wablas URL
        console.log('Downloading audio for Whisper:', audioUrl);
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.status}`);
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });

        // Create form data for Whisper API
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.ogg');
        formData.append('model', 'whisper-1');
        formData.append('language', 'id'); // Indonesian

        // Send to OpenAI Whisper API
        console.log('Sending to Whisper API...');
        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!whisperResponse.ok) {
            const error = await whisperResponse.text();
            throw new Error(`Whisper API error: ${error}`);
        }

        const result = await whisperResponse.json();
        console.log('Whisper transcription:', result.text);
        return result.text;

    } catch (error) {
        console.error('Whisper transcription error:', error);
        return null;
    }
}

async function transcribeAudio(audioUrl) {
    // Try Deepgram first (faster and cheaper)
    if (DEEPGRAM_API_KEY) {
        const deepgramResult = await transcribeWithDeepgram(audioUrl);
        if (deepgramResult) return deepgramResult;
        console.log('Deepgram failed, trying Whisper fallback...');
    }

    // Fallback to OpenAI Whisper
    if (OPENAI_API_KEY) {
        return await transcribeWithWhisper(audioUrl);
    }

    console.error('No transcription API key configured (DEEPGRAM_API_KEY or OPENAI_API_KEY)');
    return null;
}

// ===================================================================
// SUPABASE USAGE TRACKING
// ===================================================================

async function checkUsageLimit(phoneNumber) {
    try {
        // Check if phone number exists
        const checkUrl = `${SUPABASE_URL}/rest/v1/usage_tracking?phone_number=eq.${encodeURIComponent(phoneNumber)}&select=*`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        const records = await checkResponse.json();

        if (records && records.length > 0) {
            const record = records[0];
            if (record.calc_count >= FREE_LIMIT) {
                return { allowed: false, count: record.calc_count };
            }
            return { allowed: true, count: record.calc_count, existing: true, id: record.id };
        }

        return { allowed: true, count: 0, existing: false };
    } catch (error) {
        console.error('Supabase check error:', error);
        // On error, allow the calculation (fail open)
        return { allowed: true, count: 0, error: true };
    }
}

async function incrementUsage(phoneNumber, existing, recordId, currentCount) {
    try {
        if (existing) {
            // Update existing record - increment count
            const updateUrl = `${SUPABASE_URL}/rest/v1/usage_tracking?id=eq.${recordId}`;
            await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    calc_count: currentCount + 1,
                    last_calc: new Date().toISOString()
                })
            });
        } else {
            // Insert new record
            const insertUrl = `${SUPABASE_URL}/rest/v1/usage_tracking`;
            await fetch(insertUrl, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    calc_count: 1
                })
            });
        }
    } catch (error) {
        console.error('Supabase increment error:', error);
    }
}

function formatLimitReached(count) {
    return `*Batas Gratis Tercapai* ⚠️

Anda telah menggunakan ${count}/${FREE_LIMIT} perhitungan gratis.

*Untuk melanjutkan, silakan upgrade ke:*

💼 *Paket Pro* - Rp 99.000/bulan
• Unlimited perhitungan
• Slip gaji PDF
• Prioritas support

📱 *Cara upgrade:*
Hubungi: +62 877 7674 0102
Atau kunjungi: gaji.ai/pricing

Terima kasih telah menggunakan Gaji.AI! 🙏`;
}

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
        position: '',
        baseSalary: 0,
        region: 'jakarta',
        regionLabel: 'DKI Jakarta',
        ptkp: 'TK/0',
        overtime: 0,
        hasNPWP: false
    };

    // Extract name (multiple patterns)
    const namePatterns = [
        /(?:untuk|nama|name|karyawan|employee)\s+([A-Za-z][A-Za-z]+)/i,
        /^([A-Za-z][A-Za-z]+)(?:\s*,|\s+gaji|\s+salary|\s+dari|\s+lokasi)/i,
        /^([A-Za-z][A-Za-z]+)/i
    ];
    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1] && !['halo', 'hai', 'hi', 'hello', 'saya', 'mau', 'tolong', 'please', 'gaji', 'salary'].includes(match[1].toLowerCase())) {
            data.name = match[1];
            break;
        }
    }

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

    // Try plain number if no unit-based salary found (e.g., "gaji 8500000" or just "8500000")
    if (!data.baseSalary) {
        const plainSalaryPatterns = [
            /(?:gaji|salary|gajipokok)\s*(?:pokok\s*)?(\d{6,})/i,
            /\b(\d{6,})\b/
        ];
        for (const pattern of plainSalaryPatterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = parseInt(match[1]);
                if (amount >= 100000 && amount <= 1000000000) {
                    data.baseSalary = amount;
                    break;
                }
            }
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

    // Position detection
    const positionKeywords = {
        'c-level': 'c_level', 'ceo': 'c_level', 'cfo': 'c_level', 'cto': 'c_level', 'coo': 'c_level',
        'direktur': 'director', 'director': 'director',
        'vice president': 'vp', 'vp': 'vp',
        'senior manager': 'senior_manager',
        'manager': 'manager', 'manajer': 'manager',
        'supervisor': 'supervisor', 'spv': 'supervisor',
        'staff': 'staff', 'staf': 'staff',
        'magang': 'intern', 'intern': 'intern',
        'kontrak': 'contract', 'contract': 'contract', 'outsource': 'contract',
        'freelance': 'freelance', 'freelancer': 'freelance'
    };
    for (const [keyword, position] of Object.entries(positionKeywords)) {
        if (textLower.includes(keyword)) {
            data.position = position;
            break;
        }
    }

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

    // Create PDF slip link with encoded data
    const slipData = {
        n: data.name || 'Karyawan',
        s: data.baseSalary,
        r: data.regionLabel,
        p: data.ptkp,
        o: data.overtime || 0,
        np: data.hasNPWP ? 1 : 0,
        g: calc.gross,
        t: calc.pph21,
        bk: calc.bpjs.empKesehatan,
        bj: calc.bpjs.empJHT,
        bp: calc.bpjs.empJP,
        td: calc.totalDeductions,
        net: calc.net,
        cc: calc.companyCost,
        ot: calc.overtime.total
    };
    const encodedData = Buffer.from(JSON.stringify(slipData)).toString('base64');
    const pdfLink = `https://gaji-ai-beta.vercel.app/?slip=${encodedData}`;

    let msg = `*✅ GAJI.AI - Hasil Perhitungan*\n\n`;
    msg += `👤 Nama: ${data.name || 'Karyawan'}\n`;
    msg += `📍 Lokasi: ${data.regionLabel}\n`;
    msg += `💰 Gaji Pokok: ${formatIDR(data.baseSalary)}\n`;

    if (data.overtime > 0) {
        msg += `⏰ Lembur: ${data.overtime} jam (+${formatIDR(calc.overtime.total)})\n`;
    }

    msg += `📋 PTKP: ${data.ptkp} (TER ${terCat}, ${(terRate * 100).toFixed(2)}%)\n`;
    msg += `🆔 NPWP: ${data.hasNPWP ? 'Ada' : 'Tidak ada (+20%)'}\n\n`;

    msg += `*📉 POTONGAN:*\n`;
    msg += `• PPh 21: ${formatIDR(calc.pph21)}\n`;
    msg += `• BPJS Kes (1%): ${formatIDR(calc.bpjs.empKesehatan)}\n`;
    msg += `• BPJS JHT (2%): ${formatIDR(calc.bpjs.empJHT)}\n`;
    msg += `• BPJS JP (1%): ${formatIDR(calc.bpjs.empJP)}\n`;
    msg += `• Total Potongan: ${formatIDR(calc.totalDeductions)}\n\n`;

    msg += `*💵 HASIL:*\n`;
    msg += `Gross: ${formatIDR(calc.gross)}\n`;
    msg += `*🎯 Take-Home Pay: ${formatIDR(calc.net)}*\n\n`;

    msg += `🏢 Biaya Perusahaan: ${formatIDR(calc.companyCost)}\n\n`;

    msg += `📄 *SLIP GAJI PDF:*\n`;
    msg += `${pdfLink}\n\n`;

    msg += `---\n`;
    msg += `Hitung lagi? Kirim data gaji baru.\n`;
    msg += `Web: gaji.ai`;

    return msg;
}

function formatWelcome() {
    return `*🎉 Selamat datang di GAJI.AI!*

Hitung gaji karyawan Indonesia *GRATIS* dalam hitungan detik! 🚀

*📝 Cara pakai:*
Balas pesan ini dengan data gaji, contoh:
_"Budi, gaji 8 juta, Jakarta, lembur 20 jam, ada NPWP"_

*✨ Yang saya hitung otomatis:*
✓ PPh 21 TER 2024 (terbaru!)
✓ BPJS Kesehatan & Ketenagakerjaan
✓ Lembur (rumus resmi 1/173)
✓ Take-Home Pay & Biaya Perusahaan
✓ *BONUS: Slip Gaji PDF!* 📄

*🎁 10 perhitungan GRATIS!*

Kirim data gaji Anda sekarang 👇`;
}

function formatError(data) {
    let msg = `⚠️ *Data Gaji Tidak Terdeteksi*\n\n`;

    // Show what was detected
    let detectedItems = [];
    if (data && data.name) detectedItems.push(`✓ Nama: ${data.name}`);
    if (data && data.regionLabel && data.region !== 'default') detectedItems.push(`✓ Lokasi: ${data.regionLabel}`);
    if (data && data.hasNPWP) detectedItems.push(`✓ NPWP: Ada`);
    if (data && data.ptkp && data.ptkp !== 'TK/0') detectedItems.push(`✓ PTKP: ${data.ptkp}`);
    if (data && data.overtime > 0) detectedItems.push(`✓ Lembur: ${data.overtime} jam`);

    if (detectedItems.length > 0) {
        msg += `*Yang terdeteksi:*\n`;
        msg += detectedItems.join('\n') + '\n\n';
    }

    msg += `*❌ Yang kurang:*\n`;
    msg += `• Nominal gaji (wajib)\n\n`;

    msg += `*📝 Cara tulis gaji:*\n`;
    msg += `• "8 juta" atau "8 jt"\n`;
    msg += `• "5.5 juta" atau "5,5 jt"\n`;
    msg += `• "3500000" (angka penuh)\n\n`;

    msg += `*Contoh lengkap:*\n`;
    if (data && data.name) {
        msg += `"${data.name}, gaji 8 jt${data.regionLabel && data.region !== 'default' ? ', ' + data.regionLabel : ''}${data.hasNPWP ? ', NPWP' : ''}"`;
    } else {
        msg += `"Budi, gaji 8 jt, Jakarta, NPWP"`;
    }

    return msg;
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
            const { phone, message, pushName, messageType, file, media, isMedia } = req.body;

            console.log('Incoming message:', { phone, message, pushName, messageType, isMedia });

            if (!phone) {
                return res.status(400).json({ error: 'Missing phone' });
            }

            // Check for audio/voice message
            if (messageType === 'audio' || messageType === 'ptt') {
                const audioUrl = file || media;

                if (!audioUrl) {
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(200).send(
                        `🎤 *Pesan Suara Terdeteksi*\n\n` +
                        `Maaf, tidak dapat mengakses file audio.\n\n` +
                        `*Mohon kirim dalam format teks*, contoh:\n` +
                        `"Budi, gaji 8 juta, Jakarta, lembur 10 jam, ada NPWP"`
                    );
                }

                // Try to transcribe the audio
                const transcribedText = await transcribeAudio(audioUrl);

                if (!transcribedText) {
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(200).send(
                        `🎤 *Pesan Suara Terdeteksi*\n\n` +
                        `Maaf, gagal memproses pesan suara Anda.\n\n` +
                        `*Mohon kirim dalam format teks*, contoh:\n` +
                        `"Budi, gaji 8 juta, Jakarta, lembur 10 jam, ada NPWP"`
                    );
                }

                // Process the transcribed text as normal message
                console.log('Processing transcribed text:', transcribedText);

                // Parse the transcribed message
                const data = parseMessage(transcribedText);

                // Check if we have valid salary data
                if (!data.baseSalary || data.baseSalary < 100000) {
                    res.setHeader('Content-Type', 'text/plain');
                    let response = `🎤 *Pesan Suara Diterima*\n\n`;
                    response += `📝 Saya dengar: "${transcribedText}"\n\n`;
                    response += formatError(data);
                    return res.status(200).send(response);
                }

                // Check usage limit before calculating
                const usage = await checkUsageLimit(phone);
                if (!usage.allowed) {
                    res.setHeader('Content-Type', 'text/plain');
                    return res.status(200).send(formatLimitReached(usage.count));
                }

                // Calculate payroll
                const calc = calculatePayroll(data);

                // Increment usage counter
                await incrementUsage(phone, usage.existing, usage.id, usage.count);

                // Format and return response
                let response = `🎤 *Pesan Suara Diterima*\n\n`;
                response += `📝 Saya dengar: "${transcribedText}"\n\n`;
                response += formatResponse(data, calc);
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(response);
            }

            if (!message) {
                return res.status(400).json({ error: 'Missing message' });
            }

            // Check for greeting or help
            const msgLower = message.toLowerCase().trim();
            if (['halo', 'hai', 'hi', 'hello', 'help', 'bantuan', 'mulai', 'start'].includes(msgLower)) {
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(formatWelcome());
            }

            // Parse the message
            const data = parseMessage(message);

            // Check if we have valid salary data
            if (!data.baseSalary || data.baseSalary < 100000) {
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(formatError(data));
            }

            // Check usage limit before calculating
            const usage = await checkUsageLimit(phone);
            if (!usage.allowed) {
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(formatLimitReached(usage.count));
            }

            // Calculate payroll
            const calc = calculatePayroll(data);

            // Increment usage counter
            await incrementUsage(phone, usage.existing, usage.id, usage.count);

            // Format and return response as plain text for Wablas auto-reply
            const response = formatResponse(data, calc);
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(response);

        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
