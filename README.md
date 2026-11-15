# CareCircle
### Intelligent Elderly Healthcare & Care Coordination Ecosystem

> **Core Philosophy:**  
> *"Independence first. Assistance when needed. Intervention when necessary."*

CareCircle is a production-grade, accessible, and intelligent healthcare management platform designed for elderly individuals to manage their medications, doctor visits, healthcare routines, and vital observations while maintaining a secure, consent-driven connection with authorised family members and caretakers.

---

## 🌟 Key Differentiators

Unlike basic medication reminder apps, CareCircle addresses the root cause of medication non-adherence and care fragmentation:
1. **Elderly Sovereignty**: The elderly individual is the primary account holder and decision-maker. Caregivers do not automatically receive unrestricted access; every permission is granular and revocable.
2. **Care Intelligence Loop**: An end-to-end automated cycle connecting dose scheduling, reminders, self-reported vs. verified physical consumption, behavioral pattern identification (via Scikit-learn and rule analytics), intelligent multi-stage escalation, and clinical summary generation.
3. **Pre-Appointment Briefing**: Automatically synthesizes active medications, 14-day adherence statistics, missed/unconfirmed doses, vital observations, and patient-prepared questions, with an explicit patient consent toggle for clinical sharing.
4. **Prescription OCR with Human-in-the-Loop**: Tesseract OCR extraction with confidence scoring, low-confidence warning triggers, and an editable confirmation form (never activates without human verification).
5. **Accessible Voice Companion**: Built with the Browser Web Speech API (speech recognition and synthesis) with Hindi & English multilingual support, high-contrast mode, and large touch targets.
6. **Live Demo Mailbox**: Full HTML email notification templates rendered inside an in-app inspection sandbox without requiring third-party credentials.

---

## 🏛️ Architecture & Tech Stack

```
CareCircle Ecosystem
├── Frontend (React 18 + TypeScript + Tailwind CSS + Lucide React + Recharts)
│   ├── Accessibility Bar (Font scale A/A+/A++, High Contrast, EN/HI toggle, Instant Role Switcher)
│   ├── Voice Assistant Companion (Web Speech Recognition + Speech Synthesis TTS)
│   ├── Elderly Dashboard (Daily briefing, one-tap take button, next med countdown, CareCircle status)
│   ├── Medication Intelligence (Active & discontinued regimens, dose schedule, refill warnings)
│   ├── Appointments & Pre-Appointment Briefing (Doctor profiles, briefing generator, print layout)
│   ├── Care Network & Permissions (6-char invite codes, single-use tokens, granular privileges)
│   ├── Care Intelligence Lab (Time-of-day charts, 7-day trend, ML pattern analysis, loop trigger)
│   ├── Prescription OCR (Document upload, confidence score bar, editable confirmation form)
│   └── Notifications & Demo Mailbox (Rendered HTML templates, delivery status, test dispatcher)
│
├── Backend (FastAPI + SQLAlchemy + Pydantic v2)
│   ├── REST API Modules (/auth, /medications, /appointments, /care-network, /intelligence, /ocr, /notifications, /health)
│   ├── Care Intelligence Engine (Pandas + Scikit-Learn IsolationForest anomaly & trend analysis)
│   ├── Background Scheduler (APScheduler: upcoming reminders, multi-stage escalations, refill checks)
│   ├── Security Middleware (JWT bearer auth, PBKDF2-HMAC password hashing, audit logging)
│   └── Email Delivery Service (SMTP, Resend API, and Demo In-App Mailbox modes)
│
└── Database (Relational Schema supporting PostgreSQL and SQLite)
    └── 17 Normalized Tables: users, elderly_profiles, care_network, permissions, invitations,
        medications, medication_schedules, scheduled_doses, adherence_events, doctors,
        appointments, notifications, escalation_events, caregiver_logs, medical_documents,
        health_observations, audit_logs.
```

---

## 🚀 Quick Start (Single Command)

