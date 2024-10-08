import App from "./app";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { Web3Provider } from "./provider";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import {
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

export default function WrappedApp() {
  const wallets = useMemo(
    () => [new SolflareWalletAdapter()],
    []
  );
  return (
    <ConnectionProvider endpoint={clusterApiUrl("devnet")}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <Web3Provider>
            <App />
          </Web3Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
