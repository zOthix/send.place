import { useWallet } from "@solana/wallet-adapter-react";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import React from "react";

const useSolanaBalance = () => {
  const [balance, setBalance] = React.useState("0");
  const connection = new Connection(clusterApiUrl("devnet"), {
    commitment: "confirmed",
  });
  const { publicKey, connected } = useWallet();

  React.useEffect(() => {
    (async () => {
      let bal: string = "0";
      if (connected && publicKey) {
        bal = String((await connection.getBalance(publicKey)) / 1e9);
      }
      setBalance(bal);
    })()
  }, [publicKey, connected]);

  return balance;
};

export default useSolanaBalance;
