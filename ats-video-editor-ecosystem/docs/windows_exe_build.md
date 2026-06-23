# Windows EXE Build Instructions

Follow this guide to compile and package the desktop workspace into a standalone Windows installer (.exe).

---

## 1. Local Prerequisites
Ensure you have:
* **Node.js**: Version 18.0.0 or higher.
* **C++ Compiler**: Build tools for Windows (e.g. Visual Studio Build Tools) if building native node extensions.
* **FFmpeg binaries**: Place `ffmpeg.exe` inside `desktop/bin/ffmpeg.exe` to bundle it for local media rendering.

---

## 2. Setting Up JS and Asset Dependencies
Navigate to the desktop directory and compile the React bundle:
```bash
cd desktop

# Install packages
npm install

# Compile the React build files
npm run react-build
```

---

## 3. Package the Executable
Package the Electron wrapper using `electron-builder`:
```bash
# Package into Windows NSIS installer
npx electron-builder --win nsis
```

The compiled setup files and portable executables will be output directly to:
`desktop/dist/ATS Video Editor Setup 1.0.0.exe`
