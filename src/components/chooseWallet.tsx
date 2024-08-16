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

const ChooseWallet = () => {
  return (
    <>
      <Dialog>
        <DialogTrigger>
          <Button className="bg-blue-600 py-2 px-4 rounded-full text-white">
            Choose Wallet
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
    </>
  );
};

export default ChooseWallet;
