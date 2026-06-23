# Google Drive API Integration Setup Guide

Follow these steps to configure your Google Cloud Console credentials for project backups and video synchronization.

---

## 1. Configure Google Cloud Console

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a Project** and select **New Project**. Name it `ATS Video Editor`.
3. In the Left Menu, search for **APIs & Services** and click on **Library**.
4. Search for **Google Drive API**, select it, and click **Enable**.

---

## 2. OAuth Consent Screen Configuration

1. Under **APIs & Services**, go to the **OAuth Consent Screen** tab.
2. Select **External** User Type and click **Create**.
3. Fill in the App Information:
   * **App Name**: `ATS Video Editor`
   * **User Support Email**: Your developer email.
   * **Developer Contact Information**: Your developer email.
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes**:
   * Add the scope: `https://www.googleapis.com/auth/drive.file` (View and manage Google Drive files and folders that you have opened or created with this app).
   * Add the scope: `https://www.googleapis.com/auth/drive.appdata` (View and manage its own configuration data in your Google Drive).
6. Under **Test Users**, add your Google email accounts to allow access during the sandbox state.

---

## 3. Creating API Credentials

### For Android:
1. Navigate to **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
2. Select **Android** as Application Type.
3. Input your package name: `com.ats.videoeditor`.
4. Provide your **SHA-1 Fingerprint** (retrieve this via `cd android && ./gradlew signingReport` on your local environment).
5. Click **Create** and download the generated `google-services.json` config. Place this inside your React Native Android directory at: `mobile/android/app/google-services.json`.

### For Windows Desktop / Backend:
1. Navigate to **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
2. Select **Web Application** as Application Type.
3. Add Redirect URIs:
   * `http://localhost:5000/api/auth/google-callback`
4. Click **Create** and copy the `Client ID` and `Client Secret`.
5. Populate them inside the backend `.env` variables:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```
