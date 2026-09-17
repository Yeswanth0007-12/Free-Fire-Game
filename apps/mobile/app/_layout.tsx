import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 15, // 15 seconds
    },
  },
});

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor="#09090b" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#09090b" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: "#09090b" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: "Player Authentication", headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: "Match Lobby", headerShown: true }} />
        <Stack.Screen name="match/register-slot" options={{ title: "Select Slot & Join", headerShown: true }} />
        <Stack.Screen name="wallet/transaction-detail" options={{ title: "Ledger Record", headerShown: true }} />
      </Stack>
    </QueryClientProvider>
  );
}
