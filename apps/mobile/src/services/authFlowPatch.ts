import { router } from "expo-router";
import { AuthResult } from "./authService";
import { useAuthStore } from "../store/authStore";
import { useAccountPickerStore } from "../store/accountPickerStore";
import {
  ProviderAccount,
  ProviderKey,
  listAccounts,
  rememberAccount,
} from "./providerAccounts";

type LoginAction = () => Promise<AuthResult>;

const PICKER_ROUTE = "/auth/account-picker";

let originalGoogle: LoginAction | null = null;
let originalFacebook: LoginAction | null = null;
let installed = false;

/**
 * Wraps a store login action so the provider handshake happens first, then the
 * account-ID picker opens instead of jumping straight to the dashboard.
 * Returns `cancelled: true` so the calling screen does not navigate on its own.
 */
function routeThroughPicker(provider: ProviderKey, original: LoginAction): LoginAction {
  return async (): Promise<AuthResult> => {
    try {
      const accounts = await listAccounts(provider);
      useAccountPickerStore.getState().open(provider, accounts);
      router.push(PICKER_ROUTE);
      return { success: false, cancelled: true };
    } catch {
      // Picker unavailable — never trap the user, fall back to direct sign-in.
      return original();
    }
  };
}

/**
 * Completes sign-in with the account the user actually selected, then stamps
 * that identity (id / email / display name) onto the authenticated session so
 * the dashboard and profile show the respective account.
 */
export async function signInWithAccount(account: ProviderAccount): Promise<AuthResult> {
  const original =
    account.provider === "google" ? originalGoogle : originalFacebook;

  if (!original) {
    return { success: false, error: "Sign-in is unavailable. Please reopen the app." };
  }

  useAccountPickerStore.getState().setSigningIn(true);

  try {
    const result = await original();

    if (result.success) {
      useAuthStore.setState({
        user: {
          id: `player_${account.id}`,
          email: account.email,
          role: "PLAYER",
          display_name: account.displayName,
          avatar_url: account.photoUrl,
        },
        isAuthenticated: true,
        authStatus: "AUTHENTICATED",
        authError: null,
        activeProvider: null,
      });
      await rememberAccount(account);
      return result;
    }

    if (result.error) {
      useAccountPickerStore.getState().setError(result.error);
    }
    return result;
  } catch (err: any) {
    const message = err?.message || "Sign-in failed. Please try again.";
    useAccountPickerStore.getState().setError(message);
    return { success: false, error: message };
  } finally {
    useAccountPickerStore.getState().setSigningIn(false);
  }
}

/**
 * Replaces the Google/Facebook actions on the auth store with picker-aware
 * versions. The original actions are captured so `signInWithAccount` can still
 * run the real handshake. Idempotent.
 */
export function installAuthFlowPatch(): void {
  if (installed) return;

  const state = useAuthStore.getState();
  originalGoogle = state.loginWithGoogle;
  originalFacebook = state.loginWithFacebook;

  useAuthStore.setState({
    loginWithGoogle: routeThroughPicker("google", originalGoogle),
    loginWithFacebook: routeThroughPicker("facebook", originalFacebook),
  });

  installed = true;
}
