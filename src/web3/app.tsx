import React from "react";
import {
  erc20Abi,
  extractChain,
  formatUnits,
  getChainContractAddress,
  parseUnits,
} from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
// import Blockies from 'react-blockies';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import EthIcon from "@/assets/icons/eth.svg?react";
import type { Address } from "viem";
import disperseAbi from "./disperse-abi";
// import { chains, type ChainIds, SUPER_LUMIO_CHAIN_ID } from "./config";
import { siteConfig } from "@/config/site";
import { formatBalance } from "./format-balance";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type AccountMeta,
  type ConfirmOptions,
} from "@solana/web3.js";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import type { XpBridge } from "../web3/solana_idl";
import idl from "../web3/idl.json";
import { MyWallet } from "@/lib/MyWallet";
import useSolanaBalance from "@/hooks/use-solana-balance";
import { TransferLamportsData, TransferLamportsDataInfo } from "./encode";
import { sendLamports, sendSplToken } from "@/solana";

const formSchema = z.object({
  type: z.enum(["native", "erc20"]),
  token: z.string().optional(),
  recipients: z.string().refine((val) => {
    return parseInput(val.split("\n")).every((parts) => {
      return (
        parts.length === 2 &&
        parts[0].trim() &&
        !isNaN(parseFloat(parts[1].trim()))
      );
    });
  }, "Each line must be in the format: address, balance"),
});

export const MAX_ALLOWANCE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

interface useApproveAllowanceProps {
  accountAddress?: Address;
  spenderAddress?: Address;
  sellTokenAddress: Address;
}

// Allowance
// https://0x.org/docs/0x-swap-api/advanced-topics/how-to-set-your-token-allowances
const useApproveAllowance = ({
  accountAddress,
  spenderAddress,
  sellTokenAddress,
}: useApproveAllowanceProps) => {
  const account = useAccount();
  const chain = account.chain;

  // 1. Read from erc20, does spender (0x Exchange Proxy) have allowance?
  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      !!accountAddress && !!spenderAddress
        ? [accountAddress, spenderAddress]
        : undefined,
  });

  React.useEffect(() => {
    const timer = setInterval(() => refetchAllowance(), 500);
    return () => clearInterval(timer);
  }, []);

  // 2. (only if no allowance): write to erc20, approve 0x Exchange Proxy to spend max integer
  const {
    isPending: isApprovePending,
    data: allowanceApproveResult,
    writeContractAsync,
    error,
  } = useWriteContract();
  const approveAsync = async (maxAllowance: bigint = MAX_ALLOWANCE) => {
    if (!spenderAddress) return;
    const tx = await writeContractAsync({
      address: sellTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, maxAllowance],
    });
    console.log("approveAsync tx", tx);
    refetchAllowance();
    toast.success(
      <>
        Approve successful.{" "}
        <a
          href={chain?.blockExplorers?.default.url + "/tx/" + tx}
          target="_blank"
        >
          View on {chain?.blockExplorers?.default.name}
        </a>
      </>
    );
  };

  return {
    allowance,
    isAllowanceLoading,
    isApprovePending,
    approveAllowanceAsync: approveAsync,
    refetchAllowance,
  };
};

interface UseDisperseProps {
  address?: Address;
  token: Address;
  recipients: Address[];
  values: bigint[];
  onDisperse?: (tx: string) => void;
}

const useDisperse = ({
  address,
  token,
  recipients,
  values,
  onDisperse = (tx) => {},
}: UseDisperseProps) => {
  const account = useAccount();
  const chain = account.chain;
  const {
    data: disperseResult,
    writeContractAsync,
    error: disperseError,
  } = useWriteContract();

  const disperseTokenAsync = async () => {
    if (!address) return;
    const tx = await writeContractAsync({
      address,
      abi: disperseAbi,
      functionName: "disperseToken",
      args: [token, recipients, values],
    });
    console.log("disperseTokenAsync tx", tx);
    onDisperse(tx);
    toast.success(
      <>
        Disperse successful.{" "}
        <a
          href={chain?.blockExplorers?.default.url + "/tx/" + tx}
          target="_blank"
        >
          View on {chain?.blockExplorers?.default.name}
        </a>
      </>
    );
  };

  const disperseEtherAsync = async () => {
    if (!address) return;
    const tx = await writeContractAsync({
      address,
      abi: disperseAbi,
      functionName: "disperseEther",
      args: [recipients, values],
      value: values.reduce((a, b): bigint => a + b, 0n),
    });
    console.log("disperseEtherAsync tx", tx);
    onDisperse(tx);
    toast.success(
      <>
        Disperse successful.{" "}
        <a
          href={chain?.blockExplorers?.default.url + "/tx/" + tx}
          target="_blank"
        >
          View on {chain?.blockExplorers?.default.name}
        </a>
      </>
    );
  };

  return {
    disperseResult,
    disperseError,
    disperseTokenAsync,
    disperseEtherAsync,
  };
};

