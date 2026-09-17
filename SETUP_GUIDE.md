# Complete Setup Guide: Firebase, Facebook Login, Razorpay & System Deployment

This guide explains how to configure and deploy the **IGNITE FF** competitive gaming platform.

---

## 1. Firebase Authentication Setup (Google & Facebook)

The platform uses **Firebase Authentication** on client devices to obtain an ID token, which is authoritatively verified on the FastAPI backend using `firebase-admin`.

### A. Create Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g. `ignite-ff-prod`).
3. Enable Google Analytics (optional) and create the project.

### B. Add Android Application
1. In Project Settings, under **Your apps**, click the **Android** icon.
2. Enter the Android package name: `com.igniteff.tournament` (matching `apps/mobile/app.json`).
3. **Important**: Add your **SHA-1** and **SHA-256** fingerprint.
   - For debug keystore:
     ```bash
     cd android && ./gradlew signingReport
     # Or using keytool:
     keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
     ```
4. Download `google-services.json` and place it in `apps/mobile/` (or `android/app/`).

### C. Enable Sign-in Providers
1. In the Firebase console sidebar, go to **Build** → **Authentication** → **Sign-in method**.
2. **Google**:
   - Click **Google** → Toggle **Enable**.
   - Choose your support email and click **Save**.
3. **Facebook**:
   - Click **Facebook** → Toggle **Enable**.
   - You will need the **App ID** and **App Secret** from Meta for Developers (see Step 2 below).
   - Copy the **OAuth redirect URI** provided by Firebase (e.g., `https://ignite-ff-prod.firebaseapp.com/__/auth/handler`).

### D. Generate Backend Admin SDK Service Account Key
1. Go to **Project Settings** (gear icon) → **Service accounts**.
2. Ensure **Firebase Admin SDK** is selected.
3. Click **Generate new private key** and confirm.
4. Open the downloaded JSON file and extract the values for your `backend/.env`:
   ```env
   FIREBASE_PROJECT_ID=ignite-ff-prod
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ignite-ff-prod.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

---

## 2. Meta (Facebook) Developer App Setup

1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Click **My Apps** → **Create App**.
3. Select **Consumer** (or **Authenticate and request data from users with Facebook Login**).
4. Enter Display Name: `IGNITE FF`.
5. Under **Add a product**, find **Facebook Login** and click **Set up**.
6. Select **Web** and add your domain (e.g. `https://free-fire-game-rose.vercel.app` or `https://ignite-ff-prod.firebaseapp.com`).
7. In the left menu, go to **Facebook Login** → **Settings**:
   - Paste the **OAuth redirect URI** copied from Firebase into **Valid OAuth Redirect URIs**:
     ```
     https://<YOUR-FIREBASE-PROJECT-ID>.firebaseapp.com/__/auth/handler
     ```
   - Save changes.
8. In the left menu, go to **App Settings** → **Basic**:
   - Copy the **App ID** and **App Secret**.
   - Enter these into Firebase Console (Facebook provider) and in your backend `.env`:
     ```env
     FACEBOOK_APP_ID=<your-app-id>
     FACEBOOK_APP_SECRET=<your-app-secret>
     ```

---

## 3. Razorpay Payment Gateway Setup

### A. Obtain API Test Keys
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Go to **Account & Settings** → **API Keys** (under *Developer Controls*).
3. Click **Generate Test Key**.
4. Copy the **Key ID** and **Key Secret** into your backend `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
   ```

### B. Configure Webhooks
1. Go to **Account & Settings** → **Webhooks**.
2. Click **Add New Webhook**.
3. Webhook URL: `https://<your-backend-domain>/api/v1/payments/webhook`
4. Secret: Enter a strong random string and copy it to `RAZORPAY_WEBHOOK_SECRET` in `.env`.
5. Select active events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
6. Click **Create Webhook**.

---

## 4. PostgreSQL / Supabase Setup

1. In your [Supabase Dashboard](https://supabase.com/dashboard), create a new project.
2. Go to **Settings** → **Database** → **Connection string**.
3. Select **URI** (or Transaction Pooler mode on port `6543`).
4. Copy the URI and configure in `backend/.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?ssl=require
   ```
5. Run migrations:
   ```bash
   cd backend
   .\venv\Scripts\activate
   alembic upgrade head
   python seed.py
   ```

---

## 5. Running the Complete System Locally

### Backend & Scheduler Worker
```bash
# Terminal 1: FastAPI Core Server
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Autonomous Match Tracker Worker
cd backend
.\venv\Scripts\activate
python -m app.workers.scheduler
```

### Admin Web Panel & Marketing Portal
```bash
# Terminal 3: Web Portal (Admin Dashboard & Landing)
cd frontend
npm run dev
# Open http://localhost:3000 (Admin at http://localhost:3000/admin/dashboard)
```

### Player Mobile App
```bash
# Terminal 4: Expo Mobile App
cd apps/mobile
npm install
npx expo start
# Press 'a' for Android Emulator or scan QR with Expo Go app
```

---

## 6. Building the Android APK (Production & Testing)

To generate a standalone APK for testing without Expo Go:
```bash
cd apps/mobile
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure build
eas build:configure

# Build standalone Android APK
eas build --platform android --profile preview
```
Download the resulting `.apk` file and upload it to your web server / CDN for the public marketing site CTA (`apps/website` or `frontend/public`).
