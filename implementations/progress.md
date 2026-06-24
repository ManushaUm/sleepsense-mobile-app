# SleepSense Mobile & Auth — Progress Tracker

This document tracks our step-by-step progress during the development of the **SleepSense Mobile Application** (React Native/Expo) and the **FastAPI Backend Authentication** security layer.

---

## Overall Status

```
Component A — Backend Security & JWT Auth   ✅ DONE
Component B — React Native Mobile Skeleton   ✅ DONE
Component C — Authentication Navigation UI   ✅ DONE
Component D — Dashboard Home & Sleep Coach   ✅ DONE
Component E — Diary Logging (EMA & Notes)    ✅ DONE
Component F — Background Sensor Sync (ETL)   ✅ DONE
Component G — Integration & Verification     ✅ DONE
```

---

## Component A — Backend Security & JWT Auth

**Goal:** Extend the FastAPI backend to support secure registration, bcrypt password hashing, and JWT token authentication.

- [x] Add `hashed_password` to `User` database model in `src/db/models.py`
- [x] Create security utility functions (hash/verify passwords, JWT encode/decode) in `app/api/security.py`
- [x] Create registration (`/auth/register`) and login (`/auth/token`) endpoints in `app/api/routers/auth.py`
- [x] Register `auth.router` in `app/api/main.py`
- [x] Restrict predict history and advice endpoints using JWT dependency checks
- [x] Run backend unit tests to verify security controls

---

## Component B — React Native Mobile Skeleton

**Goal:** Scaffold the React Native Expo project, set up folders, configure vector custom fonts, and define the midnight dark theme.

- [x] Initialize Expo app: `npx create-expo-app`
- [x] Install package dependencies (react-navigation, expo-secure-store, expo-sqlite, react-native-svg, axios)
- [x] Create standard directory structure under `src/`
- [x] Create theme styles sheet (`src/theme/colors.js`) with midnight-indigo visual assets
- [x] Verify local app runs successfully on physical phone via Expo Go QR Code scan

---

## Component C — Authentication Navigation UI

**Goal:** Set up secure token storage and write login/signup views.

- [x] Set up secure local storage helpers in `src/database/storage.js` using `expo-secure-store`
- [x] Set up Axios HTTP client in `src/api/client.js` with headers token interceptors
- [x] Create `LoginScreen.js` (switches between Login and Register views)
- [x] Create Navigation structure in `src/navigation/AppNavigator.js` (switches stacks on auth state change)

---

## Component D — Dashboard Home & Sleep Coach

**Goal:** Implement the primary visual screens for displaying predictions and recommendations.

- [x] Create custom sleep score radial gauge widget (`src/components/Gauge.js`) using `react-native-svg`
- [x] Build daily stats dashboard screen (`src/screens/HomeScreen.js`) with progress circles
- [x] Build `AdviceScreen.js` showing prompt-engineered DistilGPT2 coach recommendations
- [x] Integrate SHAP contribution charts illustrating habit impact drivers

---

## Component E — Diary Logging (EMA & Notes)

**Goal:** Build screens for subjective inputs.

- [x] Build daily EMA survey form screen (`src/screens/DiaryScreen.js`) with sliders for stress/mood
- [x] Create notepad text input for the daily search/diary notes
- [x] Bind EMA + notes submission to the prediction endpoint

---

## Component F — Background Sensor Sync (ETL)

**Goal:** Passively aggregate steps, screen-locks, and location geofences on-device and trigger synchronization to the backend.

- [x] Register background sync task in `src/sensors/BackgroundETL.js` using **Expo Task Manager**
- [x] Set up **Expo Background Fetch** to query daily steps (pedometer API) and calculate late-night lock activities
- [x] Build a manual sync button on the settings profile screen as a fail-safe fallback

---

## Component G — Integration & Verification

**Goal:** Verify end-to-end telemetry collections, backend API communications, and user experience flow.

- [x] Test user registration and login flows using physical device
- [x] Verify that daily sensor measurements successfully construct the 42-feature payload
- [x] Verify that recommendations generate and render in real-time under a physical phone
