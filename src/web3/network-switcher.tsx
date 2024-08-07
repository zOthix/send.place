import { useAccount, useChains, useSwitchChain } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { chains } from "./config";
import { cn } from "@/lib/utils";


export function NetworkSwitcher({ className }: { className?: string }) {
  const account = useAccount();
  const chs = useChains();
  const { switchChainAsync } = useSwitchChain();
  let chain = chains.find((chain) => chain.id === account.chain?.id);
  if (!chain) chain = chains[0];

  const CurrentIcon = chain.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(className, "inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground rounded-full h-10 w-10")}>
        <CurrentIcon
          className="h-4 w-4"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {chains.map((chain) => {
          const Icon = chain.icon;
          const selectChain = () => {
            console.log('SC', chain.id);
            console.log('SC', chs);
            switchChainAsync?.({ chainId: chain.id }).catch((error) => {
              console.error('SC', error);
            });
          }

          return (
            <DropdownMenuItem key={chain.id} onClick={selectChain} className="cursor-pointer py-2 px-3 gap-2 rounded-md">
              <span className="flex items-center bg-neutral-800 p-1 rounded-full">
                <Icon className="h-3 w-3" />
              </span>
              <span className="mr-10">{chain.name}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
