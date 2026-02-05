# Gaji.AI — Architecture Document

## 1. Product Overview

**Gaji.AI** is an AI-powered payroll calculation platform for the Indonesian SMB market (65M+ businesses).

### Two Products, One Engine
- **Gaji.AI Lite** — WhatsApp/Telegram conversational bot (Phase 2)
- **Gaji.AI Pro** — Web application with dashboard (Phase 1)

### Four Pricing Tiers
1. **Sobat Gaji** (Free → Pay-per-calc) — WhatsApp quick calc, 5 free, then Rp 3,000/calc
2. **Gaji Pro** (Rp 150,000/mo) — Web dashboard, regional selection, bank certificates
3. **Harmony** (Rp 300,000/mo) — Tax optimization, Gross-up, company-pays-all config
4. **Architect** (Rp 500,000/mo) — Full HRIS, reverse timesheet engineering, all employees

## 2. Technical Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Landing Page │  │ Calculator   │  │ Dashboard   │ │
│  │ (marketing) │  │ (free tier)  │  │ (paid tiers)│ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│         Static SPA — Vanilla JS + CSS                │
└──────────────────────┬───────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Compliance  │ │ Supabase │ │   Payment    │
│   Engine     │ │  (Auth,  │ │   Gateway    │
│ (Pure JS -   │ │   DB,    │ │  (Xendit)    │
│  client-side)│ │  Storage)│ │              │
└──────────────┘ └──────────┘ └──────────────┘
       │
       ▼
┌──────────────┐
│ PDF Generator│
│ (client-side │
│  jsPDF)      │
└──────────────┘
```

## 3. Compliance Engine — Core Calculation Logic

### 3.1 PPh 21 (Income Tax) — TER System 2024
- Based on PP 58/2023, effective January 1, 2024
- Three categories: A (TK/0, TK/1), B (TK/2, TK/3, K/0, K/1), C (K/2, K/3)
- Each category has ~20 income brackets with specific TER %
- Monthly: Apply TER % to gross income
- December: Reconcile using progressive rates (5%, 15%, 25%, 30%, 35%)
- No NPWP: +20% tax penalty

### 3.2 BPJS (Social Security)
#### Employee Deductions:
- BPJS Kesehatan: 1% (cap: Rp 12,000,000 base)
- JHT: 2%
- JP: 1% (cap: Rp 10,547,400 base for 2025)

#### Employer Contributions:
- BPJS Kesehatan: 4% (cap: Rp 12,000,000 base)
- JHT: 3.7%
- JP: 2% (cap: Rp 10,547,400 base)
- JKK: 0.24% - 1.74% (based on industry risk)
- JKM: 0.3%

### 3.3 Overtime (Lembur)
- Formula: 1/173 × monthly salary
- First hour: 1.5× rate
- Subsequent hours: 2.0× rate
- Max: 4 hours/day, 18 hours/week (per UU Cipta Kerja)

### 3.4 THR (Holiday Bonus)
- >= 12 months tenure: 1× monthly salary
- < 12 months: proportional (months / 12 × salary)
- Must be paid max 7 days before religious holiday

### 3.5 Regional Minimum Wage (UMP/UMK)
- 38 provinces with different UMP rates
- 514 kabupaten/kota with specific UMK rates
- System validates: base salary >= applicable UMP/UMK

### 3.6 Harmony Toggle (Optimization)
- Standard: Calculate strictly by law
- Harmony: Restructure compensation to maximize take-home pay
  - Move portion to non-taxable allowances (transport, meals)
  - Optimize BPJS base vs actual salary
  - All within legal bounds

### 3.7 Reverse Timesheet Engineering (Architect)
- Input: desired net salary
- Output: Required overtime hours and timesheet that produces that net amount
- Algorithm: iterative binary search on overtime hours
- Validation: ensure result passes legal compliance check

## 4. Data Model (Supabase)

### Tables:
```sql
-- Companies
companies (id, name, industry_risk_class, region_id, created_at)

-- Employees
employees (id, company_id, name, nik, npwp, ptkp_status, base_salary,
           join_date, region_id, is_active)

-- Payroll Records
payroll_records (id, employee_id, period_month, period_year,
                 gross, overtime_hours, overtime_pay,
                 bpjs_kes_employee, bpjs_jht_employee, bpjs_jp_employee,
                 bpjs_kes_employer, bpjs_jht_employer, bpjs_jp_employer,
                 bpjs_jkk_employer, bpjs_jkm_employer,
                 pph21, net_salary, calculation_mode,
                 created_at)

-- Regional Rates
regional_rates (id, province, city, ump, umk, year, updated_at)

-- Tax Rules
tax_rules (id, rule_type, category, min_income, max_income, rate, year)

-- Subscriptions
subscriptions (id, company_id, tier, status, started_at, expires_at)
```

## 5. File Structure
```
gaji-ai/
├── index.html              # Landing page with AI Sales Agent
├── app.html                # Main application (SPA)
├── src/
│   ├── js/
│   │   ├── app.js              # Main app controller, routing
│   │   ├── compliance-engine.js # All payroll calculations
│   │   ├── harmony-toggle.js    # Salary optimization logic
│   │   ├── reverse-engineer.js  # Timesheet reverse engineering
│   │   ├── pdf-generator.js     # Slip Gaji PDF creation
│   │   ├── payment.js           # Xendit integration
│   │   ├── auth.js              # Supabase auth
│   │   └── storage.js           # LocalStorage + Supabase sync
│   ├── css/
│   │   └── styles.css           # Full design system
│   ├── data/
│   │   ├── ter-rates-2024.json  # PPh 21 TER complete tables
│   │   ├── ump-umk-2025.json    # Regional minimum wages
│   │   ├── bpjs-rules.json      # BPJS rates and caps
│   │   └── holidays-id.json     # Indonesian public holidays
│   └── components/
│       ├── dashboard.js
│       ├── employees.js
│       ├── payroll.js
│       ├── holidays.js
│       └── export.js
├── docs/
│   ├── architecture.md
│   └── indonesian-payroll.md
├── assets/
│   └── logo.svg
└── public/
    └── favicon.ico
```

## 6. Deployment
- **Frontend**: Vercel (free tier) or GitHub Pages
- **Database**: Supabase (free tier: 500MB, 50K monthly active users)
- **Payments**: Xendit (individual account)
- **Domain**: TBD (researching Indonesian market options)

## 7. Security
- All calculations run client-side (no API keys exposed in calculation)
- Supabase Row Level Security (RLS) for multi-tenant data
- Payment callbacks verified via Xendit webhook signature
- No PII stored in LocalStorage for free tier
- HTTPS enforced
