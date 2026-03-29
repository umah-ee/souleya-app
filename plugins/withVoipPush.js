/**
 * Expo Config Plugin: VoIP Push + CallKit (Swift)
 *
 * Injiziert Swift-Code in den AppDelegate fuer:
 * 1. RNCallKeep Setup beim App-Start
 * 2. PushKit VoIP Token Registration
 * 3. PushKit Delegate-Methoden (eingehender VoIP Push → CallKit)
 * 4. Mikrofon-Berechtigung
 */
const {
  withAppDelegate,
  withInfoPlist,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ── 1. AppDelegate (Swift) modifizieren ──────────────────────

function withVoipAppDelegate(config) {
  return withAppDelegate(config, (mod) => {
    let contents = mod.modResults.contents;

    // --- Swift Import hinzufuegen ---
    if (!contents.includes('import PushKit')) {
      const importRegex = /^import \w+$/gm;
      let lastImportMatch;
      let match;
      while ((match = importRegex.exec(contents)) !== null) {
        lastImportMatch = match;
      }
      if (lastImportMatch) {
        const insertPos = lastImportMatch.index + lastImportMatch[0].length;
        contents = contents.slice(0, insertPos) + '\nimport PushKit' + contents.slice(insertPos);
      }
    }

    // --- PKPushRegistryDelegate Conformance hinzufuegen ---
    if (!contents.includes('PKPushRegistryDelegate')) {
      contents = contents.replace(
        /class AppDelegate:\s*ExpoAppDelegate\s*\{/,
        'class AppDelegate: ExpoAppDelegate, PKPushRegistryDelegate {'
      );
    }

    // --- Setup-Code in didFinishLaunchingWithOptions ---
    if (!contents.includes('RNCallKeep')) {
      const didFinishPattern = /didFinishLaunchingWithOptions[^{]*\{/;
      const didFinishMatch = contents.match(didFinishPattern);
      if (didFinishMatch) {
        const insertPos = contents.indexOf(didFinishMatch[0]) + didFinishMatch[0].length;
        const setupCode = `

    // ── CallKit + PushKit Setup ──
    RNCallKeep.setup([
      "appName": "Souleya",
      "maximumCallGroups": 1,
      "maximumCallsPerCallGroup": 1,
      "supportsVideo": true,
    ])

    // VoIP Push Token registrieren
    RNVoipPushNotificationManager.voipRegistration()
`;
        contents = contents.slice(0, insertPos) + setupCode + contents.slice(insertPos);
      }
    }

    // --- PushKit Delegate-Methoden in AppDelegate Klasse einfuegen ---
    // Finde das schliessende } der AppDelegate-Klasse (vor "class ReactNativeDelegate")
    if (!contents.includes('didUpdate pushCredentials')) {
      const reactNativeDelegateIndex = contents.indexOf('class ReactNativeDelegate');
      // Falls ReactNativeDelegate existiert, fuege VOR der Klasse ein (= Ende von AppDelegate)
      // Ansonsten suche das letzte }
      let insertPos;
      if (reactNativeDelegateIndex !== -1) {
        // Finde das } vor "class ReactNativeDelegate" — das schliesst AppDelegate
        const beforeReactDelegate = contents.substring(0, reactNativeDelegateIndex);
        insertPos = beforeReactDelegate.lastIndexOf('}');
      } else {
        insertPos = contents.lastIndexOf('}');
      }

      if (insertPos !== -1) {
        const delegateMethods = `

  // MARK: - PushKit (VoIP Push)

  // VoIP Token erhalten
  public func pushRegistry(_ registry: PKPushRegistry,
                           didUpdate pushCredentials: PKPushCredentials,
                           for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdatePushCredentials(pushCredentials, forType: type.rawValue)
  }

  // VoIP Push empfangen → sofort an CallKit melden (iOS 13+ Pflicht)
  public func pushRegistry(_ registry: PKPushRegistry,
                           didReceiveIncomingPushWith payload: PKPushPayload,
                           for type: PKPushType,
                           completion: @escaping () -> Void) {
    let dict = payload.dictionaryPayload
    let uuid = UUID().uuidString
    let callerName = dict["caller_name"] as? String ?? "Eingehender Anruf"
    let handle = dict["caller_id"] as? String ?? "unknown"
    let hasVideo = (dict["is_video"] as? String) == "true"

    RNVoipPushNotificationManager.addCompletionHandler(uuid, completionHandler: completion)
    RNVoipPushNotificationManager.didReceiveIncomingPush(withPayload: payload, forType: type.rawValue)

    RNCallKeep.reportNewIncomingCall(uuid,
                                     handle: handle,
                                     handleType: "generic",
                                     hasVideo: hasVideo,
                                     localizedCallerName: callerName,
                                     supportsHolding: false,
                                     supportsDTMF: false,
                                     supportsGrouping: false,
                                     supportsUngrouping: false,
                                     fromPushKit: true,
                                     payload: dict as? [AnyHashable: Any],
                                     withCompletionHandler: completion)
  }

`;
        contents = contents.slice(0, insertPos) + delegateMethods + contents.slice(insertPos);
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

// ── 2. Info.plist anpassen ───────────────────────────────────

function withVoipInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    if (!mod.modResults['NSMicrophoneUsageDescription']) {
      mod.modResults['NSMicrophoneUsageDescription'] =
        'Souleya benötigt das Mikrofon für Audio- und Videogespräche.';
    }
    return mod;
  });
}

// ── 3. Bridging Header (ObjC-Imports fuer Swift sichtbar machen) ──

function withVoipBridgingHeader(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const appName = mod.modRequest.projectName || 'souleya';

      // Suche nach dem Bridging Header (verschiedene Namensformate)
      const iosDir = path.join(projectRoot, 'ios', appName);
      const possibleNames = [
        `${appName}-Bridging-Header.h`,
        // Expo generiert manchmal mit grossem Anfangsbuchstaben
        `${appName.charAt(0).toUpperCase() + appName.slice(1)}-Bridging-Header.h`,
        'Bridging-Header.h',
      ];

      let bridgingHeaderPath = null;
      for (const name of possibleNames) {
        const candidate = path.join(iosDir, name);
        if (fs.existsSync(candidate)) {
          bridgingHeaderPath = candidate;
          break;
        }
      }

      // Falls kein Bridging Header existiert, alle .h Dateien im iOS-Verzeichnis durchsuchen
      if (!bridgingHeaderPath && fs.existsSync(iosDir)) {
        const files = fs.readdirSync(iosDir);
        const bridging = files.find((f) => f.includes('Bridging-Header'));
        if (bridging) {
          bridgingHeaderPath = path.join(iosDir, bridging);
        }
      }

      if (bridgingHeaderPath) {
        let contents = fs.readFileSync(bridgingHeaderPath, 'utf-8');

        const imports = [
          '#import "RNCallKeep.h"',
          '#import "RNVoipPushNotificationManager.h"',
        ];

        let modified = false;
        for (const imp of imports) {
          if (!contents.includes(imp)) {
            contents += '\n' + imp;
            modified = true;
          }
        }

        if (modified) {
          contents += '\n';
          fs.writeFileSync(bridgingHeaderPath, contents, 'utf-8');
          console.log('[withVoipPush] Bridging Header aktualisiert:', bridgingHeaderPath);
        }
      } else {
        console.warn('[withVoipPush] Kein Bridging Header gefunden in:', iosDir);
      }

      return mod;
    },
  ]);
}

// ── 4. Header Search Paths (damit Xcode die .h Dateien findet) ──
// Nutzt withXcodeProject statt withDangerousMod, da andere Plugins (z.B.
// @config-plugins/react-native-callkeep) ebenfalls withXcodeProject verwenden
// und die pbxproj in-memory modifizieren — withDangerousMod wuerde ueberschrieben.

function withVoipHeaderSearchPaths(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const voipHeaderPath = '"$(SRCROOT)/../node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification"';

    // Alle Build-Konfigurationen durchgehen
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const buildConfig = configs[key];
      if (typeof buildConfig !== 'object' || !buildConfig.buildSettings) continue;

      const settings = buildConfig.buildSettings;
      // Nur App-Target Konfigurationen (nicht Pods)
      if (!settings.INFOPLIST_FILE && !settings.PRODUCT_BUNDLE_IDENTIFIER) continue;

      if (!settings.HEADER_SEARCH_PATHS) {
        settings.HEADER_SEARCH_PATHS = ['$(inherited)', voipHeaderPath];
      } else if (Array.isArray(settings.HEADER_SEARCH_PATHS)) {
        if (!settings.HEADER_SEARCH_PATHS.some((p) => p.includes('react-native-voip-push-notification'))) {
          settings.HEADER_SEARCH_PATHS.push(voipHeaderPath);
        }
      }
    }

    console.log('[withVoipPush] Header Search Paths via withXcodeProject aktualisiert');
    return mod;
  });
}

// ── Haupt-Plugin ─────────────────────────────────────────────

const withVoipPush = (config) => {
  config = withVoipAppDelegate(config);
  config = withVoipInfoPlist(config);
  config = withVoipBridgingHeader(config);
  config = withVoipHeaderSearchPaths(config);
  return config;
};

module.exports = withVoipPush;
