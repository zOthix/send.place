import type {
  AnchorWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
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
  >,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined
) => {
  const splToken = new PublicKey(form.getValues("token"));
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];
  const recipients = formatRecipients(rawRecipients);

  if (!originalWallet || !signMessage) {
    console.error("Original wallet not found");
    return;
  }

  try {
    const generatedKeyPair = await getGeneratedKeypair(
      String(originalWallet.publicKey),
      signMessage
    );
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
      generatedWallet,
      sendTransaction,
    );

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
  >,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined
) => {
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];
  const recipients = formatRecipients(rawRecipients);

  if (!originalWallet || !signMessage) {
    console.error("Original wallet not found");
    return;
  }

  const to = await getGeneratedKeypair(
    String(originalWallet.publicKey),
    signMessage
  );
  const lamportsNeeded = calculateTotalAmount(recipients) + 0.001 * 1e9;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: originalWallet?.publicKey!,
      toPubkey: to.publicKey,
      lamports: lamportsNeeded,
    })
  );

  await sendTransaction(transaction, connection);
  await processRecipients(to, recipients, sendLamportsToUsers);
};
