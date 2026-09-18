import React from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import { Flame, ShieldCheck, Zap, AlertCircle } from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { 
    loginWithGoogle, 
    loginWithFacebook, 
    loginAsGuest, 
    authStatus, 
    authError, 
    activeProvider, 
    clearAuthError 
  } = useAuthStore();

  const isAuthenticating = authStatus === "AUTHENTICATING";

  const handleGoogleSignIn = async () => {
    clearAuthError();
    const res = await loginWithGoogle();
    if (res.success) {
      router.replace("/(tabs)");
    }
  };

  const handleFacebookSignIn = async () => {
    clearAuthError();
    const res = await loginWithFacebook();
    if (res.success) {
      router.replace("/(tabs)");
    }
  };

  const handleGuestSignIn = async () => {
    clearAuthError();
    const res = await loginAsGuest("Player");
    if (res.success) {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Flame color="#f59e0b" size={44} />
        </View>
        <Text style={styles.title}>Clashiq</Text>
        <Text style={styles.subtitle}>COMPETITIVE TOURNAMENT ARENA</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHeading}>SIGN IN TO COMPETE</Text>
        <Text style={styles.desc}>
          Authenticate your player account to join scheduled Free Fire tournaments, access custom room credentials, and win real cash.
        </Text>

        {/* Error Banner with Try Again */}
        {authError && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <AlertCircle color="#f43f5e" size={18} />
              <Text style={styles.errorTitle}>Sign-In Notice</Text>
            </View>
            <Text style={styles.errorDesc}>{authError}</Text>
            <TouchableOpacity 
              style={styles.retryBtn} 
              onPress={clearAuthError}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.googleBtn, isAuthenticating && styles.btnDisabled]} 
          onPress={handleGoogleSignIn}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          {activeProvider === "google" ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#000000" size="small" />
              <Text style={styles.googleText}>SIGNING IN WITH GOOGLE...</Text>
            </View>
          ) : (
            <Text style={styles.googleText}>CONTINUE WITH GOOGLE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.facebookBtn, isAuthenticating && styles.btnDisabled]} 
          onPress={handleFacebookSignIn}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          {activeProvider === "facebook" ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.facebookText}>SIGNING IN WITH FACEBOOK...</Text>
            </View>
          ) : (
            <Text style={styles.facebookText}>CONTINUE WITH FACEBOOK</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={[styles.guestBtn, isAuthenticating && styles.btnDisabled]} 
          onPress={handleGuestSignIn}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          {activeProvider === "guest" ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#000000" size="small" />
              <Text style={styles.guestText}>ENTERING ARENA...</Text>
            </View>
          ) : (
            <>
              <Zap color="#000000" size={16} />
              <Text style={styles.guestText}>QUICK ACCESS • ENTER DASHBOARD</Text>
            </>
          )}
        </TouchableOpacity>

        {isAuthenticating && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#f59e0b" size="small" />
            <Text style={styles.loadingText}>Initializing player credentials & wallet...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <ShieldCheck color="#10b981" size={16} />
        <Text style={styles.footerText}>
          Fair Play Guaranteed • Cryptographic Ledger • AES-256 Rooms
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#09090b", 
    padding: 24, 
    justifyContent: "space-between" 
  },
  header: { 
    alignItems: "center", 
    marginTop: 48 
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { 
    color: "#ffffff", 
    fontSize: 28, 
    fontWeight: "900", 
    letterSpacing: 1, 
    marginTop: 4 
  },
  subtitle: { 
    color: "#f59e0b", 
    fontSize: 10, 
    fontWeight: "800", 
    letterSpacing: 1.5, 
    marginTop: 2 
  },
  content: { 
    gap: 12,
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  sectionHeading: { 
    color: "#ffffff", 
    fontSize: 16, 
    fontWeight: "900",
    letterSpacing: 0.5 
  },
  desc: { 
    color: "#a1a1aa", 
    fontSize: 12, 
    lineHeight: 18, 
    marginBottom: 10 
  },
  errorCard: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  errorTitle: {
    color: "#f43f5e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  errorDesc: {
    color: "#e4e4e7",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: "#27272a",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  googleBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  googleText: { 
    color: "#000000", 
    fontSize: 13, 
    fontWeight: "900",
    letterSpacing: 0.5 
  },
  facebookBtn: {
    backgroundColor: "#1877f2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  facebookText: { 
    color: "#ffffff", 
    fontSize: 13, 
    fontWeight: "900",
    letterSpacing: 0.5 
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerText: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "700",
  },
  guestBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  guestText: { 
    color: "#000000", 
    fontSize: 12, 
    fontWeight: "900",
    letterSpacing: 0.5 
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    marginTop: 8 
  },
  loadingText: { 
    color: "#f59e0b", 
    fontSize: 11, 
    fontWeight: "600" 
  },
  footer: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 6, 
    marginBottom: 16 
  },
  footerText: { 
    color: "#71717a", 
    fontSize: 10,
    fontWeight: "600" 
  },
});
