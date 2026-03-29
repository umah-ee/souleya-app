/**
 * Expo Config Plugin für react-native-callkeep
 * Fügt die notwendige Mikrofon-Berechtigung hinzu.
 * Hinweis: com.apple.developer.pushkit.services ist kein valides Entitlement
 * und darf nicht manuell gesetzt werden – PushKit läuft über den voip Background Mode.
 */
const { withInfoPlist } = require('@expo/config-plugins');

const withCallKeep = (config) => {
  // Mikrofon-Berechtigung sicherstellen (falls noch nicht vorhanden)
  config = withInfoPlist(config, (mod) => {
    if (!mod.modResults['NSMicrophoneUsageDescription']) {
      mod.modResults['NSMicrophoneUsageDescription'] =
        'Souleya benötigt das Mikrofon für Audio- und Videogespräche.';
    }
    return mod;
  });

  return config;
};

module.exports = withCallKeep;
