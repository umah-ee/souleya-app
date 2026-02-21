import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Souleya</Text>
      <Text style={styles.sub}>Community für Wachstum</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C2A35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#C8A96E',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  sub: {
    fontSize: 12,
    color: '#a09a90',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },
});
