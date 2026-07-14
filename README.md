<div align="center">

# Kakasa

### Borrow with confidence. Verify before you trust.

**A borrower-protection platform that shields Ugandans from unsolicited, high-cost digital loans - and helps them borrow responsibly when they choose to.**

Reachable on a smartphone, a feature phone (USSD), a phone call (voice), and by SMS - so protection reaches everyone, not just people with data.

<br/>

🏆 **1st Runner-Up - Bank of Uganda @60 Hackathon**
Selected among **1,069 applicants**

Built by **Jude Otine · Grace · William Benjamin · Conrad Wagabi · Catherine Ndagire**

<br/>

![Expo](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Edge-3ECF8E?logo=supabase&logoColor=white)
![FastAPI](https://img.shields.io/badge/ML-FastAPI_%2B_XGBoost-009688?logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

</div>

---

## Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Feature Tour](#-feature-tour)
- [System Architecture](#-system-architecture)
- [The Loan Journey](#-the-loan-journey)
- [Debt-Stress ML Model](#-debt-stress-ml-model)
- [Fraud Protection & Lender Verification](#-fraud-protection--lender-verification)
- [Data Model](#-data-model)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Edge Functions](#-edge-functions)
- [Security](#-security)
- [The Team](#-the-team)

---

## The Problem

Uganda's digital-lending boom has a dark side. Every day, borrowers are hit with **unsolicited SMS and calls from unlicensed "loan apps"** charging punishing interest, harvesting contacts, and shaming defaulters. Many people:

- **Can't tell a licensed lender from a scam** before they hand over their National ID and mobile-money PIN.
- **Over-borrow**, because no one shows them what a loan will actually cost them month-to-month.
- **Have no safe way to report** a predatory lender or a fraudulent call.
- **Are excluded** from protection tools because they don't own a smartphone or have mobile data.

## The Solution

**Kakasa** ("verify" / "prove it") puts a protective layer between the borrower and the lender:

| Pillar | What it does |
| --- | --- |
| **Verify** | Instantly check whether a lender is a **licensed, known provider** before engaging - by app, USSD, or voice call. |
| **Report** | One-tap / one-call **fraud reporting** for scam lenders and predatory calls. |
| **Warn** | An **XGBoost debt-stress model** estimates whether a proposed loan will strain a borrower's finances - *before* they commit. It advises; it never silently approves or rejects. |
| **Advise** | A multilingual **AI financial advisor** for credit, budgeting, and loan literacy. |
| **Borrow safely** | A guided application flow with **KYC, liveness, and an AI interview** - only through vetted providers. |
| **Reach everyone** | The same protection on **smartphone, USSD, voice, and SMS**, in **local languages**. |

---

## Feature Tour

### Protection & Trust
- **Lender verification** - search any lender name and get a clear verdict (verified provider vs. "not on Kakasa - be cautious"), via app, USSD, or voice.
- **Fraud reporting** - report predatory lenders / scam calls; reports are captured for follow-up (`fraud_reports`).
- **Debt-stress risk assessment** - a per-loan risk band (`Low Risk · Caution · High Risk · Severe Debt-Stress Risk`) from the ML service.

### Borrowing
- **Licensed provider directory** - curated Uganda-licensed digital lenders with rates, limits, terms, and requirements.
- **Personalized credit score** - a 300–850 rule-based scorecard computed from onboarding data and loan history.
- **Guided loan application** - choose an amount → debt-stress check → consent & KYC → AI voice interview → decision → disbursement.
- **KYC & liveness** - National ID front/back capture and a guided facial-liveness check (on-device MLKit face detection).
- **AI voice interview** - a conversational loan-officer interview (speech-to-text → LLM → text-to-speech) that scores the applicant.

### Money
- **Disbursements, repayments, payments & receipts** - track active loans, pay, and download receipts.
- **SMS reminders** - repayment nudges over Africa's Talking.
- **Push notifications** - loan and credit-score updates.

### Access & Inclusion
- **USSD companion** - a full feature-phone journey (PIN-protected): verify a lender, get financial tips, and more.
- **Voice assistant** - call in to verify a lender or report fraud, hands-free.
- **Multilingual UI** - in-app translation into Ugandan languages via Sunbird AI.
- **Biometric unlock** - Face ID / fingerprint via the device secure enclave.

---

## System Architecture

Kakasa is **multi-channel by design** - every channel funnels into one trusted backend, so a feature-phone user and a smartphone user get the same verified answers.

```mermaid
flowchart TB
    subgraph Channels["Access Channels"]
        APP["Smartphone App<br/>(Expo / React Native)"]
        USSD["USSD<br/>(feature phones)"]
        VOICE["Voice Call<br/>(IVR assistant)"]
        SMS["SMS<br/>(reminders)"]
    end

    subgraph Supabase["Supabase Backend"]
        AUTH["Auth<br/>(JWT, RLS)"]
        DB[("Postgres<br/>+ Row Level Security")]
        STORAGE["Storage<br/>(private KYC bucket)"]
        subgraph Fns["Edge Functions (Deno)"]
            CS["compute-credit-score"]
            LI["loan-interview"]
            PP["process-payment"]
            UG["ussd-gateway"]
            VT["voice-tools / voice-events"]
            SR["sms-reminders"]
            SN["send-notification"]
        end
    end

    subgraph External["External Services"]
        ML["Debt-Stress ML API<br/>(FastAPI + XGBoost · Render)"]
        LLM["LLM Provider<br/>(OpenRouter: DeepSeek + Gemini)"]
        AT["Africa's Talking<br/>(USSD / SMS)"]
        SUN["Sunbird AI<br/>(translation)"]
    end

    APP --> AUTH
    APP --> Fns
    APP -->|risk check| ML
    APP -->|advisor / STT / TTS| LLM
    APP -->|translate| SUN

    USSD --> UG
    VOICE --> VT
    UG --> AT
    SR --> AT
    SMS --- AT

    Fns --> DB
    AUTH --> DB
    APP --> STORAGE
    LI --> LLM
    UG --> DB
    VT --> DB
```

---

## The Loan Journey

The application flow is deliberately staged so a borrower **understands the cost and risk before committing**, and so decision-making stays server-side (a client can never approve its own loan).

```mermaid
sequenceDiagram
    actor U as Borrower
    participant App as Kakasa App
    participant ML as Debt-Stress ML
    participant DB as Supabase (RLS)
    participant Fn as loan-interview (service role)
    participant LLM as LLM (OpenRouter)

    U->>App: Choose provider + amount + term
    App->>ML: Assess debt-stress for this loan
    ML-->>App: Risk band + probability + reasons
    App->>DB: Create application (status: credit_check)
    Note over App,DB: Client may only write applicant fields.<br/>Decision fields are RLS-protected.

    U->>App: Accept terms (consent)
    U->>App: Capture National ID (front/back)
    U->>App: Guided facial liveness (MLKit)
    App->>DB: Save consent + KYC (status: interviewing)

    loop Voice interview
        U->>App: Speak answer
        App->>Fn: audio (WAV, base64)
        Fn->>LLM: transcribe + interviewer turn
        LLM-->>Fn: applicant text + next question
        Fn-->>App: reply (spoken via TTS)
    end

    U->>App: End interview
    Fn->>LLM: Score the transcript
    LLM-->>Fn: score + decision + reasons
    Fn->>DB: Write decision (approved / reviewing / declined)
    App->>DB: Poll decision
    DB-->>App: Outcome → disbursement
```

**Why this matters:** the debt-stress warning is shown **first**, KYC images go to a **private bucket** with owner-scoped access, and the **only writer of decision fields is the service-role edge function** - enforced by Row Level Security.

---

## Debt-Stress ML Model

A first-party **XGBoost** model, served as a FastAPI microservice on Render. It answers one question: *"Is this loan likely to cause this borrower debt stress?"* - and returns a human-readable band. **It does not approve or reject loans.**

```mermaid
flowchart LR
    A["Borrower profile<br/>income · employment · loans"] --> B["Client builds request<br/>3–6 months of inflows"]
    B --> C["POST /api/debt-stress/predict"]
    C --> D["Feature engineering<br/>income stability · repayment/income ·<br/>loan cost % · repayment/inflow"]
    D --> E["XGBoost model<br/>(msente_xgboost_model.joblib)"]
    E --> F["Risk probability"]
    F --> G{"Threshold bands"}
    G --> H["Low Risk"]
    G --> I["Caution"]
    G --> J["High Risk"]
    G --> K["Severe Debt-Stress Risk"]
```

- **Endpoints:** `GET /health`, `POST /api/debt-stress/predict`
- **Engineered features:** `income_stability_score`, `repayment_to_income_ratio`, `loan_cost_percentage`, `repayment_to_inflow_ratio`, `avg_monthly_inflow`
- **Deployment:** Render (Python 3.11.9 pinned); the model is loaded once at startup with `joblib`
- **Safety:** the model artifact is a trusted first-party file - never load a pickle/joblib from an untrusted source

See [`ml-service/README.md`](ml-service/README.md) for the full request/response contract.

---

## Fraud Protection & Lender Verification

The anti-scam heart of Kakasa - available to **anyone with a phone**, no app or data required.

```mermaid
flowchart TD
    Start(["Borrower gets a loan offer / call"]) --> Ask{"Verify the lender"}
    Ask -->|App| A1["Search provider name"]
    Ask -->|USSD| A2["Dial USSD → Verify lender"]
    Ask -->|Voice| A3["Call in → say lender name"]

    A1 --> Check[["Match against licensed<br/>loan_providers directory"]]
    A2 --> Check
    A3 --> Check
    Check -->|Match found| OK["Verified lender<br/>Show rates, limits, terms"]
    Check -->|No match| WARN["NOT a verified lender<br/>Do not pay or share PIN/ID"]

    WARN --> Report{"Report as fraud?"}
    Report -->|Yes| Save[("Save to fraud_reports")]
    Report -->|No| End([Stay cautious])
    OK --> End
    Save --> End
```

USSD and voice run through Supabase Edge Functions (`ussd-gateway`, `voice-tools`, `voice-events`) with **PBKDF2-hashed PINs**, constant-time comparisons, and session logging (`voice_sessions`).

---

## Data Model

Core tables (all protected by Row Level Security):

```mermaid
erDiagram
    profiles ||--o{ loan_applications : submits
    profiles ||--o{ loans : holds
    profiles ||--o{ credit_scores : has
    loan_providers ||--o{ loan_applications : receives
    loan_applications ||--o{ application_documents : "KYC files"
    loans ||--o{ payments : repays
    loans ||--o{ receipts : issues

    profiles {
        uuid id PK
        text full_name
        date date_of_birth
        text phone
        text nin
        text employment_status
        text monthly_income
    }
    loan_applications {
        uuid id PK
        uuid user_id FK
        uuid provider_id FK
        text status
        numeric amount_requested
        numeric risk_probability
        numeric interview_score
        jsonb decision_reasons
    }
    loan_providers {
        uuid id PK
        text name
        numeric min_rate
        numeric max_rate
        numeric max_amount
    }
    fraud_reports {
        uuid id PK
        text caller_phone
        text reported_entity
        text description
    }
```

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Mobile app** | Expo SDK 57 · React Native 0.86 · React 19 · expo-router (typed routes, native tabs) · Reanimated · react-native-svg |
| **Backend** | Supabase - Postgres, Auth (JWT), Row Level Security, Storage, Edge Functions (Deno/TypeScript) |
| **ML service** | Python · FastAPI · XGBoost · scikit-learn · pandas/numpy · deployed on Render |
| **AI** | OpenRouter - DeepSeek (chat/interview/scoring) + Gemini (speech-to-text) · on-device TTS (expo-speech) |
| **KYC / liveness** | expo-camera · expo-image-picker · `@react-native-ml-kit/face-detection` |
| **Telco** | Africa's Talking (USSD + SMS) · voice IVR assistant |
| **Localization** | Sunbird AI translation · custom i18n layer |
| **Security** | RLS policies · PBKDF2 PIN hashing · private KYC storage · biometric unlock (expo-local-authentication) |

---

## Repository Structure

```
kakasa/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (tabs)/                 # Home, Loans, Providers, Advisor, Profile
│   ├── auth/                   # Login, signup, forgot-password
│   ├── loan-apply/             # amount → risk → consent → interview → decision
│   ├── loan/                   # Loan detail, pay, receipt
│   ├── onboarding.tsx          # First-run onboarding
│   └── account-setup.tsx       # Profile, phone OTP, biometrics, notifications
├── components/                 # Reusable UI (consent/, credit/, loans/, providers/)
├── lib/                        # Data layer & services
│   ├── supabase.ts             # Client
│   ├── credit.ts / providers.ts / loanApplication.ts
│   ├── debtStress.ts           # ML risk-check client
│   ├── i18n.tsx / strings.ts / sunbird.ts   # Localization
│   └── translations/
├── supabase/
│   ├── migrations/             # Versioned SQL schema (RLS, tables, seeds)
│   └── functions/              # Deno edge functions
│       ├── _shared/            # africastalking, creditScorecard, admin client
│       ├── compute-credit-score/
│       ├── loan-interview/
│       ├── ussd-gateway/       # Feature-phone journey
│       ├── voice-tools/  voice-events/   # Voice assistant + fraud tools
│       ├── process-payment/  send-notification/  sms-reminders/
└── ml-service/                 # FastAPI debt-stress model (Render)
    ├── app/                    # main.py, model_service.py, risk.py, schemas.py
    ├── models/                 # msente_xgboost_model.joblib
    └── requirements.txt
```

---

## Getting Started

### Prerequisites
- **Node.js** 20+ and **Yarn** (this project uses Yarn - not npm)
- **Xcode** (iOS) / **Android Studio** (Android) - a **dev client** is required (the app uses native modules: camera, audio, MLKit, date picker)
- **Python** 3.11 (for the ML service)
- A **Supabase** project and an **OpenRouter** API key

### 1. Install & configure
```bash
git clone <repo-url> kakasa && cd kakasa
yarn install
cp .env.example .env.local   # then fill in the values below
```

### 2. Run the mobile app
```bash
yarn ios        # build & run on iOS simulator/device (dev client)
yarn android    # build & run on Android
# yarn dev      # start the Metro bundler
```
> The app depends on native modules, so it runs in a **custom dev client**, not Expo Go. If you add/upgrade native deps, run `yarn expo prebuild --clean` and rebuild.

### 3. Run the ML service (optional, for local risk checks)
```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# point EXPO_PUBLIC_ML_API_URL at http://localhost:8000
```

### 4. Supabase
Apply the SQL in `supabase/migrations/` (in order) and deploy the functions in `supabase/functions/` to your project. Set the function secrets listed below.

---

## Environment Variables

**App (`.env.local` - `EXPO_PUBLIC_*` values are bundled into the client):**

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_ML_API_URL` | Base URL of the debt-stress ML service |
| `EXPO_PUBLIC_SUNBIRD_API_KEY` | Sunbird AI translation key |

**Server (Supabase Edge Function secrets - never shipped to the client):**

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged DB access for decision writes |
| `OPENROUTER_API_KEY` | LLM (advisor, interview, STT, scoring) |
| `AT_API_KEY` / `AT_USERNAME` | Africa's Talking (USSD & SMS) |

---

## Edge Functions

| Function | Responsibility |
| --- | --- |
| `compute-credit-score` | Rule-based 300–850 scorecard from profile + loan history |
| `loan-interview` | Voice interview: transcription, interviewer turns, and **decision scoring** (only writer of decision fields) |
| `ussd-gateway` | Full feature-phone journey (Africa's Talking) - PIN-protected, multilingual, lender verification, tips |
| `voice-tools` / `voice-events` | Voice IVR: verify a lender, report fraud, log sessions |
| `process-payment` | Loan repayments and receipts |
| `sms-reminders` | Repayment reminders over SMS |
| `send-notification` | Push notifications |

---

## Security

- **Row Level Security everywhere.** Applicants can read/write only their own rows; the split policy on `loan_applications` lets a client set applicant fields and safe status transitions, but **only the service-role edge function can write decision fields** (score, approval, reasons) - a client can never self-approve.
- **KYC images** (National ID + face frames) live in a **private storage bucket**, path-scoped to the owner.
- **USSD PINs** are hashed with **PBKDF2 (100k iterations, SHA-256)** and compared in constant time; account takeover via re-registration is blocked.
- **PINs are redacted** from USSD session audit logs.
- **Biometric unlock** uses the device secure enclave (Face ID / fingerprint).

---

## The Team

Built for the **Bank of Uganda @60 Hackathon**, where Kakasa was selected as **1st Runner-Up among 1,069 applicants**.

| Member |
| --- |
| **Jude Otine** |
| **Grace Wanja** |
| **William Benjamin** |
| **Conrad Wagabi** |
| **Catherine Ndagire** |

<div align="center">

---
**Kakasa - verify before you trust.**

</div>
