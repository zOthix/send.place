import type {
  AnchorWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import type { UseFormReturn } from "react-hook-form";
import {
  calculateTotalAmount,
  connection,
  formatRecipients,
  getGeneratedKeypair,
  parseInput,
  processSPLRecipients,
  sendSol,
  sendSplTokens,
  SolanaWallet,
} from "./utils";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

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

import { SystemProgram, Transaction } from "@solana/web3.js";
import { processRecipients, sendLamportsToUsers } from "./utils"; // Adjust the import path accordingly

export const sendLamports = async (
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
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];
  const recipients = formatRecipients(rawRecipients);
  const to = getGeneratedKeypair();
  const lamportsNeeded = calculateTotalAmount(recipients);
  console.log("LAMPORTS NEEDED", lamportsNeeded, recipients);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: originalWallet?.publicKey!,
      toPubkey: to.publicKey,
      lamports: lamportsNeeded,
    })
  );

  const signature = await sendTransaction(transaction, connection);
  console.log("SIGNATURE", signature);

  await processRecipients(to, recipients, sendLamportsToUsers);
};
