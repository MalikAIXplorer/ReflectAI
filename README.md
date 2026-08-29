# ReflectAI — Private AI Journal & Reflection Companion

A production-minded, user-authenticated web application engineered for private journaling, multi-turn AI reflection with Gemini, longitudinal theme discovery, and automated action plan extraction.

---

## 🌟 Key Features

1. **Strict User Data Isolation**: Built on Google Cloud Firestore with owner-bound security rules (`request.auth.uid == userId`) ensuring cross-user data leakage is impossible at the database layer.
2. **5 Gemini Reflection Modes**:
   - **Reflect**: Empathetic, grounded companion posing gentle introspective questions.
   - **Summarize**: Concise, compassionate synthesis of core emotions and dilemmas.
   - **Brainstorm**: 3–4 creative perspectives, reframing techniques, and options.
   - **Action Plan**: Practical, bite-sized next steps with clear completion criteria.
   - **Find Patterns**: Longitudinal cognitive theme and emotional loop discovery.
3. **Structured AI Extraction**: Validates and extracts `mood`, `themes`, `summary`, and `actionItems` into typed documents.
4. **Natural Language Search**: Quickly locate past thoughts (e.g., *"When did I talk about interview anxiety?"*) using relevance scoring.
5. **Reflection Snapshot & Longitudinal Insights**: Synthesizes periodic AI narratives and tracks theme frequencies over time.
6. **Privacy & Data Erasure**: Complete, one-click user data wipe with explicit verification.

---

## 🏗️ Architecture Overview

```
[ Browser Client (React / Vite) ]
               │
               ├─ Google Sign-In (Firebase Auth SDK)
               │
               ▼ Bearer ID Token (HTTPS)
[ Cloud Run Service (Express / Node.js Runtime) ]
               │
               ├─ Server-side Token Verification (Firebase Admin)
               │
       ┌───────┴───────────────────┐
       ▼                           ▼
[ Cloud Firestore ]        [ Gemini 3.6 Flash API ]
  - users/{uid}/journals     (via Secret Manager / env)
  - users/{uid}/messages
  - users/{uid}/actions
  - users/{uid}/insights
```

---

## 🔒 Firestore Security Rules

Deploy the following owner-bound rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

## 🔑 Secret Manager Setup

Store your Gemini API key in Google Secret Manager and grant Cloud Run access:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 💻 Local Development

### 1. Prerequisites
- Node.js 20+
- Firebase project with Firestore and Google Authentication enabled

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

```env
GEMINI_API_KEY="YOUR_API_KEY"
GEMINI_MODEL="gemini-3.6-flash"
PORT=3000
```

### 3. Run Development Server
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🚀 Google Cloud Run Deployment

Deploy the containerized service directly using `gcloud run deploy`:

```bash
# 1. Build and deploy to Cloud Run
gcloud run deploy reflectai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="GEMINI_MODEL=gemini-3.6-flash,NODE_ENV=production"

# 2. Apply campaign verification label
gcloud run services update reflectai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region us-central1
```

---

## 🧪 Functional Walkthrough & Test Script

| Step | Interaction | Expected Outcome |
| :--- | :--- | :--- |
| **1. Sign-In** | Click "Continue with Google" | Authenticates user via Firebase popup and redirects to Dashboard. |
| **2. Reflection** | Click "Start New Reflection" and enter: *"I'm worried about my upcoming job interviews."* | Creates a new journal under `users/{uid}/journals`, generates a title, and streams Gemini's empathetic reflection. |
| **3. Action Plan** | Switch mode to **Action Plan** and type: *"Turn this into an action plan."* | Generates 2–4 practical steps and saves them to `users/{uid}/actions`. |
| **4. Next Steps** | Go to **Next Steps** tab and toggle checkbox on a step. | Updates completion status in Firestore with `completed: true`. |
| **5. Search** | Go to **Reflections** tab and search *"interview anxiety"*. | Natural language search filters relevant reflections with score ranking. |
| **6. Insights** | Open **Insights** tab. | Shows recurring theme frequency (`#Career`, `#Interviews`) and weekly AI narrative. |
| **7. Data Erasure** | Go to **Settings**, type `DELETE`, and confirm. | Deletes all records under `users/{uid}` without affecting any other users. |
