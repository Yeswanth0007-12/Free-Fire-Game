import * as SecureStore from "expo-secure-store";

export type ProviderKey = "google" | "facebook";

export interface ProviderAccount {
  /** Federated provider account identifier (Google `sub` / Facebook user id) */
  id: string;
  provider: ProviderKey;
  email: string;
  displayName: string;
  photoUrl?: string;
  lastUsedAt?: number;
}

const STORAGE_KEY = "clashiq_provider_accounts_v1";

const SEED_ACCOUNTS: Record<ProviderKey, ProviderAccount[]> = {
  google: [
    {
      id: "108472910483921774",
      provider: "google",
      email: "player@gmail.com",
      displayName: "Google Gamer",
    },
    {
      id: "11793028471655301",
      provider: "google",
      email: "clashiq.pro@gmail.com",
      displayName: "Clashiq Pro",
    },
  ],
  facebook: [
    {
      id: "100028471928374",
      provider: "facebook",
      email: "player@facebook.com",
      displayName: "FB Gamer",
    },
    {
      id: "1000938471625501",
      provider: "facebook",
      email: "clashiq.gamer@facebook.com",
      displayName: "Clashiq Gamer",
    },
  ],
};

async function readAll(): Promise<ProviderAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProviderAccount[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(accounts: ProviderAccount[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Storage failures must never block the sign-in flow
  }
}

export function providerLabel(provider: ProviderKey): string {
  return provider === "google" ? "Google" : "Facebook";
}

export function providerColor(provider: ProviderKey): string {
  return provider === "google" ? "#ea4335" : "#1877f2";
}

export function initialsOf(displayName: string): string {
  const trimmed = (displayName || "").trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Returns every account known on this device for the given provider.
 * Seeds are merged in so the picker always has something to show, and the
 * most recently used account is sorted to the top.
 */
export async function listAccounts(provider: ProviderKey): Promise<ProviderAccount[]> {
  const stored = await readAll();
  const storedForProvider = stored.filter((account) => account.provider === provider);
  const seeded = SEED_ACCOUNTS[provider].filter(
    (seed) => !storedForProvider.some((account) => account.id === seed.id)
  );
  return [...storedForProvider, ...seeded].sort(
    (a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
  );
}

/** Persists an account after a successful sign-in so it reappears next time. */
export async function rememberAccount(account: ProviderAccount): Promise<void> {
  const stored = await readAll();
  const next = stored.filter((entry) => entry.id !== account.id);
  next.push({ ...account, lastUsedAt: Date.now() });
  await writeAll(next);
}

/** Simulates the provider returning one more account from the device account manager. */
export async function addAnotherAccount(provider: ProviderKey): Promise<ProviderAccount> {
  const existing = await listAccounts(provider);
  const sequence = existing.length + 1;
  const stamp = Date.now().toString().slice(-7);

  const account: ProviderAccount =
    provider === "google"
      ? {
          id: `1${stamp}${sequence}`,
          provider,
          email: `player${sequence}@gmail.com`,
          displayName: `Google Player ${sequence}`,
        }
      : {
          id: `${stamp}${sequence}0`,
          provider,
          email: `player${sequence}@facebook.com`,
          displayName: `FB Player ${sequence}`,
        };

  await rememberAccount(account);
  return account;
}

/** Removes a stored account from the device account manager. */
export async function forgetAccount(id: string): Promise<void> {
  const stored = await readAll();
  await writeAll(stored.filter((entry) => entry.id !== id));
}
