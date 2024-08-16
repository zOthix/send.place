import React, { useEffect } from "react";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { siteConfig } from "@/config/site";
import { formatBalance } from "./format-balance";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import useSolanaBalance from "@/hooks/use-solana-balance";
import { sendLamports, sendSplToken } from "@/utils/solana";
import ChooseWallet from "@/components/chooseWallet";
import { useApproveAllowance } from "@/hooks/use-approval-allowance";
import { useDisperse } from "@/hooks/use-disperse";
import { formSchema, parseInput, shortenAddress } from "@/utils/input";
import useSplTokenBalance from "@/hooks/use-spl-token-balance";
import type { PublicKey } from "@solana/web3.js";
import { connection } from "@/utils/solana/utils";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function App() {
  const account = useAccount();
  const orignalWallet = useAnchorWallet();
  const { sendTransaction, publicKey, connecting, connected, signMessage } =
    useWallet();
  const { open } = useWeb3Modal();
  const address = account.address ? shortenAddress(account.address) : "";
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
    error: balanceError,
    refetch: refechBalance,
  } = useBalance({
    address: account.address,
    token: type === "erc20" && token ? (token as Address) : undefined,
  });

  const { refreshSPLTokenBalance, splBalance } = useSplTokenBalance();

  const solBalance = useSolanaBalance();

  React.useEffect(() => {
    const timer = setInterval(() => {
      if (!connected) {
        refechBalance();
      }
    }, 1000);
    return () => clearInterval(timer as any);
  }, []);
  React.useEffect(() => {
    if (address && balanceError?.message && !connected) {
      toast.error(
        "Error getting balance for: " +
          shortenAddress((balanceError as any)?.contractAddress)
      );
    }
  }, [balanceError]);

  const decimals = balance?.decimals ?? 18;

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

  const { disperseTokenAsync, disperseEtherAsync } = useDisperse({
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <a href="/" className="items-center space-x-2 flex">
            <EthIcon className="w-[32px] text-sm font-normal" />
            <span className="font-bold sm:inline-block">{siteConfig.name}</span>
          </a>
          <div className="flex items-center space-x-4">
            {/* {connected || connecting ? ( */}
              <WalletMultiButton
                style={{
                  background: "#1e1e1e",
                  borderRadius: "9999px",
                  padding: "1rem",
                  height: "2.5rem",
                }}
              />
            {/* // ) : account.status === "connected" ? ( */}
              <w3m-connect-button />
            {/* // ) : ( */}
              <ChooseWallet />
            {/* // )} */}
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
                    {connected ? (
                      <span className="whitespace-nowrap flex gap-2 items-center">
                        <span className="font-medium">SPL Token Balance: </span>
                        {splBalance(form.getValues("token"))}
                        {splBalance(form.getValues("token")) &&
                        splBalance(form.getValues("token")) < total ? (
                          <span className="text-xs text-muted-foreground opacity-70">
                            (not enough)
                          </span>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs p-0 h-min px-2"
                          type="button"
                          onClick={() => refreshSPLTokenBalance()}
                        >
                          Refresh
                        </Button>
                      </span>
                    ) : (
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
                    )}
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
                                form,
                                signMessage
                              )
                            : disperseTokenAsync();
                        }}
                        disabled={
                          // (isApprovePending ||
                          //   isAllowanceLoading ||
                          //   !token ||
                          //   allowance === undefined) &&
                          // (!connected ||
                          //   total === 0n ||
                          //   splBalance(token) < total)
                          false
                        }
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
                      connected
                        ? sendLamports(
                            orignalWallet!,
                            sendTransaction,
                            form,
                            signMessage
                          )
                        : disperseEtherAsync();
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
