const owner = process.env.EXPO_OWNER || "mytoolsgroup";
const slug = process.env.EXPO_PROJECT_SLUG || "halalscan";
const projectId = process.env.EXPO_PROJECT_ID || "4cf271e1-184b-40a9-82d4-518829206fff";

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "HalalScan",
  slug,
  owner,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "halalscan",
  userInterfaceStyle: "dark",
  backgroundColor: "#0A0F0C",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#0A0F0C",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.halalscan.app",
    infoPlist: {
      NSCameraUsageDescription:
        "HalalScan a besoin de la caméra pour scanner les codes-barres des produits alimentaires.",
      NSSpeechRecognitionUsageDescription:
        "HalalScan utilise la synthèse vocale pour annoncer les résultats.",
    },
  },
  android: {
    package: "com.halalscan.app",
    permissions: [
      "CAMERA",
      "VIBRATE",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#0A0F0C",
    },
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: "https://replit.com/",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "HalalScan a besoin de la caméra pour scanner les codes-barres.",
      },
    ],
    "expo-font",
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId,
    },
  },
};

module.exports = { expo: config };
