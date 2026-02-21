import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false, // Only existing users (from waitlist)
      },
    });

    if (error) {
      Alert.alert('Fehler', error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        {/* Enso Logo as text art */}
        <Text style={styles.enso}>◯</Text>

        {/* Wordmark */}
        <Text style={styles.wordmark}>SOULEYA</Text>

        {!sent ? (
          <>
            <Text style={styles.label}>DEIN ZUGANG</Text>

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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#2C2A35" />
              ) : (
                <Text style={styles.buttonText}>MAGIC LINK SENDEN</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Du erhältst einen einmaligen Login-Link.{'\n'}
              Kein Passwort nötig.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successLabel}>MAGIC LINK GESENDET</Text>
            <Text style={styles.successText}>
              Prüfe dein Postfach für{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => { setSent(false); setEmail(''); }}
            >
              <Text style={styles.backButtonText}>ANDERE E-MAIL</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18161F',
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
    borderRadius: 999,
    color: '#F0EDE8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#C8A96E',
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(200,169,110,0.3)',
  },
  buttonText: {
    fontSize: 11,
    letterSpacing: 3,
    color: '#2C2A35',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#5A5450',
    textAlign: 'center',
    lineHeight: 18,
  },
  successIcon: {
    fontSize: 32,
    color: '#52B788',
    marginBottom: 12,
  },
  successLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: '#52B788',
    marginBottom: 16,
  },
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
