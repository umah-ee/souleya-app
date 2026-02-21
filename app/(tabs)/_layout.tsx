import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 18,
      opacity: focused ? 1 : 0.4,
    }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1C26',
          borderTopColor: 'rgba(200,169,110,0.1)',
          borderTopWidth: 1,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: '#C8A96E',
        tabBarInactiveTintColor: '#5A5450',
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginTop: -4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon label="◯" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
