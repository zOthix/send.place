import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  type ConfirmOptions,
  type AccountMeta,
  Connection,
  clusterApiUrl,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import type { XpBridge } from "@/web3/solana_idl";
import { TransferLamportsData, TransferLamportsDataInfo } from "@/web3/encode";
import idl from "../../web3/idl.json";
import { toast } from "sonner";
import type {
  AnchorWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { CryptoService } from "../crypto";

/**
 *  Connection to the devnet
 */
export const connection = new Connection(clusterApiUrl("devnet"), {
  commitment: "confirmed",
});

const confirmOptions: ConfirmOptions = {
  skipPreflight: false,
  commitment: "confirmed",
};
export class SolanaWallet implements anchor.Wallet {
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

/**
 *
 * @param inputStrings
 * @returns   [string, string][]
 */
export const parseInput = (inputStrings: string[]): [string, string][] => {
  return inputStrings.map((inputString) => {
    const [address, value] = inputString.split(/[ ,=]+/);
    return [address, value] as [string, string];
  });
};

/**
 *
 * @param rawRecipients
 * @returns Recipients[]
 */
export const formatRecipients = (
  rawRecipients: [string, string][]
): { publicKey: string; amount: number }[] => {
  return rawRecipients.map(([rec, val]) => ({
    amount: Number(val),
    publicKey: rec,
  }));
};

/**
 *
 * @returns Keypair
 */
export const getGeneratedKeypair = async (
  publicKey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<Keypair> => {
  const storedHash = localStorage.getItem("to");
  const SignedSecret = await signSecretMessage(publicKey, signMessage);
  const cryptoService = new CryptoService(String(SignedSecret));
  console.log({ storedHash });
  const decryptedHash = storedHash
    ? await cryptoService.decrypt(storedHash)
    : null;
  const keypair = decryptedHash
    ? Keypair.fromSecretKey(
        Buffer.from(decryptedHash.split(",").map((s) => parseInt(s)))
      )
    : Keypair.generate();

  if (!decryptedHash) {
    const secretKey = keypair.secretKey.toString();
    console.log({ secretKey });
    const encrypted = await cryptoService.encrypt(secretKey);
    console.log("encrypted", encrypted);
    localStorage.setItem("to", encrypted.encrypted);
  }

  return keypair;
};

/**
 *
 * @param recipients
 * @returns number
 */
export const calculateTotalAmount = (
  recipients: { publicKey: string; amount: number }[]
): number => {
  return recipients.reduce((acc, recipient) => acc + recipient.amount, 0) * 1e9;
};

/**
 *
 * @param to
 * @param recipients
 * @param sendLamportsToUsers
 * @returns Promise<void>
 */
export const processRecipients = async (
  to: Keypair,
  recipients: { publicKey: string; amount: number }[],
  sendLamportsToUsers: (
    to: Keypair,
    batch: { publicKey: string; amount: number }[]
  ) => Promise<void>
) => {
  if (recipients.length === 0) {
    return;
  }

  const batch = recipients.slice(0, 20);
  const remaining = recipients.slice(20);

  await sendLamportsToUsers(to, batch);
  await processRecipients(to, remaining, sendLamportsToUsers);
};

/**
 *
 * @param to
 * @param recipients
 */
export const sendLamportsToUsers = async (
  to: Keypair,
  recipients: { publicKey: string; amount: number }[]
) => {
  const payer = Keypair.fromSecretKey(to.secretKey);
  const newWallet = new SolanaWallet(payer);

  const provider = new anchor.AnchorProvider(connection, newWallet, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(
    idl as anchor.Idl,
    idl.metadata.address,
    provider
  ) as anchor.Program<XpBridge>;

  const data = {
    recipients: recipients.map((r) => ({
      recipient: new PublicKey(r.publicKey),
      amount: new anchor.BN(r.amount * 1e9),
    })),
  };

  let remainingAccounts: AccountMeta[] = [];
  remainingAccounts.push({
    isSigner: true,
    isWritable: true,
    pubkey: newWallet.publicKey,
  });
  remainingAccounts.push({
    isSigner: false,
    isWritable: true,
    pubkey: SystemProgram.programId,
  });

  recipients.forEach((r) => {
    remainingAccounts.push({
      isSigner: false,
      isWritable: true,
      pubkey: new PublicKey(r.publicKey),
    });
  });

  const tx = program.methods
    .transferLamports(data)
    .accounts({
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts);

  await tx
    .rpc({ skipPreflight: true })
    .then((sig) => {
      toast.success(
        `
          Disperse successful.
          <a
            href={"https://explorer.solana.com/tx/" + sig}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solana
          </a>
        `
      );
      console.log("result", sig);
    })
    .catch((err) => {
      console.error(err);
      toast.error("Something went wrong");
    });
};

/**
 *
 * @param generatedWallet
 * @param originalWallet
 * @param sendTransaction
 */
export const sendSol = async (
  generatedWallet: SolanaWallet,
  originalWallet: AnchorWallet,
  sendTransaction: WalletContextState["sendTransaction"],
  lamports?: number | null
) => {
  const sendSolTx = SystemProgram.transfer({
    fromPubkey: originalWallet?.publicKey!,
    toPubkey: generatedWallet.payer.publicKey,
    lamports: lamports ?? 1.2e6, // 0.0012 SOL
  });

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

/**
 *
 * @param publicKey
 */
export const waitForBalance = async (publicKey: PublicKey) => {
  let balance = 0;
  while (!balance) {
    balance = await connection.getBalance(publicKey);
    console.log({ balance });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

/**
 *
 * @param sourceAccount
 * @param destinationAccount
 * @param splTokenAmount
 * @param originalWallet
 * @param sendTransaction
 */
export const sendSplTokens = async (
  sourceAccount: any,
  destinationAccount: any,
  splTokenAmount: number,
  originalWallet: AnchorWallet,
  generatedWallet: SolanaWallet,
  sendTransaction: WalletContextState["sendTransaction"]
) => {
  const sendSplTx = createTransferInstruction(
    sourceAccount.address,
    destinationAccount.address,
    originalWallet?.publicKey!,
    splTokenAmount
  );

  const tx = new Transaction().add(sendSplTx);
  // const fee = await tx.getEstimatedFee(connection);

  // await sendSol(generatedWallet, originalWallet, sendTransaction, fee);
  const signature = await sendTransaction(tx, connection);

  console.log("Sent SPL tokens transaction signature:", signature);
};

/**
 *
 * @param recipients
 * @param payer
 * @param splToken
 * @returns  Promise<void>
 */
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

/**
 *
 * @param recipients
 * @param payer
 * @param splToken
 */
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

  // return await tx.instruction();

  await tx
    .rpc({ skipPreflight: true })
    .then((sig) => {
      toast.success(
        `
        Disperse successful.
        <a
          href={"https://explorer.solana.com/tx/" + sig}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Solana
        </a>
      `
      );
      console.log("result", sig);
    })
    .catch((err) => {
      console.error(err);
      toast.error("Something went wrong");
    });
};

/**
 *
 * @param recipients
 * @param payer
 * @param splToken
 * @param remainingAccounts
 * @returns Promise<TransferLamportsDataInfo[]>
 */
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

/**
 *
 * @param publicKey
 * @returns Promise<{ address: string; balance: number }[]>
 */
export const getSPLTokensInWallet = async (publicKey: PublicKey) => {
  if (!publicKey) return;
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const tokens = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });
  return tokens.value.map((token) => {
    const address = token.account.data.parsed.info.mint;
    const balance = token.account.data.parsed.info.tokenAmount.uiAmount;
    return { address, balance };
  });
};

/**
 *
 * @param secretKey
 * @param signMessage
 * @returns Promise<Uint8Array>
 */
export const signSecretMessage = async (
  secretKey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
) => {
  if (!signMessage || !secretKey) {
    return;
  }
  const mesArr = await signMessage(Buffer.from(secretKey, "utf-8"));
  return mesArr;
};
