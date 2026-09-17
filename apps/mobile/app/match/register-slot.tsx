import React, { useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Users, ShieldCheck, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react-native";
import { mobileApi } from "../../src/services/api";
import { useAuthStore } from "../../src/store/authStore";
import { MatchSlot, MatchSummary } from "../../src/types";

export default function RegisterSlotScreen() {
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const { gamingIdentity, refreshWallet } = useAuthStore();

  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(null);
  const [reserving, setReserving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState<any | null>(null);

  const { data: match } = useQuery({
    queryKey: ["match-detail", matchId],
    queryFn: async () => {
      const res = await mobileApi.getMatch(matchId);
      return res.success && res.data ? (res.data as MatchSummary) : null;
    },
    enabled: !!matchId,
  });

  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["match-slots", matchId],
    queryFn: async () => {
      const res = await mobileApi.getMatchSlots(matchId);
      return res.success && res.data ? (res.data.slots as MatchSlot[]) : [];
    },
    enabled: !!matchId,
    refetchInterval: 5000, // Live poll slots every 5 seconds
  });

  const handleSlotPress = (slot: MatchSlot) => {
    if (slot.status !== "AVAILABLE") return;
    setSelectedSlotNumber(slot.slot_number);
    setErrorMsg(null);
  };

  const handleProceedToPayment = async () => {
    if (!selectedSlotNumber) {
      setErrorMsg("Please select an available slot number.");
      return;
    }

    if (!gamingIdentity?.id) {
      setErrorMsg("Missing verified Free Fire gaming identity.");
      return;
    }

    setReserving(true);
    setErrorMsg(null);

    try {
      // Step 1: Server-authoritative slot reservation (Section 13, 14, 95)
      const res = await mobileApi.reserveSlot(matchId, selectedSlotNumber, gamingIdentity.id);
      if (!res.success) {
        setErrorMsg(res.error?.message || "This slot was just taken by another player. Please pick another slot.");
        await refetchSlots();
        setReserving(false);
        return;
      }

      const reservation = res.data;
      setReservationSuccess(reservation);

      // Step 2: Create server-side Razorpay payment order (Sections 15, 16, 61)
      const orderRes = await mobileApi.createRazorpayOrder(
        matchId, 
        reservation.registration_id, 
        match?.entry_fee_minor || 5000
      );

      if (!orderRes.success) {
        setErrorMsg(orderRes.error?.message || "Failed to initialize payment gateway.");
        setReserving(false);
        return;
      }

      const orderData = orderRes.data;

      // Step 3: Open Razorpay checkout / simulate payment verification
      // In mobile production, RazorpayCheckout.open(options) triggers UPI/Cards.
      // On callback, we verify signature on server:
      const verifyRes = await mobileApi.verifyPayment({
        razorpay_order_id: orderData.order_id || `order_test_${Date.now()}`,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: `sig_verified_${Date.now()}`,
      });

      if (verifyRes.success) {
        await refreshWallet();
        Alert.alert(
          "Slot Confirmed! 🏆",
          `You have successfully booked Slot #${selectedSlotNumber} for Match #${match?.public_match_code}.`,
          [
            {
              text: "Enter Match Lobby",
              onPress: () => router.replace({ pathname: "/match/[id]", params: { id: matchId } }),
            },
          ]
        );
      } else {
        setErrorMsg(verifyRes.error?.message || "Payment verification failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during slot booking.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step Indicator (Section 11, 34) */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>STEP 1 OF 2 • SELECT YOUR SLOT</Text>
        <Text style={styles.stepTitle}>Pick an Available Slot</Text>
        <Text style={styles.stepDesc}>
          Slots are locked in real-time by the backend transaction engine. Reservations are held for 5 minutes.
        </Text>
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <AlertCircle color="#f43f5e" size={16} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Free Fire UID Verification Confirmation Box */}
      <View style={styles.uidBox}>
        <ShieldCheck color="#10b981" size={18} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.uidLabel}>REGISTERING FREE FIRE ACCOUNT</Text>
          <Text style={styles.uidValue}>
            UID: {gamingIdentity?.game_uid} • IGN: {gamingIdentity?.in_game_name}
          </Text>
        </View>
      </View>

      {/* Slots Grid (Section 12, 129, 130) */}
      <View style={styles.gridCard}>
        <Text style={styles.gridTitle}>TOURNAMENT SLOTS</Text>

        {slotsLoading ? (
          <ActivityIndicator color="#f59e0b" style={{ padding: 30 }} />
        ) : (
          <View style={styles.slotsGrid}>
            {(slotsData || []).map((slot) => {
              const isSelected = selectedSlotNumber === slot.slot_number;
              const isAvailable = slot.status === "AVAILABLE";

              return (
                <TouchableOpacity
                  key={slot.slot_number}
                  disabled={!isAvailable}
                  style={[
                    styles.slotBtn,
                    isSelected && styles.slotBtnSelected,
                    !isAvailable && styles.slotBtnTaken,
                  ]}
                  onPress={() => handleSlotPress(slot)}
                >
                  <Text style={[styles.slotNumber, isSelected && styles.slotNumberSelected]}>
                    {slot.slot_number < 10 ? `0${slot.slot_number}` : slot.slot_number}
                  </Text>
                  <Text style={[styles.slotStatus, isSelected && styles.slotStatusSelected]}>
                    {isSelected ? "CHOSEN" : slot.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#27272a" }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3f3f46" }]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
        </View>
      </View>

      {/* Payment & Checkout Summary (Section 15, 16, 127) */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>ENTRY FEE</Text>
          <Text style={styles.summaryValue}>₹{((match?.entry_fee_minor || 5000) / 100).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>PAYMENT GATEWAY</Text>
          <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>RAZORPAY SECURE</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: "#27272a", paddingTop: 10, marginTop: 10 }]}>
          <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
          <Text style={styles.totalValue}>₹{((match?.entry_fee_minor || 5000) / 100).toFixed(2)}</Text>
        </View>
      </View>

      {/* Pay CTA */}
      <TouchableOpacity 
        style={[styles.payBtn, (!selectedSlotNumber || reserving) && styles.payBtnDisabled]}
        disabled={!selectedSlotNumber || reserving}
        onPress={handleProceedToPayment}
      >
        {reserving ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <>
            <Text style={styles.payBtnText}>
              {selectedSlotNumber ? `PAY ₹${((match?.entry_fee_minor || 5000) / 100).toFixed(0)} & CONFIRM SLOT ${selectedSlotNumber}` : "CHOOSE A SLOT TO CONTINUE"}
            </Text>
            <ChevronRight color="#000000" size={18} />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  content: { padding: 16, paddingBottom: 40 },
  stepHeader: { marginBottom: 16 },
  stepLabel: { color: "#f59e0b", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  stepTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900", marginTop: 2 },
  stepDesc: { color: "#a1a1aa", fontSize: 11, lineHeight: 16, marginTop: 4 },
  errorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  errorText: { color: "#f43f5e", fontSize: 11, flex: 1 },
  uidBox: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  uidLabel: { color: "#71717a", fontSize: 9, fontWeight: "800" },
  uidValue: { color: "#ffffff", fontSize: 12, fontWeight: "bold", marginTop: 2 },
  gridCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  gridTitle: { color: "#ffffff", fontSize: 12, fontWeight: "900", marginBottom: 14 },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  slotBtn: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: "#111113",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  slotBtnSelected: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  slotBtnTaken: {
    backgroundColor: "#18181b",
    opacity: 0.3,
  },
  slotNumber: { color: "#ffffff", fontSize: 16, fontWeight: "900", fontFamily: "monospace" },
  slotNumberSelected: { color: "#000000" },
  slotStatus: { color: "#71717a", fontSize: 8, fontWeight: "700", marginTop: 2 },
  slotStatusSelected: { color: "#000000", fontWeight: "900" },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#71717a", fontSize: 10 },
  summaryCard: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#71717a", fontSize: 11, fontWeight: "700" },
  summaryValue: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  totalLabel: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  totalValue: { color: "#10b981", fontSize: 18, fontWeight: "900" },
  payBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { color: "#000000", fontSize: 13, fontWeight: "900" },
});
