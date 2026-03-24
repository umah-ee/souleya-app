import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';

const OTP_LENGTH = 8;

type LoginMode = 'choose' | 'otp-verify' | 'password';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>('choose');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ── Apple Sign-In ──
  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const AppleAuthentication = (await import('expo-apple-authentication')).default;
      const Crypto = await import('expo-crypto');

      const rawNonce = Math.random().toString(36).substring(2, 34);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });
        if (error) {
          Alert.alert('Das hat leider nicht geklappt', error.message);
        }
      }
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Login fehlgeschlagen', 'Versuch es gerne nochmal.');
      }
    }
    setLoading(false);
  };

  // ── OTP senden ──
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('E-Mail fehlt', 'Bitte gib deine E-Mail-Adresse ein.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      Alert.alert('Das hat leider nicht geklappt', error.message);
    } else {
      setMode('otp-verify');
      setOtp(Array(OTP_LENGTH).fill(''));
    }
    setLoading(false);
  };

  // ── OTP eingeben ──
  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newOtp = Array(OTP_LENGTH).fill('');
      digits.split('').forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      if (digits.length === OTP_LENGTH) {
        verifyOtp(newOtp.join(''));
      } else {
        inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      }
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    const code = newOtp.join('');
    if (code.length === OTP_LENGTH && !newOtp.includes('')) {
      verifyOtp(code);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const verifyOtp = async (code: string) => {
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    });
    if (error) {
      Alert.alert('Code nicht korrekt', 'Der Code war leider nicht richtig. Probier es nochmal.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
    setVerifying(false);
  };

  // ── Passwort Login ──
  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehlt was', 'Bitte gib E-Mail und Passwort ein.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (error) {
      Alert.alert('Login fehlgeschlagen', 'E-Mail oder Passwort stimmt nicht. Probier es nochmal.');
    }
    setLoading(false);
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      Alert.alert('Das hat leider nicht geklappt', error.message);
    } else {
      Alert.alert('Neuer Code', 'Wir haben dir einen neuen Code gesendet.');
      setOtp(Array(OTP_LENGTH).fill(''));
    }
    setLoading(false);
  };

  const resetToChoose = () => {
    setMode('choose');
    setOtp(Array(OTP_LENGTH).fill(''));
    setPassword('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Enso Logo */}
          <Text style={styles.enso}>◯</Text>
          <Text style={styles.wordmark}>SOULEYA</Text>

          {/* ════════════════════════════════════════ */}
          {/* Hauptansicht: Apple + E-Mail Optionen    */}
          {/* ════════════════════════════════════════ */}
          {mode === 'choose' && (
            <>
              {/* Apple Sign-In — primaer, ganz oben */}
              {Platform.OS === 'ios' && (
                <>
                  <TouchableOpacity
                    style={[styles.appleButton, loading && styles.buttonDisabled]}
                    onPress={handleAppleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Icon name="brand-apple" size={20} color="#F0EDE8" />
                    <Text style={styles.appleButtonText}>MIT APPLE FORTFAHREN</Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>oder</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

              {/* E-Mail Eingabe */}
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-Mail-Adresse"
                placeholderTextColor="#5A5450"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />

              {/* Code per E-Mail — sekundaer */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#2C2A35" />
                ) : (
                  <Text style={styles.buttonText}>CODE PER E-MAIL</Text>
                )}
              </TouchableOpacity>

              {/* Passwort-Option */}
              <TouchableOpacity
                style={styles.textLink}
                onPress={() => setMode('password')}
              >
                <Text style={styles.textLinkLabel}>Mit Passwort anmelden</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                Kein Account? Wird automatisch erstellt.
              </Text>
            </>
          )}

          {/* ════════════════════════════════════════ */}
          {/* Passwort-Modus                           */}
          {/* ════════════════════════════════════════ */}
          {mode === 'password' && (
            <>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-Mail-Adresse"
                placeholderTextColor="#5A5450"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Passwort"
                  placeholderTextColor="#5A5450"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color="#5A5450"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#2C2A35" />
                ) : (
                  <Text style={styles.buttonText}>ANMELDEN</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={resetToChoose}>
                <Text style={styles.textLinkLabel}>← Zurück</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ════════════════════════════════════════ */}
          {/* OTP Verify                               */}
          {/* ════════════════════════════════════════ */}
          {mode === 'otp-verify' && (
            <>
              <View style={{ marginBottom: 12 }}>
                <Icon name="mail" size={32} color="#C8A96E" />
              </View>
              <Text style={styles.label}>CODE EINGEBEN</Text>
              <Text style={styles.successText}>
                Wir haben einen 8-stelligen Code an{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
                {'\n'}gesendet.
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {verifying && (
                <ActivityIndicator color="#C8A96E" style={{ marginBottom: 16 }} />
              )}

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResend}
                disabled={loading}
              >
                <Text style={styles.resendText}>
                  {loading ? 'Wird gesendet …' : 'Code erneut senden'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={resetToChoose}>
                <Text style={styles.backButtonText}>ANDERE E-MAIL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18161F',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#2C2A35',
    borderRadius: 24,
    padding: 40,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.15)',
  },
  enso: {
    fontSize: 48,
    color: '#C8A96E',
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 10,
    color: '#C8A96E',
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    letterSpacing: 4,
    color: '#a09a90',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 8,
    color: '#F0EDE8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Apple Button — primaer, gross, oben
  appleButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 999,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  appleButtonText: {
    fontSize: 13,
    letterSpacing: 2,
    color: '#F0EDE8',
    fontWeight: '600',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(200,169,110,0.15)',
  },
  dividerText: {
    fontSize: 11,
    color: '#5A5450',
    marginHorizontal: 16,
  },

  // Gold CTA Button
  button: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#C8A96E',
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#2C2A35',
    fontWeight: '600',
  },

  // Text-Links
  textLink: {
    marginBottom: 20,
  },
  textLinkLabel: {
    fontSize: 12,
    color: '#C8A96E',
  },

  hint: {
    fontSize: 11,
    color: '#5A5450',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Passwort
  passwordContainer: {
    width: '100%',
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },

  // OTP
  successText: {
    fontSize: 13,
    color: '#a09a90',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emailHighlight: {
    color: '#D4BC8B',
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  otpInput: {
    width: 36,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
    borderRadius: 4,
    color: '#F0EDE8',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#C8A96E',
    backgroundColor: 'rgba(200,169,110,0.08)',
  },
  resendButton: {
    marginBottom: 16,
  },
  resendText: {
    fontSize: 12,
    color: '#C8A96E',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.3)',
    borderRadius: 999,
  },
  backButtonText: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#C8A96E',
  },
});
