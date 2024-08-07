import { formatUnits } from "viem";

export function formatBalance(balance: bigint, decimals = 18, maxSignificantDigits = 6) {
  const formattedBalance = formatUnits(balance, decimals);
  
  const parts = formattedBalance.split(".");
  const integerPart = parts[0];
  const fractionalPart = parts[1] ? `${parts[1].substring(0, maxSignificantDigits)}` : '0';
  const balanceNumber = Number(integerPart);

  const result = `${integerPart}${fractionalPart ? "." + fractionalPart : ""}`;

  return balanceNumber < 0 ? `-${result}` : result;
}
