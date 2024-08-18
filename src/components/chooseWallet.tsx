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
import evm from "../assets/icons/evm.svg";
import solana from "../assets/icons/Solana.svg";
import { useWeb3Modal } from "@web3modal/wagmi/react";

const ChooseWallet = ({
  varient = "primary",
}: {
  varient?: "primary" | "secondary";
}) => {
  const { open } = useWeb3Modal();

  return (
    <>
      <Dialog>
        <DialogTrigger>
          <Button
            className={
              varient === "primary"
                ? `bg-blue-600 py-2 px-4 rounded-full text-white`
                : ""
            }
          >
            Choose Wallet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>Choose Chain To Connect</DialogHeader>

          <div className="flex items-center justify-center gap-10">
            <Button
              onClick={() => {
                open();
              }}
              className="w-24 h-24 p-0 my-10 bg-white/10"
            >
              <img src={evm.src} className="w-24 h-24" alt="" />
            </Button>
            <DialogClose>
              <WalletMultiButton
                className="w-24 h-24 p-0 my-10 bg-white/10"
                style={{
                  height: "6rem",
                  width: "6rem",
                  padding: "0",
                  background: "rgba(255, 255, 255, 0.1)",
                }}
                startIcon={<></>}
              >
                <img src={solana.src} className="w-24 h-24" alt="" />
              </WalletMultiButton>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChooseWallet;