function parseInput(inputStrings: string[]): [string, string][] {
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

const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export default function App() {
  const account = useAccount();
  const orignalWallet = useAnchorWallet();
  const { sendTransaction, publicKey, connected } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const { open } = useWeb3Modal();
  const address = account.address ? shortenAddress(account.address) : "";
  const accountText = address ? `Account (${address})` : "Account";
  const chainName = account.chain?.name ? account.chain.name : "";
  const tokens = (account.chain as any)?.tokens;

  const disperceAddress = (account.chain?.contracts?.disperse as any)?.address;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "native",
      token: "",
      recipients: "",
    },
  });

  const type = form.watch("type");
  const token = form.watch("token") as Address;
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];
  const {
    data: balance,
    isError,
    isLoading,
    error: balanceError,
    refetch: refechBalance,
  } = useBalance({
    address: account.address,
    token: type === "erc20" && token ? (token as Address) : undefined,
  });

  const solBalance = useSolanaBalance();

  React.useEffect(() => {
    const timer = setInterval(() => refechBalance(), 1000);
    return () => clearInterval(timer as any);
  }, []);
  React.useEffect(() => {
    if (address && balanceError?.message) {
      toast.error(
        "Error getting balance for: " +
          shortenAddress((balanceError as any)?.contractAddress)
      );
    }
  }, [balanceError]);

  const decimals = balance?.decimals ?? 18;

  // TODO: calc sum of transfers
  const maxAllowance = balance?.value ? balance?.value : undefined;
  const formattedMaxAllowance = maxAllowance
    ? formatUnits(maxAllowance, decimals)
    : "0";

  const recipients = [] as string[];
  const values = [] as bigint[];

  rawRecipients.forEach(([recipient, value]) => {
    recipients.push(recipient);
    values.push(value ? parseUnits(value, decimals) : 0n);
  });

  const total = values.reduce((acc, val) => acc + val, 0n);
  const formattedTotal = total ? formatBalance(total, decimals) : "0";
  const {
    allowance,
    isApprovePending,
    approveAllowanceAsync,
    refetchAllowance,
    isAllowanceLoading,
  } = useApproveAllowance({
    accountAddress: account.address,
    spenderAddress: disperceAddress,
    sellTokenAddress: token,
  });

  const { disperseResult, disperseEtherAsync, disperseTokenAsync } =
    useDisperse({
      address: disperceAddress!,
      token,
      recipients: recipients as Address[],
      values,
      onDisperse(tx) {
        console.log("disperse onDisperse", tx);
        refechBalance();
      },
    });

  const formattedAllowance = allowance
    ? formatBalance(allowance, decimals)
    : "0";
  const canDisperse = allowance && allowance >= total;

  const formSubmit = form.handleSubmit((data) => {
    // TODO: Handle form submission
    // may be reset form
    // form.reset();
    return false;
  });

  const isConnected: Boolean = account.status === "connected" || connected;

  /// ---------------------------------------------------
  /**
   * Send lamports to the program
   * ----------------------------------------------------
   */

  //  const orignalWallet = useAnchorWallet();
  const connection = new Connection(clusterApiUrl("devnet"), {
    commitment: "confirmed",
  });
  const sendLamports_ = async () => {
    const reciepients = rawRecipients.map(([rec, val]) => {
      return {
        amount: Number(val),
        publicKey: rec,
      };
    });

    const storedTo = localStorage.getItem("to");
    console.log("storedTo", storedTo);

    const to: Keypair = storedTo
      ? Keypair.fromSecretKey(
          Buffer.from(storedTo.split(",").map((s) => parseInt(s)))
        )
      : Keypair.generate();

    if (!storedTo) {
      localStorage.setItem("to", to.secretKey.toString());
    }

    const lamportsNeeded = reciepients.reduce(
      (acc, r) => acc + r.amount * 1e9,
      0
    );

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: to.publicKey,
        lamports: lamportsNeeded,
      })
    );

    const signature = await sendTransaction(transaction, connection);
    console.log("SIGNATURE", signature);
    console.log("SIGNATURE--------------------------------");

    await processRecipients(to, reciepients);
  };
  async function processRecipients(
    to: Keypair,
    reciepients: { publicKey: string; amount: number }[]
  ) {
    if (reciepients.length === 0) {
      return;
    }

    const batch = reciepients.slice(0, 20);
    const remaining = reciepients.slice(20);

    await sendLamportsToUsers(to, batch);
    await processRecipients(to, remaining);
  }

  async function sendLamportsToUsers(
    to: Keypair,
    reciepients: { publicKey: string; amount: number }[]
  ) {
    console.log(reciepients.length);
    const payer = Keypair.fromSecretKey(to.secretKey);
    const newWallet = new MyWallet(payer);

    const provider = new anchor.AnchorProvider(connection, newWallet, {
      commitment: "confirmed",
    });

    console.log("running sendLamports");
    const program = new anchor.Program(
      idl as anchor.Idl,
      idl.metadata.address,
      provider
    ) as anchor.Program<XpBridge>;

    const d = reciepients.map((r) => {
      console.log(r);
      return {
        recipient: new PublicKey(r.publicKey),
        amount: new anchor.BN(r.amount * 1e9),
      };
    });

    let data = {
      recipients: d,
    };

    let remainingAccounts: AccountMeta[] = [];
    remainingAccounts.push({
      isSigner: true,
      isWritable: true,
      pubkey: newWallet?.publicKey!,
    });
    remainingAccounts.push({
      isSigner: false,
      isWritable: true,
      pubkey: SystemProgram.programId,
    });

    const d_ = reciepients.map((r) => {
      return {
        isSigner: false,
        isWritable: true,
        pubkey: new PublicKey(r.publicKey),
      };
    });

    remainingAccounts.push(...d_);

    const tx = program.methods
      .transferLamports(data)
      .accounts({
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts);

    await tx
      .rpc({
        skipPreflight: true,
      })
      .then((sig) => {
        toast.success(
          <>
            Disperse successful.{" "}
            <a
              href={"https://explorer.solana.com/" + "/tx/" + sig}
              target="_blank"
            >
              View on Solana
            </a>
          </>
        );
        console.log("result", sig);
      })
      .catch((err) => {
        console.log(err);

        toast.error("SomeThing Went wrong");
      });
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <a href="/" className="items-center space-x-2 flex">
            <EthIcon className="w-[32px] text-sm font-normal" />
            <span className="font-bold sm:inline-block">{siteConfig.name}</span>
          </a>
          <div className="flex items-center space-x-4">
            {/* {connected ? (
              <WalletMultiButton
                style={{
                  background: "#1e1e1e",
                  borderRadius: "9999px",
                  padding: "1rem",
                  height: "2.5rem",
                }}
              />
            ) : account.status === "connected" ? (
              chainName ? (
                <w3m-account-button />
              ) : (
                <button
                  onClick={() => {
                    open({
                      view: "Networks",
                    });
                  }}
                  className="bg-blue-600 py-2 px-4 rounded-full"
                >
                  Chain not supported
                </button>
              )
            ) : ( */}
            <Dialog>
              <DialogTrigger>
                {/* <Button>Choose Chain</Button> */}

                <Button className="bg-blue-600 py-2 px-4 rounded-full text-white">
                  {" "}
                  Choose Wallet{connected}as
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
                      onClick={() => {}}
                    >
                      Connect Solana
                    </WalletMultiButton>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
            {/* )} */}
          </div>
        </div>
      </header>
      <section className="space-y-6 py-6 sm:py-12 lg:py-12">
        <div className="container flex max-w-5xl  mt-[100px] flex-col items-center gap-5 text-center">
          <h1 className="text-balance font-heading text-4xl sm:text-5xl md:text-6xl lg:text-[66px]">
            <div className="inline-flex relative font-extrabold font-display">
              <EthIcon className="w-[75px] absolute left-0 top-0 transform -translate-y-1/2 -translate-x-1/2 text-sm font-normal" />
              <span className="absolute right-0 top-0 transform -translate-y-1/2 text-sm font-normal">
                {chainName}
              </span>
              SEND
            </div>
          </h1>

          <p className="max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            distribute ether or tokens to multiple addresses
          </p>
        </div>
      </section>
      <section className="space-y-6 py-2 sm:py-5 lg:py-5">
        <div className="container max-w-xl">
          <Form {...form}>
            <form onSubmit={formSubmit} className="space-y-6">
              {/* TODO: use FormField here */}
              <div className="flex gap-4 items-start">
                <Tabs
                  className=""
                  defaultValue="native"
                  onValueChange={(value) => form.setValue("type", value)}
                >
                  <TabsList>
                    <TabsTrigger value="native">Native</TabsTrigger>
                    <TabsTrigger value="erc20">ERC20</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {type === "erc20" && (
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel htmlFor="token">Token address</FormLabel>
                      {/* <FormItem className="w-full flex items-center gap-2 space-y-0"> */}
                      {/* <span className="text-sm text-muted-foreground">Token</span> */}
                      <FormControl>
                        <Input
                          id="token"
                          autoComplete="off"
                          placeholder="0x..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        <i
                          className="cursor-pointer hover:text-primary"
                          onClick={() =>
                            form.setValue("token", tokens?.USDC?.address!)
                          }
                        >
                          USDC: {shortenAddress(tokens?.USDC?.address!)}
                        </i>
                        ,{" "}
                        <i
                          className="cursor-pointer hover:text-primary"
                          onClick={() =>
                            form.setValue("token", tokens?.USDT?.address!)
                          }
                        >
                          USDT: {shortenAddress(tokens?.USDT?.address!)}
                        </i>{" "}
                        <i className="text-xs text-muted-foreground opacity-70">
                          (click to select)
                        </i>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="text-sm leading-none">
                {type === "native" &&
                  (balance?.value ? (
                    <span>
                      <span className="font-medium">Balance</span>:{" "}
                      {connected
                        ? solBalance
                        : balance?.value
                        ? formatBalance(balance?.value, decimals)
                        : "0"}{" "}
                      {balance?.symbol}
                    </span>
                  ) : null)}
                {type === "erc20" && (
                  <div className="flex flex-col gap-2">
                    <span className="whitespace-nowrap">
                      <span className="font-medium">Balance</span>:{" "}
                      {connected
                        ? solBalance
                        : balance?.value
                        ? formatBalance(balance?.value, decimals)
                        : "0"}{" "}
                      {connected
                        ? "sol"
                        : balance?.symbol
                        ? " " + balance?.symbol
                        : ""}
                    </span>
                    <span className="whitespace-nowrap flex gap-2 items-center">
                      <span className="font-medium">Allowance</span>:{" "}
                      {formattedAllowance} {balance?.symbol}{" "}
                      {allowance && allowance < total ? (
                        <span className="text-xs text-muted-foreground opacity-70">
                          (not enough)
                        </span>
                      ) : null}
                      {allowance && allowance > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs p-0 h-min px-2"
                          onClick={() => approveAllowanceAsync(0n)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs p-0 h-min px-2"
                        type="button"
                        onClick={() => refetchAllowance()}
                      >
                        Refresh
                      </Button>
                      {isApprovePending || isAllowanceLoading ? (
                        <span className="text-[13px] text-muted-foreground">
                          ...
                        </span>
                      ) : null}
                    </span>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipients</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`0x123... 1.0\n0x456..., 2.0\n0x789...=3.0`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isConnected && type === "erc20" && (
                <>
                  {canDisperse || connected ? (
                    <div className="flex gap-2 items-center">
                      <Button
                        type="submit"
                        onClick={() => {
                          console.log("disperseTokenAsync", chainName);
                          connected
                            ? sendSplToken(
                                orignalWallet!,
                                sendTransaction,
                                form
                              )
                            : disperseTokenAsync();
                        }}
                        disabled={false}
                        //   // isApprovePending ||
                        //   // isAllowanceLoading ||
                        //   // !token ||
                        //   // allowance === undefined || !connected
                        // }
                      >
                        Disperse
                      </Button>
                      <span className="text-[13px] text-muted-foreground">
                        Total: {formattedTotal} {balance?.symbol}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Button type="submit" disabled>
                        Disperse
                      </Button>
                      <span className="text-[13px] text-muted-foreground">
                        Total: {formattedTotal} {balance?.symbol}
                      </span>
                      <Button
                        type="button"
                        onClick={() => approveAllowanceAsync(total)}
                        disabled={
                          isApprovePending ||
                          isAllowanceLoading ||
                          !token ||
                          allowance === undefined
                        }
                      >
                        Approve
                      </Button>
                      {
                        <span className="text-[13px] text-muted-foreground">
                          To spend {formatUnits(total, decimals)}{" "}
                          {balance?.symbol}
                        </span>
                      }
                    </div>
                  )}
                </>
              )}
              {isConnected && type === "native" && (
                <div className="flex gap-2 items-center">
                  <Button
                    type="submit"
                    onClick={() => {  
                      // disperseEtherAsync()
                      sendLamports(orignalWallet!, sendTransaction, form);
                    }}
                  >
                    Disperse
                  </Button>
                  <span className="text-[13px] text-muted-foreground">
                    Total: {formattedTotal}{" "}
                    {connected ? "sol" : balance?.symbol}
                  </span>
                </div>
              )}
              {!isConnected && (
                <div className="flex gap-2 items-center">
                  <Button type="submit" onClick={() => open()}>
                    Connect Wallet
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </section>
      <section className="space-y-6 py-2 sm:py-5 lg:py-5 hidden">
        <div className="container max-w-xl">
          <h2 className="text-2xl font-bold">History</h2>
          <ul className="list-disc pl-5">
            <li>Disperse 10 ETH at 01/25 to 5 addresses</li>
            <li>Disperse 200 USDC at 02/15 to 3 addresses</li>
            <li>Disperse 1.5 BTC at 03/05 to 2 addresses</li>
          </ul>
        </div>
      </section>
    </>
  );
}
