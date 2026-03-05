import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/theme';
import { Icon } from '../../components/Icon';

export default function StudioLayout() {
  const colors = useThemeStore((s) => s.colors);
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bgSolid,
        },
        headerTintColor: colors.goldDeep,
        headerTitleStyle: {
          fontSize: 10,
          fontWeight: '400' as const,
        },
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={20} color={colors.goldDeep} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Studio' }} />
      <Stack.Screen name="courses" options={{ title: 'Kurse' }} />
      <Stack.Screen name="calendar" options={{ title: 'Kalender' }} />
      <Stack.Screen name="messages" options={{ title: 'Nachrichten' }} />
      <Stack.Screen name="f2f" options={{ title: 'Face2Face' }} />
    </Stack>
  );
}
