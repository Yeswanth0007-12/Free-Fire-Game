import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Flame, Swords, Trophy, Wallet, User } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#09090b", borderBottomColor: "#27272a" },
        headerTintColor: "#f4f4f5",
        tabBarStyle: {
          backgroundColor: "#09090b",
          borderTopColor: "#27272a",
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Flame color={color} size={size} />,
          headerTitle: "IGNITE FF",
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size} />,
          headerTitle: "Tournament Arena",
        }}
      />
      <Tabs.Screen
        name="my-matches"
        options={{
          title: "My Matches",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
          headerTitle: "My Tournaments",
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
          headerTitle: "Fintech Ledger",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          headerTitle: "Player Profile",
        }}
      />
    </Tabs>
  );
}
