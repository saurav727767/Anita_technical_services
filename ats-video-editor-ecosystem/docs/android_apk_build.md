# Android APK Build Instructions

Follow this guide to compile and export a standalone release APK for Android devices.

---

## 1. Prerequisites
Ensure you have the following packages installed on your development host:
* **Java Development Kit (JDK)**: OpenJDK 11 or higher.
* **Android SDK**: Install SDK Platform 33 and Android Build Tools.
* **Node.js**: Version 18 or above.

---

## 2. Generating Signing Keystore
Run the following command in terminal to generate a secure release keystore:
```bash
keytool -genkeypair -v -storetype keystore -keyalg RSA -keysize 2048 -validity 10000 -keystore my-upload-key.keystore -alias my-key-alias
```
Place the generated `my-upload-key.keystore` file in the `mobile/android/app` directory.

---

## 3. Configuring gradle.properties
Modify `mobile/android/gradle.properties` to map keystore variables:
```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=***
MYAPP_UPLOAD_KEY_PASSWORD=***
```

---

## 4. Run Build Commands
Execute the assembly task inside the Android wrapper:
```bash
# Navigate to mobile project folder
cd mobile

# Install javascript dependencies
npm install

# Run the release build commands
cd android
./gradlew assembleRelease
```

The resulting optimized `.apk` file will be generated at:
`mobile/android/app/build/outputs/apk/release/app-release.apk`
