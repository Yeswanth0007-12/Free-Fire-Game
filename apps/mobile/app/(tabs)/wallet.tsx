import React from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl 
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react-native";
import { mobileApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";
import { WalletTransaction } from "../../src/types";

export default function WalletScreen() {
  const { wallet, refreshWallet } = useAuthStore();

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const res = await mobileApi.getWalletTransactions();
      return (res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.transactions || []) : []) as WalletTransaction[];
    },
  });

  return (
    <View style={styles.container}>
      {/* Balances Card (Sections 39, 40, 68) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOTAL AVAILABLE BALANCE</Text>
        <Text style={styles.balanceAmount}>
          ₹{((wallet?.available_balance_minor || 0) / 100).toFixed(2)}
        </Text>

        <View style={styles.balanceSubRow}>
          <View>
            <Text style={styles.subLabel}>WINNINGS</Text>
            <Text style={[styles.subValue, { color: "#10b981" }]}>
              ₹{((wallet?.winning_balance_minor || 0) / 100).toFixed(2)}
            </Text>
          </View>
          <View>
            <Text style={styles.subLabel}>LOCKED IN MATCHES</Text>
            <Text style={styles.subValue}>
              ₹{((wallet?.locked_balance_minor || 0) / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.depositBtn}>
            <Text style={styles.depositText}>ADD CASH (UPI)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.withdrawBtn}>
            <Text style={styles.withdrawText}>WITHDRAW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ledger History (Section 40, 69) */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>DOUBLE-ENTRY TRANSACTION LEDGER</Text>
        <ShieldCheck color="#10b981" size={16} />
      </View>

      <FlatList
        data={transactions || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={() => { refetch(); refreshWallet(); }} 
            tintColor="#f59e0b" 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>No ledger transactions recorded yet.</Text>
          </View>
        }
        renderItem={({ item: tx }) => (
          <View style={styles.txRow}>
            <View style={styles.txLeft}>
              <View style={[styles.iconBox, tx.direction === "CREDIT" ? styles.creditBox : styles.debitBox]}>
                {tx.direction === "CREDIT" ? (
                  <ArrowDownLeft color="#10b981" size={16} />
                ) : (
                  <ArrowUpRight color="#f43f5e" size={16} />
                )}
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.txType}>{tx.transaction_type.replace(/_/g, " ")}</Text>
                <Text style={styles.txDesc}>{tx.description || tx.reference_id || "Ledger entry"}</Text>
                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.txRight}>
              <Text style={[styles.txAmount, tx.direction === "CREDIT" ? styles.creditText : styles.debitText]}>
                {tx.direction === "CREDIT" ? "+" : "-"}₹{(tx.amount_minor / 100).toFixed(2)}
              </Text>
              <Text style={styles.txStatus}>{tx.status}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  balanceCard: {
    backgroundColor: "#18181b",
    margin: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  balanceLabel: { color: "#a1a1aa", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  balanceAmount: { color: "#ffffff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  balanceSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  subLabel: { color: "#71717a", fontSize: 10, fontWeight: "700" },
  subValue: { color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  depositBtn: {
    flex: 1,
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  depositText: { color: "#000000", fontSize: 12, fontWeight: "900" },
  withdrawBtn: {
    flex: 1,
    backgroundColor: "#27272a",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  withdrawText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  historyTitle: { color: "#71717a", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  txRow: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  creditBox: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  debitBox: { backgroundColor: "rgba(244, 63, 94, 0.15)" },
  txType: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  txDesc: { color: "#a1a1aa", fontSize: 10, marginTop: 1, maxWidth: 180 },
  txDate: { color: "#52525b", fontSize: 9, marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontWeight: "900" },
  creditText: { color: "#10b981" },
  debitText: { color: "#f43f5e" },
  txStatus: { color: "#71717a", fontSize: 9, fontWeight: "700", marginTop: 2 },
  emptyView: { padding: 40, alignItems: "center" },
  emptyText: { color: "#71717a", fontSize: 12 },
});
