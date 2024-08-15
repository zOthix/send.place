import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  Connection,
  type ConfirmOptions,
  type AccountMeta,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
// Adjust the import path accordingly

import type { Wallet } from "@project-serum/anchor";
import type { UseFormReturn } from "react-hook-form";
import type {
  AnchorWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import type { XpBridge } from "@/web3/solana_idl";
import { TransferLamportsData, TransferLamportsDataInfo } from "@/web3/encode";
import idl from "../web3/idl.json"


export const connection = new Connection(clusterApiUrl("devnet"), {
  commitment: "confirmed",
});
export class SolanaWallet implements Wallet {
  constructor(readonly payer: Keypair) {
    this.payer = payer;
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

export function parseInput(inputStrings: string[]): [string, string][] {
  // Parse the input strings
  const parsedOutput = inputStrings.map((inputString) => {
    // Split the input string by the first space character
    const [address, value] = inputString.split(/[ ,=]+/);

    // Return the address and value as a tuple
    return [address, value] as [string, string];
  });

  // Return the parsed output as a 2D array
  return parsedOutput;
}


export const formatRecipients = (
  rawRecipients: any[]
): { publicKey: string; amount: number }[] => {
  return rawRecipients.map(([rec, val]) => ({
    amount: Number(val),
    publicKey: rec,
  }));
};

export const getGeneratedKeypair = (): Keypair => {
  const storedTo = localStorage.getItem("to");
  const keypair = storedTo
    ? Keypair.fromSecretKey(
        Buffer.from(storedTo.split(",").map((s) => parseInt(s)))
      )
    : Keypair.generate();

  if (!storedTo) {
    localStorage.setItem("to", keypair.secretKey.toString());
  }

  return keypair;
};

export const sendSol = async (
  generatedWallet: SolanaWallet,
  originalWallet: AnchorWallet,
  sendTransaction: WalletContextState["sendTransaction"]
) => {
  const sendSolTx = SystemProgram.transfer({
    fromPubkey: originalWallet?.publicKey!,
    toPubkey: generatedWallet.payer.publicKey,
    lamports: 1.2e8, // 0.1 SOL
  });

  const confirmOptions: ConfirmOptions = {
    skipPreflight: false,
    commitment: "finalized",
    preflightCommitment: "finalized",
    maxRetries: 5,
    minContextSlot: 10,
  };

  const transactionSignature = await sendTransaction(
    new Transaction().add(sendSolTx),
    connection,
    confirmOptions
  );

  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: transactionSignature,
    },
    "finalized"
  );

  await waitForBalance(generatedWallet.payer.publicKey);
};

export const waitForBalance = async (publicKey: PublicKey) => {
  let balance = 0;
  while (!balance) {
    balance = await connection.getBalance(publicKey);
    console.log({ balance });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

export const calculateTotalAmount = (
  recipients: { publicKey: string; amount: number }[]
): number => {
  return recipients.reduce((acc, recipient) => acc + recipient.amount, 0) * 1e9;
};

export const sendSplTokens = async (
  sourceAccount: any,
  destinationAccount: any,
  splTokenAmount: number,
  originalWallet: AnchorWallet,
  sendTransaction: WalletContextState["sendTransaction"]
) => {
  const sendSplTx = createTransferInstruction(
    sourceAccount.address,
    destinationAccount.address,
    originalWallet?.publicKey!,
    splTokenAmount
  );

  const signature = await sendTransaction(
    new Transaction().add(sendSplTx),
    connection
  );

  console.log("Sent SPL tokens transaction signature:", signature);
};

export const processSPLRecipients = async (
  recipients: { publicKey: string; amount: number }[],
  payer: Keypair,
  splToken: PublicKey
) => {
  if (recipients.length === 0) return;

  const batch = recipients.slice(0, 20);
  const remaining = recipients.slice(20);

  await transferSPL(batch, payer, splToken);
  await processSPLRecipients(remaining, payer, splToken);
};

export const transferSPL = async (
  recipients: { publicKey: string; amount: number }[],
  payer: Keypair,
  splToken: PublicKey
) => {
  const generatedWallet = new SolanaWallet(payer);
  const provider = new anchor.AnchorProvider(connection, generatedWallet, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(
    idl as anchor.Idl,
    idl.metadata.address,
    provider
  ) as anchor.Program<XpBridge>;

  const fromAccountAta = await getOrCreateAssociatedTokenAccount(
    connection,
    generatedWallet.payer,
    splToken,
    generatedWallet.payer.publicKey
  );

  const remainingAccounts: AccountMeta[] = [
    { isSigner: true, isWritable: true, pubkey: payer.publicKey },
    { isSigner: false, isWritable: true, pubkey: fromAccountAta.address },
    { isSigner: false, isWritable: true, pubkey: splToken },
  ];

  const dataArray = await prepareRecipientData(
    recipients,
    payer,
    splToken,
    remainingAccounts
  );

  const data = new TransferLamportsData({ recipients: dataArray });

  const tx = program.methods
    .transferSplTokens(data)
    .accounts({ tokenProgram: TOKEN_PROGRAM_ID })
    .remainingAccounts(remainingAccounts);

  const signature = await tx.rpc({ skipPreflight: true });

  console.log("Transfer SPL tokens transaction signature:", signature);
};

export const prepareRecipientData = async (
  recipients: { publicKey: string; amount: number }[],
  payer: Keypair,
  splToken: PublicKey,
  remainingAccounts: AccountMeta[]
): Promise<TransferLamportsDataInfo[]> => {
  return await Promise.all(
    recipients.map(async (recipient) => {
      const mintToTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        splToken,
        new PublicKey(recipient.publicKey)
      );

      remainingAccounts.push({
        isSigner: false,
        isWritable: true,
        pubkey: mintToTokenAccount.address,
      });

      return new TransferLamportsDataInfo({
        recipient: mintToTokenAccount.address,
        amount: new anchor.BN(recipient.amount * 1e9),
      });
    })
  );
};
