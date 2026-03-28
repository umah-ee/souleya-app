/**
 * Expo Config Plugin für react-native-callkeep
 * Fügt das notwendige PushKit VoIP Entitlement hinzu.
 */
const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const withCallKeep = (config) => {
  // PushKit VoIP Entitlement hinzufügen
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.pushkit.services'] = ['voip'];
    return mod;
  });

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
