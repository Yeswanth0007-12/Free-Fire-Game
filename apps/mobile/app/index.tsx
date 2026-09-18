import React, { useEffect } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView 
} from "react-native";
import { useRouter } from "expo-router";
import { Flame, Zap, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useAuthStore } from "../src/store/authStore";

export default function RootEntryScreen() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    user, 
    initialize, 
    loginWithGoogle, 
    loginWithFacebook, 
    loginAsGuest,
    authStatus,
    authError,
    activeProvider,
    clearAuthError,
  } = useAuthStore();

  const isAuthenticating = authStatus === "AUTHENTICATING";

  useEffect(() => {
    // Non-blocking initialization of stored session
    initialize().catch(() => {});
  }, []);

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

  const handleContinueDashboard = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
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

          {/* Quick Continue card if already logged in */}
          {isAuthenticated && user && !authError && (
            <TouchableOpacity 
              style={styles.continueCard}
              onPress={handleContinueDashboard}
              activeOpacity={0.85}
            >
              <View style={styles.continueLeft}>
                <CheckCircle2 color="#10b981" size={20} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.continueLabel}>AUTHENTICATED PLAYER</Text>
                  <Text style={styles.continueName}>{user.display_name || "Player"}</Text>
                </View>
              </View>
              <View style={styles.continueBtnBadge}>
                <Text style={styles.continueBtnText}>ENTER ARENA →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Google Login Button */}
          <TouchableOpacity 
            style={[styles.googleBtn, isAuthenticating && styles.btnDisabled]} 
            onPress={handleGoogleSignIn}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            {activeProvider === "google" ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#09090b" size="small" />
                <Text style={styles.googleText}>SIGNING IN WITH GOOGLE...</Text>
              </View>
            ) : (
              <Text style={styles.googleText}>CONTINUE WITH GOOGLE</Text>
            )}
          </TouchableOpacity>

          {/* Facebook Login Button */}
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

          {/* Guest Quick Access Button */}
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

        <View style={styles.trustBanner}>
          <ShieldCheck color="#10b981" size={16} />
          <Text style={styles.trustText}>
            AES-256 Room Encryption • Double-Entry Ledger • Anti-Cheat
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f59e0b",
    letterSpacing: 2,
    marginTop: 4,
  },
  content: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: "center",
  },
  desc: {
    fontSize: 12,
    color: "#a1a1aa",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  errorCard: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  continueCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  continueLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  continueLabel: {
    color: "#71717a",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  continueName: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 1,
  },
  continueBtnBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  continueBtnText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "900",
  },
  googleBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  googleText: {
    color: "#09090b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  facebookBtn: {
    backgroundColor: "#1877f2",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  facebookText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
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
    marginHorizontal: 12,
  },
  guestBtn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  guestText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
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
    marginTop: 14,
  },
  loadingText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
  },
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  trustText: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "600",
  },
});
