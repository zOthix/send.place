import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAccount } from "wagmi";

interface Props {}

const ChooseWallet = () => {
  const { connected, connecting } = useWallet();
  const account = useAccount();

  return (
    <>
      {connected || connecting ? (
        <WalletMultiButton
          style={{
            background: "#1e1e1e",
            borderRadius: "9999px",
            padding: "1rem",
            height: "2.5rem",
          }}
        />
      ) : account.status === "connected" ? (
        <w3m-connect-button label="Connect EVM" />
      ) : (
        <Dialog>
          <DialogTrigger>
            {" "}
            <Button className="bg-blue-600 py-2 px-4 rounded-full text-white">
              ChooseWallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>Choose Chain To Connect</DialogHeader>

            <div className="flex items-center justify-center gap-10">
              <w3m-connect-button label="Connect EVM" />
              <DialogClose>
                <WalletMultiButton
                  style={{
                    background: "#3396FF",
                    borderRadius: "9999px",
                    padding: "1rem",
                    height: "2.5rem",
                  }}
                >
                  Connect Solana
                </WalletMultiButton>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ChooseWallet;
