# SleepSense Mobile App 🌙

SleepSense is a premium, developer-friendly React Native mobile application built on **Expo SDK 54**. It serves as an empathetic sleep tracking and coaching companion, passively collecting device telemetry (step counts, screen usage, and calendar commitments) alongside daily user-logged mood, stress, and sleep journals to predict nightly sleep quality and deliver personalized, AI-driven coaching recommendations.

---

## 🚀 Key Features

* **Empathetic Sleep Predictions**: Predicts nightly sleep score (0–100%) and sleep quality label (*Excellent Rest*, *Good Rest*, *Restless Sleep*, *Poor Sleep*) using an XGBoost model hosted on GCP.
* **Native Google Sign-In**: Fully native OAuth login flow using the Google SDK (`@react-native-google-signin/google-signin`) for a seamless, browser-free experience.
* **Passive Telemetry Gathering**:
  * **Steps & Active Minutes**: Tracked using hardware accelerometer sensors (`expo-sensors` Pedometer).
  * **Screen Time**: Tracked using native Android `UsageStatsManager` to record late-night and evening app usage.
  * **Commitment Sync**: Syncs with Google Calendar to query tomorrow's early commitments and high-stress events.
* **Bespoke UI Design**:
  * Rich dark-theme design with interactive radial gauge animations and dynamic metrics badges.
  * Easy-to-use Sleep Diary logging (`Log My Day & View Prediction`).
  * Pull-to-Refresh sync directly integrated into the Dashboard and Advice tabs.
* **Bespoke Bedtime Push Notifications**:
  * **Target Bedtime Wind-down Alert**: Calculated dynamically from tomorrow's earliest morning calendar event (bedtime = event start - 8h - 15m buffer). Schedules an alert 30 minutes prior.
  * **High-Stress Warning**: Alerts you at 8:30 PM if an exam, test, or interview is detected tomorrow.
  * **Sleep Debt Alert**: Alerts you at 9:30 PM if your predicted sleep score falls below threshold.

---

## 🛠️ Technology Stack

* **Framework**: React Native with Expo (SDK 54)
* **Auth**: Native Google SDK (`@react-native-google-signin/google-signin`)
* **State & Local DB**: `expo-secure-store`, `expo-sqlite`
* **Networking**: Axios (connecting to FastAPI deployed on GCP Cloud Run)
* **Design & Theme**: Custom Vanilla CSS Stylesheets with vibrant HSL dark-mode styling

---

## 🏃 Getting Started & Local Development

### Prerequisites
Make sure you have Node.js and the Expo CLI installed. Since the app uses native modules (Google Sign-In), standard **Expo Go** will not work directly for development. Instead, you'll run a **Custom Development Client**.

### Step 1: Install Dependencies
Navigate to the mobile app directory and run:
```bash
npm install
```

### Step 2: Build the Development Client (Remotely on Expo's Servers)
You do **not** need Android Studio or Gradle installed locally. You can build the developer app remotely:
```bash
eas build -p android --profile development
```
*Once the build finishes, scan the QR code or download the resulting `.apk` file onto your Android device/emulator.*

### Step 3: Run the Local Metro Server
Start the Metro bundler to serve your JavaScript updates:
```bash
npx expo start
```
*Open the installed developer build app on your phone and scan the Metro server QR code to connect and run your live code with full hot-reloading.*

---

## 🔐 Google Cloud Console Credentials Configuration

To configure Google Authentication and avoid the **"Error 403: access_denied"** block page, ensure your settings match the following checklist:

### 1. OAuth Consent Screen
1. Go to the **Google Cloud Console** ➔ **APIs & Services** ➔ **OAuth consent screen**.
2. Set Publishing Status to **Testing**.
3. Scroll to the **Test Users** section, click **+ ADD USERS**, and add your Google account (e.g. `manushau.official@gmail.com`). *Google blocks any accounts not on this list.*

### 2. Client ID Registration
In your **Credentials** tab, make sure you have the following Client IDs created:
* **Web application client ID**: Used for resolving ID tokens on the backend database.
* **Android client ID**: Match it with your package name `com.manushau.sleepsense` and register the SHA-1 signing fingerprint retrieved from your EAS credentials (`eas credentials -p android`).

---

## 📦 Production Builds (Standalone APK)

To build a standalone production release `.apk` for installation:
```bash
eas build -p android --profile preview
```
This compiles a standalone build containing the production backend configuration pointing directly to your live hosted Cloud Run API (`https://sleepsense-api-656306996421.us-central1.run.app`).
