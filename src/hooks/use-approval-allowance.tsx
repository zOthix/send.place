// Allowance

import React from "react";
import { toast } from "sonner";
import { erc20Abi, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

export const MAX_ALLOWANCE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

interface useApproveAllowanceProps {
  accountAddress?: Address;
  spenderAddress?: Address;
  sellTokenAddress: Address;
}

// https://0x.org/docs/0x-swap-api/advanced-topics/how-to-set-your-token-allowances
export const useApproveAllowance = ({
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
    return () => clearInterval(timer as any);
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
