# .cursorrules — Gaji.AI Development Rules

## 1. Project Parameters
- **Type**: Single-page HTML application (SPA) with optional multi-file structure
- **Stack**: HTML5, CSS3, Vanilla JavaScript. No frameworks.
- **Data**: LocalStorage for free tier, Supabase for paid tiers
- **UI Language**: Bahasa Indonesia (primary), English (secondary)
- **Legal Terms**: Indonesian (PPh 21, BPJS, THR, Lembur, NPWP, PTKP)

## 2. Data Architecture

### LocalStorage Keys
- `gaji_employees` — Employee records
- `gaji_payroll_history` — Calculation history
- `gaji_settings` — App settings
- `gaji_calc_count` — Free tier usage counter

### Employee Object Structure
```javascript
{
  id: number,
  name: string,
  salary: number,
  schedule: 5 | 6,
  payday: "25" | "last",
  startDate: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD" | null,
  position: string,
  nik: string, // 16 digits
  ptkpStatus: "TK/0" | "K/0" | "K/1" | "K/2" | "K/3",
  hasNPWP: boolean,
  religion: "islam" | "christian" | "catholic" | "hindu" | "buddhist" | "confucian",
  region: string,
  transportAllowance: number,
  foodAllowance: number,
  housingAllowance: number,
  pph21Employer: boolean,
  bpjsHealthPayer: "employer" | "employee" | "own",
  bpjsJHTPayer: "employer" | "employee" | "own",
  bpjsJPPayer: "employer" | "employee" | "own",
  active: boolean
}
```

## 3. Compliance Engine (Mandatory Rules)

### PPh 21
- TER (Tarif Efektif Rata-rata) since January 1, 2024
- Three categories: A (TK/0, TK/1, K/0), B (TK/2, TK/3, K/1, K/2), C (K/3)
- No NPWP → tax increases by 20%

### BPJS
- Kesehatan: 1% employee / 4% employer (cap: 12,000,000 IDR)
- JHT: 2% employee / 3.7% employer
- JP: 1% employee / 2% employer (cap: 10,547,400 IDR)
- JKK: 0.24%-1.74% employer only (risk class)
- JKM: 0.3% employer only

### Lembur (Overtime)
- Divisor: 1/173
- 1st hour: 1.5x
- 2nd+ hours: 2.0x
- Max: 4 hours/day, 18 hours/week

### THR
- >= 12 months: 1 full salary
- < 12 months: proportional (months/12 x salary)

## 4. Design System

### Colors
```css
:root {
  --color-primary: #10b981;
  --color-primary-hover: #059669;
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Typography
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Base size: 14px, line-height: 1.6

## 5. UI Structure

### Landing Page (index.html)
1. Hero section with value proposition
2. Free calculator (chat-based, natural language)
3. Pricing tiers (4 tiers)
4. Features grid
5. Footer

### App (Paid Tiers)
1. Dashboard — Statistics, THR reminders
2. Employees — CRUD table
3. Payroll — Calculation with Harmony Toggle
4. Holidays — Calendar with API integration
5. Export — PDF, CSV, Telegram JSON, Backup

## 6. Killer Features
- **Harmony Toggle**: Standard calc vs optimized salary structure
- **Architect Logic**: Reverse engineer timesheet from desired net salary
- **Natural Language**: Parse free-text input for salary calculations
- **PDF Slip Gaji**: Professional payslip generation

## 7. Pricing Tiers
1. **Sobat Gaji** — 5 free calcs, then Rp 3,000/calc (WhatsApp + Web)
2. **Gaji Pro** — Rp 150,000/month (Web dashboard, certificates)
3. **Harmony** — Rp 300,000/month (Tax optimization, gross-up)
4. **Architect** — Rp 500,000/month (Full HRIS, reverse engineering)
