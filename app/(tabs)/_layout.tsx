import { Tabs } from 'expo-router';
import { Icon, type IconName } from '../../components/Icon';

function TabBarIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={20} color={color} />;
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
          title: 'Pulse',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Kontakte',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabBarIcon name="message-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
