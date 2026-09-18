import React, { useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Clipboard, RefreshControl 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { 
  Key, ShieldCheck, Clock, Users, Copy, CheckCircle2, AlertTriangle, ChevronRight 
} from "lucide-react-native";
import { mobileApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";
import { MatchSummary, MatchRoomDetails } from "../../src/types";

export default function MatchLobbyScreen() {
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, gamingIdentity } = useAuthStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: match, isLoading: matchLoading, refetch: refetchMatch } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: async () => {
      const res = await mobileApi.getMatch(matchId);
      return res.success && res.data ? (res.data as MatchSummary) : null;
    },
    enabled: !!matchId,
  });

  const { data: roomDetails, isLoading: roomLoading, refetch: refetchRoom } = useQuery({
    queryKey: ["match-room", matchId],
    queryFn: async () => {
      const res = await mobileApi.getMatchRoom(matchId);
      return res.success && res.data ? (res.data as MatchRoomDetails) : null;
    },
    enabled: !!matchId && match?.is_registered,
    refetchInterval: 10000, // Polling room release status every 10s if registered
  });

  const handleCopy = (text: string, label: string) => {
    try {
      Clipboard.setString(text);
    } catch (e) {
      console.warn("Clipboard copy fallback:", e);
    }
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleJoinPress = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (!gamingIdentity || gamingIdentity.status !== "VERIFIED") {
      Alert.alert(
        "Free Fire UID Verification Required",
        "Please link and verify your Free Fire numeric UID in your profile before entering paid tournament matches.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Profile", onPress: () => router.push("/(tabs)/profile") },
        ]
      );
      return;
    }

    router.push({
      pathname: "/match/register-slot",
      params: { id: matchId },
    });
  };

  if (matchLoading) {
    return (
      <View style={styles.centerView}>
        <Text style={styles.loadingText}>Loading tournament lobby...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerView}>
        <Text style={styles.errorText}>Tournament not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={matchLoading || roomLoading} 
          onRefresh={() => { refetchMatch(); refetchRoom(); }} 
          tintColor="#f59e0b" 
        />
      }
    >
      {/* Match Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.codeRow}>
          <Text style={styles.matchCode}>MATCH #{match.public_match_code}</Text>
          <View style={[styles.statusBadge, match.status === "ROOM_RELEASED" && styles.statusBadgeGreen]}>
            <Text style={[styles.statusText, match.status === "ROOM_RELEASED" && styles.statusTextGreen]}>
              {match.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        <Text style={styles.matchFormat}>{match.match_format}</Text>
        <Text style={styles.mapName}>MAP: {match.map_name}</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ENTRY FEE</Text>
            <Text style={styles.metricValue}>₹{(match.entry_fee_minor / 100).toFixed(0)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PRIZE POOL</Text>
            <Text style={[styles.metricValue, { color: "#10b981" }]}>
              ₹{(match.prize_pool_minor / 100).toFixed(0)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PLAYERS</Text>
            <Text style={styles.metricValue}>
              {match.current_players} / {match.max_players}
            </Text>
          </View>
        </View>
      </View>

      {/* Room Details Section (Sections 23, 25, 38, 88) */}
      <View style={styles.roomSection}>
        <View style={styles.sectionTitleRow}>
          <Key color="#f59e0b" size={16} />
          <Text style={styles.sectionTitle}>CUSTOM ROOM CREDENTIALS</Text>
        </View>

        {!match.is_registered ? (
          <View style={styles.lockedBox}>
            <Clock color="#71717a" size={24} />
            <Text style={styles.lockedTitle}>ROOM CREDENTIALS LOCKED</Text>
            <Text style={styles.lockedDesc}>
              You must register and confirm your slot to access the room ID and password when released.
            </Text>
          </View>
        ) : roomDetails && roomDetails.room_id ? (
          <View style={styles.unlockedBox}>
            <View style={styles.credRow}>
              <View>
                <Text style={styles.credLabel}>ROOM ID</Text>
                <Text style={styles.credValue}>{roomDetails.room_id}</Text>
              </View>
              <TouchableOpacity 
                style={styles.copyBtn} 
                onPress={() => handleCopy(roomDetails.room_id, "ROOM_ID")}
              >
                <Copy color="#f59e0b" size={14} />
                <Text style={styles.copyBtnText}>
                  {copiedKey === "ROOM_ID" ? "COPIED" : "COPY"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.credRow}>
              <View>
                <Text style={styles.credLabel}>PASSWORD</Text>
                <Text style={styles.credValue}>{roomDetails.room_password}</Text>
              </View>
              <TouchableOpacity 
                style={styles.copyBtn} 
                onPress={() => handleCopy(roomDetails.room_password, "PASSWORD")}
              >
                <Copy color="#f59e0b" size={14} />
                <Text style={styles.copyBtnText}>
                  {copiedKey === "PASSWORD" ? "COPIED" : "COPY"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.verifiedNotice}>
              <CheckCircle2 color="#10b981" size={14} />
              <Text style={styles.verifiedNoticeText}>
                Room credentials released. Open Free Fire, go to Custom Room, enter Room ID & Password.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.lockedBox}>
            <Clock color="#f59e0b" size={24} />
            <Text style={styles.lockedTitle}>SLOT CONFIRMED • ROOM LOCKED</Text>
            <Text style={styles.lockedDesc}>
              Credentials will automatically decrypt and appear here at {new Date(match.room_release_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            </Text>
          </View>
        )}
      </View>

      {/* Schedule & Rules Section */}
      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>OFFICIAL RULES & TIMELINE</Text>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleBullet}>•</Text>
          <Text style={styles.ruleText}>
            Registration Closes: {new Date(match.registration_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleBullet}>•</Text>
          <Text style={styles.ruleText}>
            Room Release: {new Date(match.room_release_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleBullet}>•</Text>
          <Text style={styles.ruleText}>
            Match Start Time: {new Date(match.match_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleBullet}>•</Text>
          <Text style={styles.ruleText}>
            Emotes, hacking, or unauthorized third-party mods result in instant forfeiture and wallet lock.
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      {!match.is_registered && match.status === "REGISTRATION_OPEN" && (
        <TouchableOpacity style={styles.joinActionBtn} onPress={handleJoinPress}>
          <Text style={styles.joinActionText}>SELECT SLOT & JOIN MATCH</Text>
          <ChevronRight color="#000000" size={18} />
        </TouchableOpacity>
      )}

      {match.is_registered && (
        <View style={styles.registeredBanner}>
          <CheckCircle2 color="#10b981" size={16} />
          <Text style={styles.registeredText}>YOU ARE REGISTERED FOR THIS MATCH</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  content: { padding: 16, paddingBottom: 40 },
  centerView: { flex: 1, backgroundColor: "#09090b", justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#71717a", fontSize: 13 },
  errorText: { color: "#f43f5e", fontSize: 13 },
  headerCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  matchCode: { color: "#f59e0b", fontSize: 13, fontWeight: "900", fontFamily: "monospace" },
  statusBadge: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeGreen: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  statusText: { color: "#a1a1aa", fontSize: 10, fontWeight: "800" },
  statusTextGreen: { color: "#10b981" },
  matchFormat: { color: "#ffffff", fontSize: 20, fontWeight: "900", marginTop: 8 },
  mapName: { color: "#a1a1aa", fontSize: 12, fontWeight: "600", marginTop: 2 },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  metricItem: { alignItems: "flex-start" },
  metricLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  metricValue: { color: "#ffffff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  roomSection: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  lockedBox: {
    backgroundColor: "#111113",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  lockedTitle: { color: "#ffffff", fontSize: 13, fontWeight: "800", marginTop: 4 },
  lockedDesc: { color: "#71717a", fontSize: 11, textAlign: "center", lineHeight: 16 },
  unlockedBox: { backgroundColor: "#111113", borderRadius: 12, padding: 14, gap: 12 },
  credRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#18181b",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  credLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  credValue: { color: "#f59e0b", fontSize: 16, fontWeight: "900", fontFamily: "monospace", marginTop: 2 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBtnText: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  verifiedNotice: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  verifiedNoticeText: { color: "#10b981", fontSize: 10, flex: 1, lineHeight: 14 },
  rulesCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
  },
  rulesTitle: { color: "#ffffff", fontSize: 12, fontWeight: "900", marginBottom: 10 },
  ruleItem: { flexDirection: "row", gap: 6, marginBottom: 6 },
  ruleBullet: { color: "#f59e0b", fontSize: 14 },
  ruleText: { color: "#a1a1aa", fontSize: 11, flex: 1, lineHeight: 16 },
  joinActionBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  joinActionText: { color: "#000000", fontSize: 13, fontWeight: "900" },
  registeredBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  registeredText: { color: "#10b981", fontSize: 12, fontWeight: "900" },
});
