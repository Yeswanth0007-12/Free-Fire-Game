import React, { useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity 
} from "react-native";
import { useRouter } from "expo-router";
import { User, ShieldCheck, Flame, AlertCircle, LogOut, CheckCircle } from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";
import { mobileApi } from "../../src/services/api";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, gamingIdentity, isAuthenticated, logout, refreshProfile, linkIdentity } = useAuthStore();

  const [gameUid, setGameUid] = useState("");
  const [inGameName, setInGameName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLinkUid = async () => {
    if (!gameUid.trim() || !inGameName.trim()) {
      setErrorMsg("Please enter both your Free Fire Numeric UID and In-Game Nickname.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await linkIdentity(gameUid.trim(), inGameName.trim());
      if (res.success) {
        setSuccessMsg(res.message || "Free Fire identity verified & linked!");
      } else {
        setErrorMsg("Failed to link Free Fire UID");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatarBox}>
          <User color="#f59e0b" size={32} />
        </View>
        <Text style={styles.displayName}>{user?.display_name || "Player"}</Text>
        <Text style={styles.emailText}>{user?.email || "player@clashiq.com"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "PLAYER"}</Text>
        </View>
      </View>

      {/* Free Fire Gaming Identity Section (Sections 8, 9, 10, 64, 65, 66) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Flame color="#f59e0b" size={18} />
          <Text style={styles.sectionTitle}>FREE FIRE GAMING IDENTITY</Text>
        </View>

        {gamingIdentity ? (
          <View style={styles.identityBox}>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>FREE FIRE UID</Text>
              <Text style={styles.identityUid}>{gamingIdentity.game_uid || "Not Set"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>IN-GAME NICKNAME</Text>
              <Text style={styles.identityIgn}>{gamingIdentity.in_game_name || "Not Set"}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>VERIFICATION STATUS</Text>
              <View style={[styles.statusPill, gamingIdentity.status === "VERIFIED" && styles.statusPillVerified]}>
                <Text style={[styles.statusPillText, gamingIdentity.status === "VERIFIED" && styles.statusPillTextVerified]}>
                  {(gamingIdentity.status || "PENDING").replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            {gamingIdentity.status === "VERIFIED" ? (
              <View style={styles.verifiedNotice}>
                <CheckCircle color="#10b981" size={14} />
                <Text style={styles.verifiedNoticeText}>
                  Your Free Fire UID is verified and locked to your platform account.
                </Text>
              </View>
            ) : (
              <View style={styles.pendingNotice}>
                <AlertCircle color="#f59e0b" size={14} />
                <Text style={styles.pendingNoticeText}>
                  Pending admin verification before joining high-stakes prize tournaments.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.formBox}>
            <Text style={styles.formDesc}>
              Link your official Free Fire numeric UID and in-game name to join competitive matches and receive prizes.
            </Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FREE FIRE NUMERIC UID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 123456789"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                value={gameUid}
                onChangeText={setGameUid}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IN-GAME NICKNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CLASHIQ_PRO"
                placeholderTextColor="#52525b"
                value={inGameName}
                onChangeText={setInGameName}
              />
            </View>

            <TouchableOpacity 
              style={styles.linkBtn} 
              onPress={handleLinkUid}
              disabled={submitting}
            >
              <Text style={styles.linkBtnText}>
                {submitting ? "VERIFYING & LINKING..." : "VERIFY & LINK FREE FIRE ACCOUNT"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout Action */}
      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={async () => {
          try {
            await logout();
          } finally {
            router.replace("/auth/login");
          }
        }}
      >
        <LogOut color="#f43f5e" size={16} />
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  displayName: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  emailText: { color: "#71717a", fontSize: 12, marginTop: 2 },
  roleBadge: { backgroundColor: "#27272a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  roleText: { color: "#f59e0b", fontSize: 10, fontWeight: "800" },
  sectionCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  identityBox: { backgroundColor: "#111113", borderRadius: 12, padding: 14, gap: 10 },
  identityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  identityLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  identityUid: { color: "#f59e0b", fontSize: 14, fontWeight: "900", fontFamily: "monospace" },
  identityIgn: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  statusPill: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillVerified: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  statusPillText: { color: "#a1a1aa", fontSize: 10, fontWeight: "800" },
  statusPillTextVerified: { color: "#10b981" },
  verifiedNotice: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: "#27272a" },
  verifiedNoticeText: { color: "#10b981", fontSize: 10, flex: 1 },
  pendingNotice: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: "#27272a" },
  pendingNoticeText: { color: "#f59e0b", fontSize: 10, flex: 1 },
  formBox: { gap: 12 },
  formDesc: { color: "#a1a1aa", fontSize: 11, lineHeight: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { color: "#71717a", fontSize: 10, fontWeight: "800" },
  input: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 12,
    color: "#ffffff",
    fontSize: 13,
  },
  linkBtn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  linkBtnText: { color: "#000000", fontSize: 12, fontWeight: "900" },
  errorBox: { backgroundColor: "rgba(244, 63, 94, 0.15)", padding: 8, borderRadius: 6 },
  errorText: { color: "#f43f5e", fontSize: 11 },
  successBox: { backgroundColor: "rgba(16, 185, 129, 0.15)", padding: 8, borderRadius: 6 },
  successText: { color: "#10b981", fontSize: 11 },
  logoutBtn: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { color: "#f43f5e", fontSize: 12, fontWeight: "900" },
});
