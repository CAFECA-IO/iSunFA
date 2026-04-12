import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

// Info: (20260408 - Luphia) CLI Alias Support for `npm run service token mint <address> <amount>`
export class Token {
  async mint(toAddress: string, amount: string | number) {
    if (typeof toAddress !== "string" || !toAddress.startsWith("0x")) {
      throw new Error(`Invalid address for token mint: ${toAddress}`);
    }
    return mintToAddress(CONTRACT_ADDRESSES.CREDIT_POINT, toAddress, Number(amount));
  }
}
