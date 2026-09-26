import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { AlertCircle, ChevronLeft, ShieldCheck, User } from "lucide-react-native";
import { useAccountPickerStore } from "../../src/store/accountPickerStore";
import { signInWithAccount } from "../../src/services/authFlowPatch";
import {
  ProviderKey,
  initialsOf,
  providerColor,
  providerLabel,
} from "../../src/services/providerAccounts";

const PICKER_OPTIONS = {
  headerShown: false,
  animation: "slide_from_right",
} as const;

export default function AccountPickerScreen() {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const {
    provider,
    accounts,
    selectedId,
    isSigningIn,
    error,
    select,
    addAccount,
  } = useAccountPickerStore();

  const activeProvider: ProviderKey = provider ?? "google";
  const providerName = providerLabel(activeProvider);
  const brandColor = providerColor(activeProvider);
  const selected = accounts.find((account) => account.id === selectedId) ?? null;

  const handleBack = () => {
    try {
      router.back();
    } catch {
      try {
        router.replace("/auth/login");
      } catch {}
    }
  };

  const handleAddAccount = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await addAccount();
    } finally {
      setAdding(false);
    }
  };

  const handleContinue = async () => {
    if (!selected || isSigningIn) return;
    try {
      const result = await signInWithAccount(selected);
      if (result.success) {
        try {
          router.replace("/(tabs)");
        } catch {}
      }
    } catch {}
  };

  if (!provider) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={PICKER_OPTIONS} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyBadge}>
            <User color="#f59e0b" size={34} />
          </View>
          <Text style={styles.emptyTitle}>No sign-in in progress</Text>
          <Text style={styles.emptyDesc}>
            Start from the sign-in screen to pick a Google or Facebook account.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBack} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>GO BACK TO SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={PICKER_OPTIONS} />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft color="#f4f4f5" size={26} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Choose an account</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.providerBadge, { backgroundColor: brandColor }]}>
          <Text style={styles.providerBadgeText}>
            {activeProvider === "google" ? "G" : "f"}
          </Text>
        </View>

        <Text style={styles.heading}>Sign in with {providerName}</Text>
        <Text style={styles.subheading}>
          Select the account ID you want to use on Clashiq. You will continue to the dashboard
          with the account you pick below.
        </Text>

        <Text style={styles.sectionLabel}>AVAILABLE ACCOUNTS ON THIS DEVICE</Text>

        {accounts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyAccounts}>
              No {providerName} accounts found. Use “Add another account” to continue.
            </Text>
          </View>
        ) : (
          accounts.map((account) => {
            const isSelected = account.id === selectedId;
            return (
              <TouchableOpacity
                key={account.id}
                style={[styles.accountRow, isSelected && styles.accountRowSelected]}
                onPress={() => select(account.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: `${brandColor}26` }]}>
                  <Text style={[styles.avatarText, { color: brandColor }]}>
                    {initialsOf(account.displayName)}
                  </Text>
                </View>

                <View style={styles.accountMeta}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.displayName}
                  </Text>
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {account.email}
                  </Text>
                  <Text style={styles.accountId} numberOfLines={1}>
                    {providerName} ID · {account.id}
                  </Text>
                </View>

                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addRow}
          onPress={handleAddAccount}
          activeOpacity={0.75}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#f59e0b" />
          ) : (
            <Text style={styles.addPlus}>+</Text>
          )}
          <Text style={styles.addText}>
            {adding ? "Detecting accounts…" : `Use another ${providerName} account`}
          </Text>
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorCard}>
            <AlertCircle color="#f43f5e" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerNote}>
          <ShieldCheck color="#10b981" size={14} />
          <Text style={styles.footerNoteText}>
            Your provider ID is only used to identify your tournament account.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!selected || isSigningIn) && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected || isSigningIn}
          activeOpacity={0.85}
        >
          {isSigningIn ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#09090b" size="small" />
              <Text style={styles.primaryBtnText}>SIGNING IN…</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>
              {selected ? `CONTINUE AS ${selected.displayName.toUpperCase()}` : "SELECT AN ACCOUNT"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#fafafa",
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  providerBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  providerBadgeText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  heading: {
    color: "#fafafa",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  subheading: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  sectionLabel: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
  },
  emptyAccounts: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 20,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 14,
    marginBottom: 10,
  },
  accountRowSelected: {
    borderColor: "#f59e0b",
    backgroundColor: "#1c1917",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  accountMeta: {
    flex: 1,
    marginRight: 10,
  },
  accountName: {
    color: "#fafafa",
    fontSize: 15,
    fontWeight: "700",
  },
  accountEmail: {
    color: "#d4d4d8",
    fontSize: 13,
    marginTop: 2,
  },
  accountId: {
    color: "#71717a",
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3f3f46",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#09090b",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3f3f46",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  addText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "700",
  },
  addPlus: {
    color: "#f59e0b",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#1c1214",
    borderWidth: 1,
    borderColor: "#4c1d24",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: "#f43f5e",
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: "#09090b",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  footerNoteText: {
    color: "#71717a",
    fontSize: 11,
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: "#09090b",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "#fafafa",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
});
