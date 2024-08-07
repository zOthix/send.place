import { http, createConfig } from "wagmi";
import { defineChain, type Address, extractChain, type HttpTransport } from "viem";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { createWeb3Modal as w3mCreateWeb3Modal } from "@web3modal/wagmi/react";
import { injected, walletConnect } from "wagmi/connectors";
import * as ChainIcons from "@thirdweb-dev/chain-icons";
import EthIcon from "@/assets/icons/eth.svg?react";
import polygonIcon from "@/assets/icons/polygon.svg";
import baseIcon from "@/assets/icons/base.webp";
import bscIcon from "@/assets/icons/binance.svg"
import lumiIconPath from "@/assets/icons/lumi.svg";
import disperseAbi from "./disperse-abi";

export const walletConnectProjectId = "86283b367887dea6e0e54f10e387b246";

export const SUPER_LUMIO_CHAIN_ID = 8866;

export const chains = [
 
  // Binance Smart Chain
  defineChain({
    icon: bscIcon,
    id: 56,
    name: "bsc",
    nativeCurrency: {
      decimals: 18,
      name: "bsc",
      symbol: "BNB",
    },
    rpcUrls: {
      default: {
        http: ["https://bsc.meowrpc.com"],
        webSocket: ["wss://bsc-rpc.publicnode.com"],
      },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "https://bscscan.com/" },
    },
    options: {
      editable: true,
      deletable: false,
      simulationIsAllowed: true,
    },
    contracts: {
      disperse: {
        address: "0x61798d20b16302c0CB659794b70b97c886c59610" as Address, 
        abi: disperseAbi,
      },
    },
    tokens: {
      USDT: {
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
      },
      USDC: {
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        decimals: 18,
      },
    },
  }),

  // POLYGON MAINNET
  defineChain({
    icon: polygonIcon,
    id: 137,
    name: "polygon",
    nativeCurrency: {
      decimals: 18,
      name: "polygon",
      symbol: "MATIC",
    },
    rpcUrls: {
      default: {
        http: ["https://polygon-rpc.com"],
        webSocket: ["wss://polygon-bor-rpc.publicnode.com	"],
      },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "https://polygonscan.com/" },
    },
    options: {
      editable: true,
      deletable: false,
      simulationIsAllowed: true,
    },
    contracts: {
      disperse: {
        address: "0x61798d20b16302c0CB659794b70b97c886c59610" as Address, 
        abi: disperseAbi,
      },
    },
    tokens: {
      USDT: {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
      },
      USDC: {
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
      },
    },
  }),

  // BASE MAINNET
  defineChain({
    icon: baseIcon,
    id: 8453,
    name: "Base",
    nativeCurrency: {
      decimals: 18,
      name: "Base",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: ["https://mainnet.base.org"],
        webSocket: ["wss://base-rpc.publicnode.com"],
      },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "https://basescan.org/" },
    },
    options: {
      editable: true,
      deletable: false,
      simulationIsAllowed: true,
    },
    contracts: {
      disperse: {
        address: "0x61798d20b16302c0CB659794b70b97c886c59610" as Address, 
        abi: disperseAbi,
      },
    },
    tokens: {
      USDT: {
        address: "0xF9E36ba92f4f5E60FC0A19CCD201c285d8CCe62D", // TODO: MAYBE NOT CORRECT
        decimals: 18,
      },
      USDC: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
      },
    },
  }),
] as const;

export type Chain = typeof chains[number];
export type ChainIds = Chain["id"];

const transports = Object.fromEntries(
  chains.map((chain) => [
    chain.id,
    http(),
  ]),
) as Record<ChainIds, HttpTransport>;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    // coinbaseWallet({ appName: "Create Wagmi" }),
    walletConnect({ projectId: walletConnectProjectId }),
  ],
  transports,
});

export const createWeb3Modal = () => w3mCreateWeb3Modal({
  wagmiConfig, 
  projectId: walletConnectProjectId,
  allowUnsupportedChain: true,
  chainImages: {
    8866: lumiIconPath.src,
  },
  themeVariables: {
    '--w3m-accent': '#03abff' // mix of #F03F77 and #8D29C1
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
