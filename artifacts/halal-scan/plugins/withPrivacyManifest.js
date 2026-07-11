/**
 * Expo config plugin — injects Apple Privacy Manifest (PrivacyInfo.xcprivacy)
 * Required for App Store submission (Spring 2024+).
 *
 * HalalScan accesses:
 *  - UserDefaults (CA92.1) — expo-sqlite preferences
 *  - FileTimestamp (C617.1) — database file timestamps
 *  - No tracking, no ads, no third-party analytics
 */
const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;

module.exports = function withPrivacyManifest(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const iosDir = path.join(config.modRequest.platformProjectRoot);
      const appDir = path.join(iosDir, config.modRequest.projectName ?? "HalalScan");
      const manifestPath = path.join(appDir, "PrivacyInfo.xcprivacy");

      try {
        fs.mkdirSync(appDir, { recursive: true });
        fs.writeFileSync(manifestPath, PRIVACY_MANIFEST, "utf8");
        console.log("[withPrivacyManifest] PrivacyInfo.xcprivacy written to", manifestPath);
      } catch (e) {
        console.warn("[withPrivacyManifest] Could not write privacy manifest:", e.message);
      }

      return config;
    },
  ]);
};
