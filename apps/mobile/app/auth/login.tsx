import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import { Flame, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithFirebaseToken, isLoading } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(false);

  // In production, the native Firebase SDK (or GoogleSignIn / Facebook SDK) 
  // returns the federated ID token from Google/Facebook.
  // We send this ID token to the FastAPI backend which verifies it using Firebase Admin SDK.
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      // Mocking the native client token exchange for the dev environment
      const mockFirebaseIdToken = "google-oauth-token-sathish-12345";
      const success = await loginWithFirebaseToken(mockFirebaseIdToken);
      if (success) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Authentication Failed", "Could not verify Google account with server.");
      }
    } catch (err: any) {
      Alert.alert("Sign In Error", err.message || "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setAuthLoading(true);
    try {
      const mockFirebaseIdToken = "facebook-oauth-token-sathish-12345";
      const success = await loginWithFirebaseToken(mockFirebaseIdToken);
      if (success) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Authentication Failed", "Could not verify Facebook account with server.");
      }
    } catch (err: any) {
      Alert.alert("Sign In Error", err.message || "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Flame color="#f59e0b" size={54} />
        <Text style={styles.title}>Clashiq</Text>
        <Text style={styles.subtitle}>COMPETITIVE TOURNAMENT PLATFORM</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHeading}>PLAYER LOGIN</Text>
        <Text style={styles.desc}>
          Sign in using your federated account. Your credentials and gaming identity will sync directly to the authoritative platform ledger.
        </Text>

        <TouchableOpacity 
          style={styles.googleBtn} 
          onPress={handleGoogleSignIn}
          disabled={authLoading}
        >
          <Text style={styles.googleText}>CONTINUE WITH GOOGLE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.facebookBtn} 
          onPress={handleFacebookSignIn}
          disabled={authLoading}
        >
          <Text style={styles.facebookText}>CONTINUE WITH FACEBOOK</Text>
        </TouchableOpacity>

        {authLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#f59e0b" />
            <Text style={styles.loadingText}>Verifying token with FastAPI backend...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <ShieldCheck color="#10b981" size={16} />
        <Text style={styles.footerText}>
          Authoritative server verification • AES-256 Room Cryptography
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b", padding: 24, justifyContent: "space-between" },
  header: { alignItems: "center", marginTop: 40 },
  title: { color: "#ffffff", fontSize: 26, fontWeight: "900", letterSpacing: 1, marginTop: 8 },
  subtitle: { color: "#f59e0b", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 2 },
  content: { gap: 14 },
  sectionHeading: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  desc: { color: "#a1a1aa", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  googleBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  googleText: { color: "#000000", fontSize: 13, fontWeight: "900" },
  facebookBtn: {
    backgroundColor: "#1877f2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  facebookText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  loadingText: { color: "#f59e0b", fontSize: 11 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 },
  footerText: { color: "#71717a", fontSize: 10 },
});
