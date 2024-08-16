import disperseAbi from "@/web3/disperse-abi";
import { toast } from "sonner";
import type { Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";

interface UseDisperseProps {
  address?: Address;
  token: Address;
  recipients: Address[];
  values: bigint[];
  onDisperse?: (tx: string) => void;
}

export const useDisperse = ({
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
