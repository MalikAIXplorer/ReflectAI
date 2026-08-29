# 🧠 ReflectAI — Private AI Journal & Reflection Companion

> A production-grade, privacy-first self-reflection workspace powered by **Google Gemini 3.6 Flash**, **Google Cloud Run**, and **Cloud Firestore**. Transform scattered thoughts, anxieties, and daily experiences into structured insights, recurring emotional patterns, and actionable next steps.

---

## 📖 Table of Contents

- [🎯 Purpose: Why ReflectAI?](#-purpose-why-reflectai)
- [✨ How ReflectAI Helps You](#-how-reflectai-helps-you)
- [🗺️ System Architecture & Visual Flow Diagrams](#️-system-architecture--visual-flow-diagrams)
  - [1. High-Level System Architecture](#1-high-level-system-architecture)
  - [2. End-to-End Reflection & AI Processing Flow](#2-end-to-end-reflection--ai-processing-flow)
  - [3. Owner-Bound Data Isolation Model](#3-owner-bound-data-isolation-model)
- [🧰 Main Technology Stack](#-main-technology-stack)
- [🌟 Key Capabilities & 5 Reflection Modes](#-key-capabilities--5-reflection-modes)
- [💻 Step-by-Step Local Setup Guide](#-step-by-step-local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Start the Development Server](#3-start-the-development-server)
- [🔒 Security Directives & Firestore Rules](#-security-directives--firestore-rules)
- [🔑 Secret Manager Configuration](#-secret-manager-configuration)
- [🚀 Google Cloud Run Production Deployment](#-google-cloud-run-production-deployment)
- [🛡️ Threat Model & Security Countermeasures](#️-threat-model--security-countermeasures)
- [🧪 Functional Walkthrough & Test Scenarios](#-functional-walkthrough--test-scenarios)

---

## 🎯 Purpose: Why ReflectAI?

Traditional journaling is great for getting thoughts down, but static notebooks don't talk back, summarize complex dilemmas, or help spot behavioral loops over time. Conversely, generic chatbots often feel clinical, lose context across sessions, or raise severe privacy concerns regarding personal diary data.

**ReflectAI was created to bridge this gap:**
- **A Safe, Private Space**: An empathetic, non-judgmental thinking partner that helps unpack challenges, untangle confusion, and organize priorities.
- **Cognitive Clarity Without Clinical Judgment**: Designed strictly as an objective, reflective sounding board rather than a diagnostic medical tool.
- **Zero Privacy Compromise**: Ensures your innermost reflections never leak, cannot be viewed across accounts, and reside within strict database boundaries.

---

## ✨ How ReflectAI Helps You

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  1. UNLOAD THOUGHTS    │      │  2. EXPLORE & REFLECT   │      │  3. ACT & EVOLVE       │
│  Write freely without  │ ───► │  Multi-turn dialogue   │ ───► │  Auto-extract next     │
│  worrying about format │      │  with Gemini 3.6 Flash │      │  steps & track themes  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Deconstruct Overwhelm**: Break down complex life, career, or relational dilemmas into manageable parts using tailored AI reflection modes.
2. **Discover Recurring Life Themes**: Automatically detect repeating topics (e.g., `#WorkAnxiety`, `#CareerGrowth`, `#Relationships`, `#CreativeGoals`) across weeks of entries.
3. **Turn Reflection into Momentum**: Automatically distill high-leverage action items from your conversations directly into a personal **Next Steps** board.
4. **Natural Language Memory Retrieval**: Search past reflections by meaning or feeling (e.g., *"When did I feel stuck with team dynamics?"*) rather than just exact keywords.
5. **Total Ownership**: Erase all your records with a single verified command whenever you choose.

---

## 🗺️ System Architecture & Visual Flow Diagrams

### 1. High-Level System Architecture

```
                                  USER BROWSER
                         ┌─────────────────────────────┐
                         │  React 18 + Tailwind CSS    │
                         │  Modern Bento Grid Layout   │
                         │  Firebase Auth Client SDK   │
                         └──────────────┬──────────────┘
                                        │
                                        │ HTTPS + Verified Bearer ID Token
                                        ▼
                         ┌─────────────────────────────┐
                         │      GOOGLE CLOUD RUN       │
                         │   Node.js / Express Server  │
                         │  - Token Verification (JWT) │
                         │  - Safe Request Gateways    │
                         │  - Resilient Model Ladder   │
                         └──────┬───────────────┬──────┘
                                │               │
                Owner-Bound SDK │               │ Secure Backend API Call
                Operations      │               │ (Secret in Secret Manager)
                                ▼               ▼
                 ┌────────────────────┐   ┌──────────────────────────┐
                 │  CLOUD FIRESTORE   │   │  GEMINI 3.6 FLASH API    │
                 │  users/{uid}/...   │   │  - Generative Dialogue   │
                 │  - /journals       │   │  - Structured Extraction │
                 │  - /messages       │   │  - Resilient Fallbacks   │
                 │  - /actions        │   └──────────────────────────┘
                 │  - /insights       │
                 └────────────────────┘
```

---

### 2. End-to-End Reflection & AI Processing Flow

```
[ User types thought ]
         │
         ▼
[ Frontend attaches Firebase Auth Token ]
         │
         ▼
[ Express Server validates User UID via Firebase Admin SDK ]
         │
         ├─── Valid User? ──► NO ──► [ 401 Unauthorized Error ]
         │
         ▼ YES
[ Express builds prompt with chosen Reflection Mode + History Context ]
         │
         ▼
[ Gemini 3.6 Flash processes prompt & structured schema ]
         │
         ├─── Primary Model OK? ──► YES ──► [ Receive Output ]
         │
         └─── Error / Timeout? ──► [ Automatic Fallback to Ladder Models ]
                                             │
                                             ▼
                                 [ Structured Output Received:
                                   • Reflection Message
                                   • Mood & Themes
                                   • Summary
                                   • Extracted Action Steps ]
                                             │
                                             ▼
[ Server returns sanitized response to Frontend ]
         │
         ▼
[ Frontend renders chat & persists entry + messages to Cloud Firestore ]
         │
         ▼
[ User sees response, mood badge, themes, and interactive action items ]
```

---

### 3. Owner-Bound Data Isolation Model

All Firestore paths strictly enforce the user's verified `uid` at the security rule level:

```
/databases/(default)/documents/
 └── users/
      ├── {userId_Alice}/
      │    ├── journals/     <-- ONLY Alice (request.auth.uid == userId_Alice)
      │    ├── messages/     <-- ONLY Alice
      │    ├── actions/      <-- ONLY Alice
      │    └── insights/     <-- ONLY Alice
      │
      └── {userId_Bob}/
           ├── journals/     <-- ONLY Bob (request.auth.uid == userId_Bob)
           ├── messages/     <-- ONLY Bob
           ├── actions/      <-- ONLY Bob
           └── insights/     <-- ONLY Bob
```

---

## 🧰 Main Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18**, **TypeScript**, **Vite** | Fast, modern client runtime with responsive component architecture. |
| **UI & Styling** | **Tailwind CSS**, **Lucide Icons** | Bento Grid dashboard design, dark canvas theme, and accessible contrast. |
| **Backend & Routing** | **Node.js**, **Express** | Full-stack proxy ensuring API keys and credentials are never exposed to browsers. |
| **AI Intelligence** | **Google GenAI SDK** (`@google/genai`), **Gemini 3.6 Flash** | Empathetic multi-turn reflection, sentiment & theme extraction, and action planning. |
| **Model Fallback Ladder** | `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash` | Enterprise-grade availability and automated error recovery across quota/outage events. |
| **Authentication** | **Firebase Authentication** | Google Sign-In with client popup flow & server-side JWT verification. |
| **Database Storage** | **Cloud Firestore** | Real-time persistence with strict, owner-bound row-level security. |
| **Secrets & Cloud** | **Google Cloud Run**, **Google Secret Manager** | Autoscaling containerized hosting with IAM-governed secret injection. |

---

## 🌟 Key Capabilities & 5 Reflection Modes

When writing or conversing with ReflectAI, choose between 5 distinct modes:

| Mode | Purpose | Example Output |
| :--- | :--- | :--- |
| **Reflect** (Default) | Empathetic, grounded mirror asking thoughtful follow-up questions. | *"It sounds like you're carrying a lot of unspoken expectations. What would happen if you communicated that boundary early?"* |
| **Summarize** | Compassionate distillation of core feelings, tensions, and core realizations. | *"Summary: Transitioning to team lead is sparking impostor syndrome despite proven technical success."* |
| **Brainstorm** | Offers 3–4 constructive angles, reframing techniques, and alternative paths. | *"Perspective 1: Treat the role as coaching rather than solo problem-solving..."* |
| **Action Plan** | Converts emotional or strategic thoughts into concrete, bite-sized tasks. | Generates items like `[ ] Schedule 15-min sync with manager` with one-click addition to your board. |
| **Find Patterns** | Analyzes recurring themes, cognitive loops, and energy drains across entries. | *"Across your last 4 reflections, tension peaks on Sundays prior to sprint planning."* |

---

## 💻 Step-by-Step Local Setup Guide

Follow these steps to get ReflectAI running locally on your computer.

### Prerequisites
- **Node.js** (v20.x or higher)
- **npm** (v10.x or higher)
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)
- (Optional) A **Firebase Project** for Google Sign-In and Firestore storage

---

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd reflectai

# Install npm packages
npm install
```

---

### 2. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and set your credentials:
   ```env
   # Gemini API Key from Google AI Studio
   GEMINI_API_KEY="your_actual_gemini_api_key_here"

   # Default Gemini Model
   GEMINI_MODEL="gemini-3.6-flash"

   # Local Server Port (Fixed to 3000)
   PORT=3000
   ```

> 🔒 **Security Note**: Never commit your `.env` file or API keys to Git. The `.gitignore` file already excludes `.env`.

---

### 3. Start the Development Server

```bash
npm run dev
```

- The full-stack app will launch at `http://localhost:3000`.
- Open your browser to `http://localhost:3000`.
- You can explore instantly using **"Explore Demo Session"** or log in with your Google account.

---

## 🔒 Security Directives & Firestore Rules

To ensure strict user data privacy, apply these owner-bound rules in your Firebase Console under **Firestore Database > Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strictly isolate all documents under the authenticated user's UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
      
      match /actions/{actionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /insights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🔑 Secret Manager Configuration

For production deployments on Google Cloud, store your Gemini API key inside Google Secret Manager:

```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Google Cloud Run Production Deployment

Deploy ReflectAI to Google Cloud Run with automated secret binding and challenge labeling:

```bash
# 1. Build and deploy container to Cloud Run
gcloud run deploy reflectai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="GEMINI_MODEL=gemini-3.6-flash,NODE_ENV=production"

# 2. Apply the campaign verification label
gcloud run services update reflectai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region us-central1
```

---

## 🛡️ Threat Model & Security Countermeasures

| Threat Zone | Risk Scenario | Severity | Countermeasure Implemented |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection attempting to override reflection boundaries or extract system instructions. | Medium | Strict system instructions with parameter-bounded framing and structured JSON schema enforcement (`responseSchema`). |
| **Planning & Reasoning** | Stale or deprecated model routing (`gemini-2.5-pro` 404 deprecation error). | High | Upgraded primary model to `gemini-3.6-flash` configurable via `GEMINI_MODEL`, supported by an automated resilient fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`). |
| **Tool & API Execution** | Raw API error exposure and stack traces leaking internal configuration or credentials. | High | Server-side API gateway with safe error masking, returning user-friendly recovery notices without logging API keys or private reflection texts. |
| **Memory & State** | Cross-user journal exposure or data modification across tenant boundaries. | Critical | Strict Firebase Firestore security rules enforcing owner-bound isolation (`request.auth.uid == userId`) across all subcollections (`journals`, `messages`, `actions`, `insights`). |
| **Inter-System Communication** | Gemini API key exposure in browser network requests or bundle files. | Critical | Zero frontend API key leakage; all Gemini API calls are securely proxied through authenticated server-side endpoints in `server.ts`. |

---

## 🧪 Functional Walkthrough & Test Scenarios

Execute these end-to-end tests to verify all application workflows:

| Scenario | Step / Action | Expected Result |
| :--- | :--- | :--- |
| **1. Authentication** | Click **"Sign In with Google"** (or **"Explore Demo Session"**). | Logs in safely and redirects to the **Bento Grid Dashboard**. |
| **2. New Reflection** | Click **"Start Reflection"** and submit: *"I'm feeling uncertain about my next career move."* | Gemini 3.6 Flash responds with an empathetic reflection; journal title, mood badge (`uncertain`), and `#career` tag are generated and saved to Firestore. |
| **3. Mode Switching** | Switch dropdown to **"Action Plan"** and prompt: *"Give me 3 practical next steps."* | Gemini extracts structured action steps displayed in the Action Items sidebar. |
| **4. Next Steps Board** | Click **"+"** on an extracted action item, then navigate to **"Next Steps"** tab. | Action step appears in the checklist; checking off the item updates Firestore with a completed strikethrough. |
| **5. Search & Filter** | Go to **"History"** tab and type *"career"* or filter by `#Career`. | List instantly filters to matching journal entries with relevance scoring. |
| **6. Longitudinal Insights** | Open **"Insights"** tab and click **"Regenerate Insights"**. | Server synthesizes a holistic reflection narrative and graphs recurring theme frequencies. |
| **7. Privacy Erasure** | Go to **"Settings"**, click **"Delete All My Reflection Data"**, type `DELETE`, and confirm. | Permanently wipes all documents under `users/{uid}` and returns a clean state. |

---

<div align="center">
  <sub>Built with ❤️ using Google Gemini 3.6 Flash, Google Cloud Run, and Cloud Firestore.</sub>
</div>
