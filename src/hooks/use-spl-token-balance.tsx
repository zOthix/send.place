import { getSPLTokensInWallet } from "@/utils/solana/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

const useSplTokenBalance = () => {
  const [splTokens, setSplTokens] = useState<
    | {
        address: any;
        balance: any;
      }[]
    | undefined
  >([]);
  const [refresh, setRefresh] = useState<number>(0);

  const wallet = useWallet();

  const refreshSPLTokenBalance = () => {
    setRefresh(refresh + 1);
  };

  const splBalance = (address: string) => {
    if (!splTokens) return 0;
    const token = splTokens.find((token) => token.address === address);
    return token ? token.balance : 0;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        if (!wallet.publicKey) return;
        getSPLTokensInWallet(wallet.publicKey).then((tokens) => {
          setSplTokens(tokens);
        });
      })();
    }, 2000);

    return () => clearInterval(interval as any);
  }, [refresh]);

  return { splTokens, refreshSPLTokenBalance, splBalance };
};

export default useSplTokenBalance;
