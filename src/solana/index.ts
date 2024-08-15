import type {
  AnchorWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import type { UseFormReturn } from "react-hook-form";
import {
  calculateTotalAmount,
  formatRecipients,
  getGeneratedKeypair,
  parseInput,
  processSPLRecipients,
  sendSol,
  sendSplTokens,
  SolanaWallet,
} from "./utils";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), {
  commitment: "confirmed",
});

/**
 * 
 * @param originalWallet 
 * @param sendTransaction 
 * @param form 
 */
export const sendSplToken = async (
  originalWallet: AnchorWallet,
  sendTransaction: WalletContextState["sendTransaction"],
  form: UseFormReturn<
    {
      type: string;
      token: string;
      recipients: string;
    },
    any,
    undefined
  >
) => {
  console.log("running sendSplToken");

  const splToken = new PublicKey(form.getValues("token"));
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];
  const recipients = formatRecipients(rawRecipients);

  try {
    const generatedKeyPair = getGeneratedKeypair();
    const generatedWallet = new SolanaWallet(generatedKeyPair);

    await sendSol(generatedWallet, originalWallet, sendTransaction);

    const sourceAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      generatedWallet.payer,
      splToken,
      originalWallet?.publicKey!
    );

    const destinationAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      generatedWallet.payer,
      splToken,
      generatedKeyPair.publicKey
    );

    const splTokenAmount = calculateTotalAmount(recipients);
    await sendSplTokens(
      sourceAccount,
      destinationAccount,
      splTokenAmount,
      originalWallet,
      sendTransaction
    );

    console.log("Sent 1 SOL and SPL tokens to new Keypair");

    await processSPLRecipients(recipients, generatedKeyPair, splToken);
  } catch (error) {
    console.error("Error sending SPL token:", error);
  }
};
