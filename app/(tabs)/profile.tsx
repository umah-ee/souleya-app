import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { session } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFIL</Text>
      </View>

      {/* Avatar placeholder */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>◯</Text>
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ORIGIN SOUL</Text>
        </View>
      </View>

      {/* Profile info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>PROFIL</Text>
        <Text style={styles.comingSoon}>
          Profil-Einstellungen folgen beim Launch 🌱
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>ABMELDEN</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18161F',
  },
  content: {
    padding: 24,
    paddingTop: 64,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 4,
    color: '#A8894E',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: '#2C2A35',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    color: '#C8A96E',
  },
  email: {
    fontSize: 13,
    color: '#a09a90',
    marginBottom: 12,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(200,169,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#D4BC8B',
  },
  card: {
    width: '100%',
    backgroundColor: '#2C2A35',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    marginBottom: 24,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#A8894E',
    marginBottom: 12,
  },
  comingSoon: {
    fontSize: 13,
    color: '#a09a90',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.2)',
  },
  logoutText: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#5A5450',
  },
});
