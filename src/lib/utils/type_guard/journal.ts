import { IJournal } from "@/interfaces/journal";
import { isIVoucher } from "@/lib/utils/type_guard/voucher";

export function isIJournal(arg: IJournal): arg is IJournal {
  if (arg.id === undefined || arg.tokenContract === undefined || arg.tokenId === undefined) {
    return false;
  }
  const { id, tokenContract, tokenId, ...rest } = arg;
  return (
    isIVoucher(rest) &&
    typeof id === 'string' &&
    typeof tokenContract === 'string' &&
    typeof tokenId === 'string'
  );
}
