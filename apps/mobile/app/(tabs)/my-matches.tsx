import React, { useState } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl 
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, CheckCircle, Key, ChevronRight } from "lucide-react-native";
import { mobileApi } from "../../src/services/api";
import { MatchSummary } from "../../src/types";

const TABS = ["UPCOMING", "LIVE", "COMPLETED"];

export default function MyMatchesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("UPCOMING");

  const { data: myMatches, isLoading, refetch } = useQuery({
    queryKey: ["my-matches", activeTab],
    queryFn: async () => {
      const res = await mobileApi.getMyMatches(activeTab);
      const list = (res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.matches || []) : []) as MatchSummary[];
      if (activeTab === "UPCOMING") {
        return list.filter((m) => ["SCHEDULED", "REGISTRATION_OPEN", "FULL", "REGISTRATION_CLOSED", "DRAFT"].includes(m.status));
      } else if (activeTab === "LIVE") {
        return list.filter((m) => ["ROOM_PENDING", "ROOM_READY", "ROOM_RELEASED", "IN_PROGRESS", "AWAITING_RESULT", "RESULT_SUBMITTED", "UNDER_REVIEW"].includes(m.status));
      } else if (activeTab === "COMPLETED") {
        return list.filter((m) => ["VERIFIED", "SETTLED", "COMPLETED", "DISPUTED"].includes(m.status));
      }
      return list;
    },
  });

  return (
    <View style={styles.container}>
      {/* Tabs Bar (Section 36) */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={myMatches || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Trophy color="#3f3f46" size={36} />
            <Text style={styles.emptyTitle}>No tournaments found in {activeTab.toLowerCase()}</Text>
            <Text style={styles.emptyDesc}>Join an upcoming match in the arena to see your slot and room status here.</Text>
            <TouchableOpacity 
              style={styles.browseBtn}
              onPress={() => router.push("/(tabs)/matches")}
            >
              <Text style={styles.browseBtnText}>BROWSE TOURNAMENTS</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: m }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/match/[id]", params: { id: m.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.codeText}>{m.public_match_code}</Text>
              <View style={[styles.statusBadge, m.status === "ROOM_RELEASED" && styles.statusBadgeReleased]}>
                <Text style={[styles.statusText, m.status === "ROOM_RELEASED" && styles.statusTextReleased]}>
                  {(m.status || "MATCH").replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            <Text style={styles.formatTitle}>{m.match_format} • {m.map_name}</Text>

            <View style={styles.roomStatusRow}>
              {m.room_release_status === "RELEASED" ? (
                <View style={styles.roomReleasedRow}>
                  <Key color="#10b981" size={14} />
                  <Text style={styles.roomReleasedText}>ROOM DETAILS UNLOCKED - TAP TO VIEW</Text>
                </View>
              ) : (
                <View style={styles.roomLockedRow}>
                  <Clock color="#71717a" size={14} />
                  <Text style={styles.roomLockedText}>
                    Room unlocks at {new Date(m.room_release_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.entryText}>Fee: ₹{(m.entry_fee_minor / 100).toFixed(0)}</Text>
              <View style={styles.viewRoomBtn}>
                <Text style={styles.viewRoomText}>OPEN LOBBY</Text>
                <ChevronRight color="#f59e0b" size={14} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    backgroundColor: "#18181b",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: "#f59e0b" },
  tabText: { color: "#71717a", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#f59e0b", fontWeight: "900" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeText: { color: "#f59e0b", fontSize: 14, fontWeight: "900", fontFamily: "monospace" },
  statusBadge: { backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeReleased: { backgroundColor: "rgba(16, 185, 129, 0.15)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" },
  statusText: { color: "#a1a1aa", fontSize: 10, fontWeight: "800" },
  statusTextReleased: { color: "#10b981" },
  formatTitle: { color: "#ffffff", fontSize: 15, fontWeight: "800", marginTop: 6 },
  roomStatusRow: { marginVertical: 12, backgroundColor: "#111113", padding: 10, borderRadius: 8 },
  roomReleasedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  roomReleasedText: { color: "#10b981", fontSize: 11, fontWeight: "800" },
  roomLockedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  roomLockedText: { color: "#a1a1aa", fontSize: 11 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  entryText: { color: "#71717a", fontSize: 11, fontWeight: "600" },
  viewRoomBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewRoomText: { color: "#f59e0b", fontSize: 11, fontWeight: "900" },
  emptyView: { padding: 40, alignItems: "center", marginTop: 40 },
  emptyTitle: { color: "#e4e4e7", fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyDesc: { color: "#71717a", fontSize: 11, textAlign: "center", marginTop: 6, lineHeight: 16 },
  browseBtn: {
    marginTop: 20,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseBtnText: { color: "#000000", fontSize: 11, fontWeight: "900" },
});
