import React from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl 
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Swords, Zap, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";
import { mobileApi } from "../../src/services/api";
import { MatchSummary } from "../../src/types";

export default function HomeScreen() {
  const router = useRouter();
  const { user, gamingIdentity, wallet, isAuthenticated, refreshWallet } = useAuthStore();

  const { data: matchesData, isLoading, refetch } = useQuery({
    queryKey: ["home-matches"],
    queryFn: async () => {
      const res = await mobileApi.getMatches();
      return (res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.matches || []) : []) as MatchSummary[];
    },
  });

  const upcomingMatches = (matchesData || []).slice(0, 4);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); refreshWallet(); }} tintColor="#f59e0b" />
      }
    >
      {/* Welcome & Wallet Header Card (Section 30, 32) */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
            <Text style={styles.userName}>
              {isAuthenticated ? user?.display_name || "Player" : "Guest Player"}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            {gamingIdentity?.status === "VERIFIED" ? (
              <View style={styles.badgeRow}>
                <CheckCircle2 color="#10b981" size={14} />
                <Text style={styles.verifiedText}>UID VERIFIED</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                <Text style={styles.unverifiedText}>LINK FREE FIRE UID</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.walletBar}>
          <View>
            <Text style={styles.walletLabel}>AVAILABLE WALLET</Text>
            <Text style={styles.walletAmount}>
              ₹{((wallet?.available_balance_minor || 0) / 100).toFixed(0)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.walletActionBtn}
            onPress={() => router.push("/(tabs)/wallet")}
          >
            <Text style={styles.walletActionText}>DEPOSIT / WITHDRAW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Free Fire Identity Quick Status (Section 8, 9, 10) */}
      {isAuthenticated && gamingIdentity && (
        <View style={styles.identityCard}>
          <View style={styles.identityLeft}>
            <Flame color="#f59e0b" size={18} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.identityTitle}>Free Fire Account</Text>
              <Text style={styles.identityUid}>UID: {gamingIdentity.game_uid} • {gamingIdentity.in_game_name}</Text>
            </View>
          </View>
          <Text style={styles.statusLabel}>{gamingIdentity.status}</Text>
        </View>
      )}

      {/* Competitive Formats Banner (Section 1) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>COMPETITIVE FORMATS</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatsScroll}>
        {["CLASH SQUAD 4V4", "LONE WOLF 2V2", "LONE WOLF 1V1", "SOLO BATTLE ROYALE"].map((fmt, i) => (
          <View key={i} style={styles.formatChip}>
            <Swords color="#f59e0b" size={14} />
            <Text style={styles.formatChipText}>{fmt}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Upcoming Tournaments (Section 30) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>UPCOMING TOURNAMENTS</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/matches")}>
          <Text style={styles.viewAllText}>VIEW ALL</Text>
        </TouchableOpacity>
      </View>

      {upcomingMatches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tournaments open right now. Check back soon!</Text>
        </View>
      ) : (
        upcomingMatches.map((m) => (
          <TouchableOpacity 
            key={m.id} 
            style={styles.matchCard}
            onPress={() => router.push({ pathname: "/match/[id]", params: { id: m.id } })}
          >
            <View style={styles.matchTop}>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>{m.match_format}</Text>
              </View>
              <Text style={styles.mapText}>{m.map_name}</Text>
            </View>

            <View style={styles.matchDetailsRow}>
              <View>
                <Text style={styles.detailLabel}>ENTRY FEE</Text>
                <Text style={styles.detailValue}>₹{(m.entry_fee_minor / 100).toFixed(0)}</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>PRIZE POOL</Text>
                <Text style={[styles.detailValue, { color: "#10b981" }]}>
                  ₹{(m.prize_pool_minor / 100).toFixed(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>SLOTS</Text>
                <Text style={styles.detailValue}>
                  {m.current_players} / {m.max_players}
                </Text>
              </View>
            </View>

            <View style={styles.matchFooter}>
              <Text style={styles.timingText}>
                Starts: {new Date(m.match_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>JOIN MATCH</Text>
                <ChevronRight color="#000000" size={14} />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Safety & Invariant Highlights (Section 118, 122) */}
      <View style={styles.trustBanner}>
        <ShieldCheck color="#10b981" size={20} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.trustTitle}>Server-Authoritative Anti-Cheat</Text>
          <Text style={styles.trustDesc}>
            Room credentials encrypted with AES-256 until release timer. Atomic double-entry financial settlement.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeLabel: { color: "#a1a1aa", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  userName: { color: "#ffffff", fontSize: 18, fontWeight: "900", marginTop: 2 },
  verifiedBadge: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { color: "#10b981", fontSize: 10, fontWeight: "800" },
  unverifiedText: { color: "#f59e0b", fontSize: 10, fontWeight: "800" },
  walletBar: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  walletAmount: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 2 },
  walletActionBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  walletActionText: { color: "#000000", fontSize: 11, fontWeight: "900" },
  identityCard: {
    backgroundColor: "#1c1917",
    borderWidth: 1,
    borderColor: "#44403c",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  identityLeft: { flexDirection: "row", alignItems: "center" },
  identityTitle: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  identityUid: { color: "#e7e5e4", fontSize: 12, fontWeight: "bold" },
  statusLabel: { color: "#10b981", fontSize: 10, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 12 },
  sectionTitle: { color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  viewAllText: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  formatsScroll: { marginBottom: 16 },
  formatChip: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  formatChipText: { color: "#e4e4e7", fontSize: 11, fontWeight: "800" },
  matchCard: {
    backgroundColor: "#18181b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 14,
    marginBottom: 12,
  },
  matchTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  formatBadge: { backgroundColor: "rgba(245, 158, 11, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  formatText: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  mapText: { color: "#a1a1aa", fontSize: 11, fontWeight: "600" },
  matchDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#27272a",
  },
  detailLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  detailValue: { color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 2 },
  matchFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timingText: { color: "#a1a1aa", fontSize: 11 },
  joinBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  joinBtnText: { color: "#000000", fontSize: 11, fontWeight: "900" },
  emptyCard: { padding: 30, alignItems: "center" },
  emptyText: { color: "#71717a", fontSize: 12 },
  trustBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  trustTitle: { color: "#10b981", fontSize: 11, fontWeight: "800" },
  trustDesc: { color: "#a1a1aa", fontSize: 10, marginTop: 2, lineHeight: 14 },
});
