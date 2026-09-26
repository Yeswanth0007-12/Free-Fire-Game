import { create } from "zustand";
import {
  ProviderAccount,
  ProviderKey,
  addAnotherAccount,
  listAccounts,
} from "../services/providerAccounts";

interface AccountPickerState {
  /** Provider whose accounts are currently being picked. `null` when no sign-in is pending. */
  provider: ProviderKey | null;
  accounts: ProviderAccount[];
  selectedId: string | null;
  isSigningIn: boolean;
  error: string | null;

  open: (provider: ProviderKey, accounts: ProviderAccount[]) => void;
  select: (id: string) => void;
  addAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  setSigningIn: (value: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useAccountPickerStore = create<AccountPickerState>((set, get) => ({
  provider: null,
  accounts: [],
  selectedId: null,
  isSigningIn: false,
  error: null,

  open: (provider, accounts) => {
    set({
      provider,
      accounts,
      selectedId: accounts[0]?.id ?? null,
      isSigningIn: false,
      error: null,
    });
  },

  select: (id) => {
    set({ selectedId: id, error: null });
  },

  addAccount: async () => {
    const provider = get().provider;
    if (!provider) return;
    try {
      const account = await addAnotherAccount(provider);
      set((state) => ({
        accounts: [account, ...state.accounts],
        selectedId: account.id,
        error: null,
      }));
    } catch {
      set({ error: "Could not add another account. Please try again." });
    }
  },

  refresh: async () => {
    const provider = get().provider;
    if (!provider) return;
    const accounts = await listAccounts(provider);
    const current = get().selectedId;
    const stillAvailable = accounts.some((account) => account.id === current);
    set({
      accounts,
      selectedId: stillAvailable ? current : accounts[0]?.id ?? null,
    });
  },

  setSigningIn: (value) => set({ isSigningIn: value }),
  setError: (message) => set({ error: message }),

  reset: () =>
    set({
      provider: null,
      accounts: [],
      selectedId: null,
      isSigningIn: false,
      error: null,
    }),
}));
