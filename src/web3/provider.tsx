import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider, type Persister } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { WagmiProvider, serialize, deserialize } from "wagmi";

import { wagmiConfig, walletConnectProjectId, createWeb3Modal } from "./config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const queyPersister = createSyncStoragePersister({
  serialize,
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  deserialize,
});

createWeb3Modal();

interface Web3ProviderProps {
  children: React.ReactNode;
  // queryClient: QueryClient;
  // queyPersister: Persister;
}

export function Web3Provider(props: Web3ProviderProps) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queyPersister }}>
      <WagmiProvider config={wagmiConfig}>{props.children}</WagmiProvider>
    </PersistQueryClientProvider>
  );
}
