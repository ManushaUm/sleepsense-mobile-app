# SleepSense Mobile — Implementation Plan (with Backend Authentication)

This document outlines the implementation plan for the **SleepSense Mobile Application** (React Native/Expo) and the required **FastAPI Backend Authentication extensions**. 

---

## Goal Description
Build a secure, cross-platform mobile frontend that collects daytime sensing data passively and provides sleep quality predictions. Since the backend currently lacks security validation, this plan includes adding a complete user registration, password hashing, and JWT token issuance layer to the FastAPI backend.

---

## User Review Required

> [!IMPORTANT]
> **Database Schema Migration**: To support authentication, we will add a `hashed_password` column to the `users` table in SQLite. Existing users will be updated with a default password or created anew during sign-up.

---

## Proposed Project Directory Structure

```
SleepSense/                      (Existing Backend Repo)
├── app/
│   ├── api/
│   │   ├── routers/
│   │   │   └── auth.py          ← [NEW] User registration & JWT login routes
│   │   └── security.py          ← [NEW] Hashing & JWT token handlers
│   └── ...
│
SleepSense-mobile-app/           (New Mobile Repo)
├── implementations/
│   ├── implementation_plan.md   ← This plan
│   └── progress.md              ← Live progress tracker
├── assets/                      Custom fonts (Outfit, Inter), vector images
├── src/
│   ├── api/
│   │   └── client.js            Axios HTTP client with JWT interceptors
│   ├── components/
│   │   ├── Gauge.js             Sleep score SVG radial gauge
│   │   ├── MetricCard.js        Active stats displays
│   │   └── AdviceCard.js        SHAP advice cards
│   ├── database/
│   │   └── storage.js           Key Store token access & local SQLite cache
│   ├── navigation/
│   │   └── AppNavigator.js      React Navigation (Auth stack vs Home tabs)
│   ├── screens/
│   │   ├── LoginScreen.js       User sign-up & log-in views
│   │   ├── HomeScreen.js        Dashboard sleep scores & progress rings
│   │   ├── AnalyticsScreen.js   Predicted vs actual trend charts
│   │   ├── AdviceScreen.js      SHAP explanation and recommendations
│   │   ├── DiaryScreen.js       Daily EMA input (sliders & notes text)
│   │   └── ProfileScreen.js     Static survey settings (PSQI)
│   ├── sensors/
│   │   └── BackgroundETL.js     Expo background fetch tasks manager
│   └── theme/
│       └── colors.js            Indigo dark mode colors
```

---

## Proposed Changes & Components

### Component A: Backend Security & Authentication

#### 1. Security Utilities (`app/api/security.py`) [NEW]
- Implement password hashing and verification using `passlib` with `bcrypt`.
- Implement JWT token encoding and decoding using `python-jose`.

#### 2. Authentication Router (`app/api/routers/auth.py`) [NEW]
- **`POST /auth/register`**: Registers a user with a hashed password, inserting them into the database.
- **`POST /auth/token`**: Authenticates user credentials and returns a signed access token.

#### 3. Database Schema Extension (`src/db/models.py`) [MODIFY]
- Add `hashed_password` (String) column to the `User` model.

---

### Component B: Mobile Frontend Application

#### 1. Mobile Authentication Navigation (`src/navigation/AppNavigator.js`)
- Switch navigation stacks automatically based on the user's authentication state (show the `AuthStack` for login/signup, and the `AppStack` when the JWT is resolved).

#### 2. Secure Local Cache (`src/database/storage.js`)
- Cache JWT tokens locally using `expo-secure-store`.
- Maintain a local SQLite DB (`expo-sqlite`) to cache offline daily sensor logs.

#### 3. Custom Dashboard UI (`src/screens/HomeScreen.js` & `src/components/Gauge.js`)
- Design a high-fidelity Midnight-Indigo dashboard layout.
- Render a custom SVG circular gauge mapping score outputs dynamically.

#### 4. Background Sensor aggregation (`src/sensors/BackgroundETL.js`)
- Set up **Expo Task Manager** to register screen-unlock counts, steps (pedometer), and geofence locations in the background.
- Trigger daily uploads to `/predict` at 10 PM.

---

## Verification Plan

### Automated Tests
- Run test suite inside the backend using pytest to verify user sign-up, login, and JWT-authenticated prediction routes.

### Manual Verification
- Launch the React Native app in **Expo Go** on a physical device.
- Perform registration and verify that the user profile and hashed credentials populate correctly in the backend SQLite database.
- Confirm dashboard screens refresh dynamically upon successful login.
