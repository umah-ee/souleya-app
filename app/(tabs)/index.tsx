import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/auth';

export default function HomeScreen() {
  const { session } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>◯</Text>
        <Text style={styles.logoText}>SOULEYA</Text>
      </View>

      {/* Welcome */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>WILLKOMMEN</Text>
        <Text style={styles.cardTitle}>
          Deine Community{'\n'}für Wachstum
        </Text>
        <Text style={styles.cardText}>
          Der Pulse-Feed und alle weiteren Features{'\n'}
          erscheinen hier beim Launch am 01.07.2026.
        </Text>
      </View>

      {session && (
        <Text style={styles.email}>{session.user.email}</Text>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  logo: {
    fontSize: 28,
    color: '#C8A96E',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 8,
    color: '#C8A96E',
  },
  card: {
    backgroundColor: '#2C2A35',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,169,110,0.1)',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#A8894E',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#D4BC8B',
    letterSpacing: 1,
    lineHeight: 32,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 13,
    color: '#a09a90',
    lineHeight: 22,
    textAlign: 'center',
  },
  email: {
    fontSize: 11,
    color: '#5A5450',
    textAlign: 'center',
    marginTop: 8,
  },
});
