import React, { useState } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl 
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Swords, Filter, Users, ChevronRight } from "lucide-react-native";
import { mobileApi } from "../../src/services/api";
import { MatchSummary } from "../../src/types";

const FORMAT_FILTERS = ["ALL", "4V4", "2V2", "1V1", "SOLO"];

export default function MatchesScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ["arena-matches"],
    queryFn: async () => {
      const res = await mobileApi.getMatches();
      return (res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.matches || []) : []) as MatchSummary[];
    },
  });

  const filteredMatches = (matches || []).filter((m) => {
    if (!m) return false;
    if (selectedFilter === "ALL") return true;
    const fmt = (m.match_format || "").toUpperCase();
    return fmt.includes(selectedFilter);
  });

  return (
    <View style={styles.container}>
      {/* Format Filter Bar */}
      <View style={styles.filterBar}>
        {FORMAT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Match List */}
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>No matches found for filter: {selectedFilter}</Text>
          </View>
        }
        renderItem={({ item: m }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({ pathname: "/match/[id]", params: { id: m.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{m.match_format}</Text>
              </View>
              <Text style={styles.mapText}>{m.map_name}</Text>
            </View>

            <View style={styles.cardBody}>
              <View>
                <Text style={styles.label}>ENTRY</Text>
                <Text style={styles.value}>₹{(m.entry_fee_minor / 100).toFixed(0)}</Text>
              </View>
              <View>
                <Text style={styles.label}>PRIZE POOL</Text>
                <Text style={[styles.value, { color: "#10b981" }]}>
                  ₹{(m.prize_pool_minor / 100).toFixed(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.label}>PLAYERS</Text>
                <Text style={styles.value}>
                  {m.current_players}/{m.max_players}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.timeText}>
                Reg Closes: {new Date(m.registration_close_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <View style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>JOIN MATCH</Text>
                <ChevronRight color="#000000" size={14} />
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
  filterBar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  filterChipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  filterText: { color: "#71717a", fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: "#000000", fontWeight: "900" },
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
  badge: { backgroundColor: "rgba(245, 158, 11, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#f59e0b", fontSize: 11, fontWeight: "800" },
  mapText: { color: "#a1a1aa", fontSize: 11, fontWeight: "600" },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#27272a",
  },
  label: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  value: { color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeText: { color: "#a1a1aa", fontSize: 11 },
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
  emptyView: { padding: 40, alignItems: "center" },
  emptyText: { color: "#71717a", fontSize: 12 },
});
