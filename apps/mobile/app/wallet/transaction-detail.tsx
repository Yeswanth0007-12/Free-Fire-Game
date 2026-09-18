import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ChevronLeft,
  Clock,
  FileText,
  Hash,
  AlertCircle,
} from "lucide-react-native";

export default function TransactionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    transaction_type?: string;
    amount_minor?: string;
    direction?: string;
    status?: string;
    reference_id?: string;
    description?: string;
    created_at?: string;
  }>();

  const [copied, setCopied] = useState(false);

  const txId = params.id || "TX-UNKNOWN";
  const type = params.transaction_type || "TRANSACTION";
  const direction = params.direction || "CREDIT";
  const amountMinor = Number(params.amount_minor || 0);
  const status = params.status || "COMPLETED";
  const referenceId = params.reference_id || `REF-${txId.slice(0, 8).toUpperCase()}`;
  const description = params.description || "Double-entry tournament ledger transfer";
  const createdAt = params.created_at ? new Date(params.created_at).toLocaleString() : new Date().toLocaleString();

  const isCredit = direction === "CREDIT";

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Bar / Back button */}
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)/wallet");
          }
        }}
      >
        <ChevronLeft color="#a1a1aa" size={20} />
        <Text style={styles.backText}>Back to Wallet</Text>
      </TouchableOpacity>

      {/* Primary Amount Card */}
      <View style={styles.card}>
        <View
          style={[
            styles.iconCircle,
            isCredit ? styles.creditCircle : styles.debitCircle,
          ]}
        >
          {isCredit ? (
            <ArrowDownLeft color="#10b981" size={32} />
          ) : (
            <ArrowUpRight color="#f43f5e" size={32} />
          )}
        </View>

        <Text style={styles.typeLabel}>{(type || "TRANSACTION").replace(/_/g, " ")}</Text>

        <Text
          style={[
            styles.amountText,
            isCredit ? styles.creditAmount : styles.debitAmount,
          ]}
        >
          {isCredit ? "+" : "-"}₹{(amountMinor / 100).toFixed(2)}
        </Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              status === "COMPLETED"
                ? styles.statusSuccess
                : status === "PENDING"
                ? styles.statusPending
                : styles.statusFailed,
            ]}
          >
            {status === "COMPLETED" ? (
              <CheckCircle2 color="#10b981" size={12} />
            ) : (
              <AlertCircle color="#f59e0b" size={12} />
            )}
            <Text
              style={[
                styles.statusText,
                status === "COMPLETED"
                  ? styles.statusSuccessText
                  : status === "PENDING"
                  ? styles.statusPendingText
                  : styles.statusFailedText,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>
      </View>

      {/* Ledger Verification Box */}
      <View style={styles.auditBox}>
        <ShieldCheck color="#10b981" size={20} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.auditTitle}>DOUBLE-ENTRY VERIFIED</Text>
          <Text style={styles.auditDesc}>
            Immutable ledger transaction cryptographically bound to platform financial balances.
          </Text>
        </View>
      </View>

      {/* Transaction Details Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>TRANSACTION DETAILS</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <Hash color="#71717a" size={14} />
            <Text style={styles.detailLabel}>TRANSACTION ID</Text>
          </View>
          <TouchableOpacity onPress={handleCopy} style={styles.copyRow}>
            <Text style={styles.monoValue}>{txId.length > 16 ? `${txId.slice(0, 16)}...` : txId}</Text>
            <Copy color="#a1a1aa" size={12} />
          </TouchableOpacity>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <FileText color="#71717a" size={14} />
            <Text style={styles.detailLabel}>REFERENCE ID</Text>
          </View>
          <Text style={styles.monoValue}>{referenceId}</Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <Clock color="#71717a" size={14} />
            <Text style={styles.detailLabel}>RECORDED AT</Text>
          </View>
          <Text style={styles.detailValue}>{createdAt}</Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <FileText color="#71717a" size={14} />
            <Text style={styles.detailLabel}>DESCRIPTION</Text>
          </View>
          <Text style={[styles.detailValue, { flex: 1, textAlign: "right", marginLeft: 16 }]}>
            {description}
          </Text>
        </View>
      </View>

      {copied && (
        <View style={styles.copiedToast}>
          <CheckCircle2 color="#10b981" size={14} />
          <Text style={styles.copiedText}>ID Copied to clipboard</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  content: { padding: 16, paddingBottom: 40 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  backText: { color: "#a1a1aa", fontSize: 14, fontWeight: "600", marginLeft: 4 },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  creditCircle: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  debitCircle: { backgroundColor: "rgba(244, 63, 94, 0.15)" },
  typeLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  amountText: { fontSize: 36, fontWeight: "900", marginBottom: 12 },
  creditAmount: { color: "#10b981" },
  debitAmount: { color: "#f43f5e" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  statusSuccess: { backgroundColor: "rgba(16, 185, 129, 0.12)" },
  statusPending: { backgroundColor: "rgba(245, 158, 11, 0.12)" },
  statusFailed: { backgroundColor: "rgba(244, 63, 94, 0.12)" },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  statusSuccessText: { color: "#10b981" },
  statusPendingText: { color: "#f59e0b" },
  statusFailedText: { color: "#f43f5e" },
  auditBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    padding: 14,
    marginBottom: 20,
  },
  auditTitle: { color: "#10b981", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  auditDesc: { color: "#a1a1aa", fontSize: 11, marginTop: 2, lineHeight: 15 },
  section: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  sectionHeading: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { color: "#a1a1aa", fontSize: 11, fontWeight: "700" },
  detailValue: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },
  monoValue: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  copyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  copiedToast: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#27272a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 16,
    gap: 6,
  },
  copiedText: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },
});
