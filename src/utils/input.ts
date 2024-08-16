import { z } from "zod";

export const formSchema = z.object({
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

export const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