### 1. Run Full-Stack Platform
From the repository root directory, run:
```bash
python run.py
```
* **Web UI & API**: Open your browser at [http://localhost:8000](http://localhost:8000)
* **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

*(The database is automatically created and populated with rich realistic demonstration data on first launch!)*

---

## 👥 Hackathon Pre-Configured Demo Accounts

Use the **Role Switcher** in the top black accessibility bar to switch between roles with a single click, or log in with these credentials:

| Role | Name | Email | Password | Responsibilities |
|---|---|---|---|---|
| **Elderly** (Primary) | Margaret Sharma | `margaret.sharma@carecircle.demo` | `password123` | Full sovereignty, schedule management, voice assistant, doctor sharing consent |
| **Caretaker** | Anita Devi | `anita.devi@carecircle.demo` | `password123` | Physical dose assistance, shift handover logs, vitals tracking, alert acknowledgment |
| **Family Member** | Rohan Sharma | `rohan.sharma@carecircle.demo` | `password123` | Peace-of-mind summary, adherence trend tracking, appointment accompaniment |

---

## 🔄 The Care Intelligence Loop (Demonstration Guide)

Follow this end-to-end workflow during evaluations:
1. **View Schedule**: In the **Elderly Home** or **My Medicines** view, inspect today's scheduled doses.
2. **One-Tap Intake**: Tap *"I Have Taken This"* or use the Voice Assistant (*"I have taken my morning medicine"*). Notice the dose marks as taken, remaining supply decrements, and an `adherence_events` record is created.
3. **Trigger Loop Evaluation**: Go to the **Care Intelligence** tab and tap **"Trigger Care Loop Cycle"**.
   - Upcoming reminders within 15 minutes receive notifications.
   - Overdue unconfirmed doses progress through configured escalation stages:
     - **Stage 1 (30 mins)**: Friendly check-in email sent to Margaret.
     - **Stage 2 (60 mins)**: Escalation alert sent to Caretaker Anita Devi.
     - **Stage 3 (120 mins)**: Escalation alert sent to Family Member Rohan Sharma.
4. **Caretaker Acknowledgment & Resolution**: Switch to **Anita Devi (Caretaker)**, view the **Escalation Queue**, click **Acknowledge**, and then **Resolve Dose Intake** with notes.
5. **Inspect Live Email Delivery**: Open the **Mailbox & Alerts** page to see the exact delivered HTML email notifications with action buttons.
6. **Pre-Appointment Briefing**: Navigate to **Appointments**, click **Pre-Appointment Briefing** for the upcoming visit with Dr. Sarah Jenkins, and test the **Authorize Doctor Sharing** consent toggle.

---

## 📄 Prescription OCR Scanner

1. Open the **Prescription OCR** page.
2. Upload any prescription image or PDF, or click one of the quick demo buttons (**Diabetes Rx** or **Cardio Rx**).
3. The system parses the document, computes an OCR confidence score, and checks for potential ambiguities.
4. Review the extracted medication name, dosage strength, frequency, and instructions in the **Editable Confirmation Form**.
5. Click **"Verify & Add to My Schedule"** to activate the regimen.

---

## ♿ Accessibility & Multilingual Features

* **Voice Interaction**: Tap the floating microphone button to speak naturally. Try saying:
  * *"What medicines do I need to take today?"*
  * *"When is my next appointment?"*
  * *"I have taken my morning medicine"*
* **Spoken Daily Briefing**: Click *"Read Aloud"* on the home page for a spoken summary.
* **Typography Controls**: Instant font size adjustment (`A`, `A+`, `A++`) across the application.
* **High Contrast Mode**: One-click high-contrast mode for visual impairments.
* **Multilingual Support**: Switch seamlessly between **English** and **Hindi (हिंदी)**.

---

## 🔒 Security & Privacy Commitments

* **Zero Hardcoded Secrets**: Secrets are configurable via environment variables (`.env`).
* **Cryptographic Password Hashing**: PBKDF2-HMAC-SHA256 with random cryptographic salts.
* **Consent-Driven Access**: Granular backend checks on every protected request.
* **Complete Audit Trail**: Every sensitive action (creation, confirmation, revocation) is permanently recorded in `audit_logs`.
* **No Medical Diagnoses**: The platform focuses strictly on coordination, continuity, and intelligent reminders without dispensing automated medical diagnoses.

---
*Developed for the Elderly Care & Medication Management Platform Hackathon Challenge.*
