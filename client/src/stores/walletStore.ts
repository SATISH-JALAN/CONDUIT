import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  requestAccess,
  signTransaction,
  isConnected,
  getAddress,
} from "@stellar/freighter-api";
import {
  api,
  clearAuthTokens,
  setAccessToken,
  setRefreshToken,
} from "@/lib/api";

interface WalletState {
  // State
  publicKey: string | null;
  isConnected: boolean;
  connecting: boolean;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  checkConnection: () => Promise<void>;
  signTx: (xdr: string, networkPassphrase: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      isConnected: false,
      connecting: false,
      error: null,

      connect: async () => {
        set({ connecting: true, error: null });

        try {
          // Check if Freighter is installed
          const connResult = await isConnected();
          if (!connResult.isConnected) {
            set({
              error:
                "Freighter wallet not detected. Please install the Freighter browser extension.",
              connecting: false,
            });
            return;
          }

          // Request access to the wallet
          const accessResult = await requestAccess();
          if (accessResult.error) {
            set({ error: accessResult.error, connecting: false });
            return;
          }

          // Get the public key
          const addrResult = await getAddress();
          if (addrResult.error || !addrResult.address) {
            set({
              error: addrResult.error || "Failed to get public key",
              connecting: false,
            });
            return;
          }

          const publicKey = addrResult.address;

          // Authenticate with our backend
          try {
            const authResponse = await api.connect(publicKey);
            setAccessToken(authResponse.accessToken);
            setRefreshToken(authResponse.refreshToken);
          } catch (authErr: any) {
            // Auth is optional for now — wallet still works
            console.warn(
              "Backend auth failed, continuing without JWT:",
              authErr.message,
            );
          }

          set({ publicKey, isConnected: true, connecting: false, error: null });
        } catch (err: any) {
          set({
            error: err.message || "Failed to connect wallet",
            connecting: false,
          });
        }
      },

      disconnect: () => {
        clearAuthTokens();
        set({ publicKey: null, isConnected: false, error: null });
      },

      checkConnection: async () => {
        try {
          const connResult = await isConnected();
          if (!connResult.isConnected) {
            set({ publicKey: null, isConnected: false });
            return;
          }

          const addrResult = await getAddress();
          if (addrResult.address) {
            try {
              const authResponse = await api.connect(addrResult.address);
              setAccessToken(authResponse.accessToken);
              setRefreshToken(authResponse.refreshToken);
            } catch {
              // Keep local wallet state even if backend auth refresh fails.
            }

            set({ publicKey: addrResult.address, isConnected: true });
          }
        } catch {
          // Silently fail — user hasn't connected yet
        }
      },

      signTx: async (
        xdr: string,
        networkPassphrase: string,
      ): Promise<string> => {
        const signResult = await signTransaction(xdr, {
          networkPassphrase,
        });

        if (signResult.error) {
          throw new Error(signResult.error);
        }

        return signResult.signedTxXdr;
      },
    }),
    {
      name: "conduit-wallet-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
        isConnected: state.isConnected,
      }),
    },
  ),
);
