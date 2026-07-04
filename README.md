# SleepSense AI - Mobile Client (React Native & Expo)

**SleepSense AI** is a highly personalized, privacy-first sleep coaching application. This repository contains the front-end mobile application built using React Native and Expo. 

The mobile app serves as the data collection and user interface layer. It securely logs into Google to retrieve the user's upcoming calendar events and passively tracks on-device telemetry (such as screen time, step counts, and ambient noise). All sensitive data is aggregated locally on the device before being sent to the FastAPI backend as a single, privacy-preserving JSON payload.

## 📱 Features
*   **Google OAuth 2.0 Integration**: Secure login that ties users to their Google Calendar.
*   **Passive Telemetry Collection**: Extracts daily behavioral features seamlessly in the background.
*   **EMA Sleep Diary**: A quick, daily user-input form for logging stress, mood, and sleep quality.
*   **Dynamic AI Coach Dashboard**: Visualizes the XGBoost sleep prediction score, SHAP explainability metrics, and actionable 3-slot AI coaching advice.

## 🛠️ Tech Stack
*   **Framework:** React Native, Expo
*   **Native Modules:** `@react-native-google-signin/google-signin`
*   **Networking:** Axios / Fetch API

## 🚀 Setup & Installation

### 1. Install Dependencies
Ensure you have Node.js installed, then run:
```bash
npm install
```

### 2. Configure Android SDK Location (Windows Users)
If you are developing on Windows, you must tell Gradle where your Android SDK is located.
Create a file named `local.properties` inside the `android/` directory and add the following line, replacing `YourUsername` with your actual Windows username:
```properties
sdk.dir=C:/Users/YourUsername/AppData/Local/Android/Sdk
```

### 3. Run the Application
**CRITICAL NOTE**: Because this application relies on a custom native module for Google Sign-In, **it cannot be run using the standard Expo Go app**. You must compile a custom development build.

To build and run the app on an Android emulator or a connected physical device:
```bash
npx expo run:android
```
*(Note: The first time you run this command, Gradle will download the Android NDK and build tools, which may take 10-20 minutes depending on your internet connection).*

## 🔒 Security
No raw data (like exact GPS coordinates or explicit text messages) ever leaves the device. The app computes mathematical features locally (e.g., `stationary_ratio=0.85`) and sends only those numeric features to the backend API.
